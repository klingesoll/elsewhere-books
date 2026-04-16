import { EXCHANGE_RATE_API, TRACKED_CURRENCIES } from './_shared.js'

export default async function handler(req, res) {
  try {
    const r = await fetch(EXCHANGE_RATE_API)
    const data = await r.json()

    if (data.result !== 'success') {
      return res.status(502).json({ ok: false, error: 'Upstream API error' })
    }

    const rates = { AUD: 1 }
    for (const c of TRACKED_CURRENCIES) {
      if (data.rates[c]) rates[c] = data.rates[c]
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200')
    return res.json({ ok: true, base: 'AUD', rates, updated: data.time_last_update_utc })
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message })
  }
}
