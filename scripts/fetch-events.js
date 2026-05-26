import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../public/events.json');
const LUMA_API = 'https://api.lu.ma/calendar/get-items';
const CAL_ID = 'cal-Pfe5LYovZU7jltR';
const TZ = 'Australia/Melbourne';

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', timeZone: TZ }).toUpperCase();
}

function fmtTime(start, end) {
  const t = (iso) => new Date(iso).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ });
  return end ? `${t(start)}–${t(end)}` : t(start);
}

function guessType(name = '') {
  const s = name.toLowerCase();
  if (s.includes('放映') || s.includes('screening') || s.includes('film')) return 'FILM SCREENING';
  if (s.includes('读书') || s.includes('讀書') || s.includes('reading')) return 'READING GROUP';
  if (s.includes('对话') || s.includes('對話') || s.includes('talk') || s.includes('conversation')) return 'CONVERSATION';
  if (s.includes('展') || s.includes('fair') || s.includes('table')) return 'SMALL PRESS';
  return 'EVENT';
}

function mapEntry(entry, index, prefix) {
  const ev = entry.event;
  return {
    id: `${prefix}-${String(index + 1).padStart(3, '0')}`,
    title: ev.name ?? '',
    type: guessType(ev.name),
    date: fmtDate(ev.start_at),
    time: fmtTime(ev.start_at, ev.end_at),
    url: ev.url ? `https://lu.ma/${ev.url}` : '',
    cover: ev.cover_url ?? '',
    location: ev.geo_address_info?.short_address ?? '',
    isFree: entry.ticket_info?.is_free ?? true,
    startIso: ev.start_at,
  };
}

async function fetchPeriod(period) {
  const url = `${LUMA_API}?calendar_api_id=${CAL_ID}&period=${period}&limit=100`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Luma ${period}: ${res.status}`);
  const data = await res.json();
  return data.entries ?? [];
}

async function main() {
  console.log('Fetching Luma events…');

  let pastEntries, upcomingEntries;
  try {
    [pastEntries, upcomingEntries] = await Promise.all([
      fetchPeriod('past'),
      fetchPeriod('future'),
    ]);
  } catch (err) {
    console.warn(`Fetch failed: ${err.message}`);
    if (fs.existsSync(OUT)) {
      console.log('Keeping cached events.json');
    } else {
      fs.writeFileSync(OUT, JSON.stringify({ upcoming: [], past: [], fetchedAt: null }, null, 2));
    }
    return;
  }

  // past: newest first; upcoming: soonest first (already ordered by Luma)
  const past = pastEntries
    .sort((a, b) => new Date(b.event.start_at) - new Date(a.event.start_at))
    .map((e, i) => mapEntry(e, i, 'A'));

  const upcoming = upcomingEntries.map((e, i) => mapEntry(e, i, 'P'));

  fs.writeFileSync(OUT, JSON.stringify({ upcoming, past, fetchedAt: new Date().toISOString() }, null, 2));
  console.log(`Done: ${upcoming.length} upcoming, ${past.length} past → public/events.json`);
}

main();
