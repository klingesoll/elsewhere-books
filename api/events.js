import { getLumaCalendarId, setCorsHeaders } from './_shared.js'

const LUMA_API = 'https://api.lu.ma/calendar/get-items'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const period = req.query.period || 'past'
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)

  try {
    const calendarId = getLumaCalendarId()
    const url = `${LUMA_API}?calendar_api_id=${calendarId}&period=${encodeURIComponent(period)}&limit=${limit}`
    const response = await fetch(url)

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Luma API error' })
    }

    const data = await response.json()

    const events = (data.entries || []).map(entry => ({
      name: entry.event?.name || '',
      start: entry.event?.start_at || '',
      end: entry.event?.end_at || '',
      url: entry.event?.url ? `https://luma.com/${entry.event.url}` : '',
      cover: entry.event?.cover_url || '',
      location: entry.event?.geo_address_info?.address || '',
      isFree: entry.ticket_info?.is_free ?? true,
    }))

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.json({ ok: true, events })
  } catch (err) {
    console.error('[events] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
