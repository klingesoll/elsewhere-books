import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev proxy constants — production uses api/_shared.js
const LUMA_CALENDAR_ID = process.env.LUMA_CALENDAR_ID || 'cal-Pfe5LYovZU7jltR'
const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/AUD'
const TRACKED_CURRENCIES = ['CNY', 'JPY', 'SGD', 'MYR', 'HKD', 'TWD', 'USD', 'EUR', 'GBP', 'THB', 'KRW']

function lumaDevProxy() {
  return {
    name: 'luma-events-dev',
    configureServer(server) {
      server.middlewares.use('/api/events', async (req, res) => {
        try {
          const url = new URL(req.url, 'http://localhost')
          const period = url.searchParams.get('period') || 'past'
          const limit = Math.min(parseInt(url.searchParams.get('limit')) || 50, 100)
          const lumaUrl = `https://api.lu.ma/calendar/get-items?calendar_api_id=${LUMA_CALENDAR_ID}&period=${encodeURIComponent(period)}&limit=${limit}`
          const resp = await fetch(lumaUrl)
          const data = await resp.json()
          const events = (data.entries || []).map(entry => ({
            name: entry.event?.name || '',
            start: entry.event?.start_at || '',
            end: entry.event?.end_at || '',
            url: entry.event?.url ? `https://luma.com/${entry.event.url}` : '',
            cover: entry.event?.cover_url || '',
            location: entry.event?.geo_address_info?.address || '',
            isFree: entry.ticket_info?.is_free ?? true,
          }))
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, events }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

function exchangeRateDevProxy() {
  return {
    name: 'exchange-rate-dev',
    configureServer(server) {
      server.middlewares.use('/api/exchange-rates', async (_req, res) => {
        try {
          const resp = await fetch(EXCHANGE_RATE_API)
          const data = await resp.json()
          if (data.result !== 'success') throw new Error('Upstream error')
          const rates = { AUD: 1 }
          for (const c of TRACKED_CURRENCIES) { if (data.rates[c]) rates[c] = data.rates[c] }
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: true, base: 'AUD', rates, updated: data.time_last_update_utc }))
        } catch (err) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ok: false, error: err.message }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [lumaDevProxy(), exchangeRateDevProxy(), react()],
})
