/**
 * Elsewhere Books — API shared utilities
 *
 * Constants and helpers shared across Vercel serverless functions.
 * No hardcoded secrets — all sensitive values come from env vars.
 */

// ── Gemini AI ──
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export function geminiUrl(apiKey) {
  return `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`
}

export function getGeminiKey() {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY not configured')
  return key
}

// ── Luma calendar ──
export function getLumaCalendarId() {
  return process.env.LUMA_CALENDAR_ID || 'cal-Pfe5LYovZU7jltR'
}

// ── Admin auth ──
export function verifyAdmin(req) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) return true // no secret configured = open (dev mode)
  return req.headers['x-admin-token'] === secret
}

// ── Supabase ──
export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY not configured')
  return { url, key }
}

// ── CORS headers ──
export function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token')
}

// ── Exchange rates ──
export const EXCHANGE_RATE_API = 'https://open.er-api.com/v6/latest/AUD'
export const TRACKED_CURRENCIES = ['CNY', 'JPY', 'SGD', 'MYR', 'HKD', 'TWD', 'USD', 'EUR', 'GBP', 'THB', 'KRW']

// ── Inventory helpers ──

/**
 * Link one in-stock book to a sale (precise barcode match).
 * Sets sold_in_sale_id on the matched books row.
 * Returns the matched book id, or null if no match found.
 */
export async function deductBook(supabase, saleId, { barcode, title, isbn }) {
  // Primary: barcode exact match
  const code = barcode || isbn
  if (code) {
    const { data } = await supabase
      .from('books')
      .update({ sold_in_sale_id: saleId })
      .eq('barcode', code)
      .is('sold_in_sale_id', null)
      .limit(1)
      .select('id')
    if (data?.length) return data[0].id
  }

  // Fallback: title match (for legacy data without barcode)
  if (title) {
    // Escape PostgREST special characters in title to prevent injection
    const safe = title.replace(/[%_\\]/g, c => '\\' + c)
    const { data } = await supabase
      .from('books')
      .update({ sold_in_sale_id: saleId })
      .is('sold_in_sale_id', null)
      .or(`title_cn.ilike.%${safe}%,title_en.ilike.%${safe}%`)
      .limit(1)
      .select('id')
    if (data?.length) return data[0].id
  }

  return null
}

/**
 * Restore all books linked to a sale (used when voiding).
 * One query — no looping needed.
 */
export async function restoreBooks(supabase, saleId) {
  const { data } = await supabase
    .from('books')
    .update({ sold_in_sale_id: null })
    .eq('sold_in_sale_id', saleId)
    .select('id')
  return data?.length || 0
}
