import { useState, useEffect } from 'react'
import { CATEGORIES, LUMA_PROFILE_URL } from '../constants/site'

function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', timeZone: 'Australia/Melbourne' })
}

function formatTime(iso) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Melbourne' })
}

function extractFilms(events) {
  const films = []
  const seen = new Set()
  for (const ev of events) {
    const matches = ev.name.match(/《([^》]+)》/g)
    if (matches) {
      for (const m of matches) {
        const title = m.replace(/[《》]/g, '')
        if (!seen.has(title)) {
          seen.add(title)
          films.push({ title, url: ev.url })
        }
      }
    }
  }
  return films
}

export default function Sidebar() {
  const [events, setEvents] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/events?period=past&limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.ok) setEvents(data.events)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [])

  const films = extractFilms(events)

  return (
    <aside className="cell index-sidebar p-sm">
      <div style={{ marginBottom: '2rem' }}>
        <span className="label">Categories</span>
        <ul className="dense-list">
          {CATEGORIES.map(c => (
            <li key={c}><a href="#">{c}</a></li>
          ))}
        </ul>
      </div>

      {films.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <span className="label">Screenings</span>
          <ul className="dense-list">
            {films.map(f => (
              <li key={f.title}>
                <a href={f.url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: 'var(--font-literary)', fontSize: '0.82rem' }}>
                    {f.title}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                    opacity: 0.4, flexShrink: 0, marginLeft: '0.5rem',
                  }}>→</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div id="events" style={{ flexGrow: 1, borderTop: '1px solid var(--line-color)', paddingTop: '0.5rem', marginTop: 'auto' }}>
        <span className="label">Events</span>
        {!loaded && (
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#999', padding: '0.25rem 0' }}>LOADING…</p>
        )}
        {loaded && events.length === 0 && (
          <p style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#999', padding: '0.25rem 0' }}>NO EVENTS</p>
        )}
        <ul className="dense-list">
          {events.map((ev, i) => (
            <li key={i}>
              <a
                href={ev.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', padding: '0.35rem 0' }}
              >
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-literary)',
                  fontSize: '0.82rem',
                  lineHeight: 1.4,
                  fontWeight: 600,
                }}>{ev.name}</span>
                <span style={{
                  display: 'block',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  letterSpacing: '0.03em',
                  marginTop: '0.15rem',
                  opacity: 0.6,
                }}>
                  {formatDate(ev.start).toUpperCase()} · {formatTime(ev.start)}
                  {ev.isFree ? '' : '  ·  A$'}
                </span>
              </a>
            </li>
          ))}
        </ul>
        {events.length > 0 && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
            <a
              href={LUMA_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '0.7rem',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              All events on Luma →
            </a>
          </div>
        )}
      </div>
    </aside>
  )
}
