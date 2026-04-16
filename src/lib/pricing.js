/**
 * Elsewhere Books — Pricing Engine
 *
 * New book formula:
 *   cost = originalPrice × SHIPPING_MARKUP
 *   costAUD = cost / currencyRate          (rate = units per 1 AUD)
 *   standardPrice = round-up to nearest $1
 *   memberPrice   = standardPrice × MEMBER_DISCOUNT
 *
 * Recommended (⭐) book:
 *   memberPrice   = costAUD × RECOMMENDED_DISCOUNT
 *   standardPrice = costAUD
 *
 * Second-hand: fixed $5 or $10
 * Book-corner (書阁): fixed price entered directly in AUD
 */

// Pricing multipliers
const SHIPPING_MARKUP = 1.15        // 15% shipping cost on original price
const MEMBER_DISCOUNT = 0.9         // 10% off for members
const RECOMMENDED_DISCOUNT = 0.85   // 15% off for ⭐ recommended books

// Default rates (units per 1 AUD) — updated via /api/exchange-rates
const DEFAULT_RATES = {
  AUD: 1,
  CNY: 4.7,
  JPY: 100,
  SGD: 0.88,
  MYR: 3.0,
  HKD: 5.2,
  TWD: 21.0,
  USD: 0.65,
  EUR: 0.60,
  GBP: 0.52,
  THB: 23.0,
  KRW: 880,
}

export const CURRENCIES = Object.keys(DEFAULT_RATES)

export const BOOK_TYPES = [
  { key: 'new', label: '📕 新书', labelEn: 'New' },
  { key: 'used', label: '♻️ 二手', labelEn: 'Used' },
  { key: 'corner', label: '🏛️ 书阁', labelEn: 'Corner' },
]

/**
 * Calculate AUD prices for a book.
 * @param {object} opts
 * @param {'new'|'used'|'corner'} opts.type
 * @param {number} opts.originalPrice - price in original currency
 * @param {string} opts.currency - ISO currency code
 * @param {boolean} opts.recommended - ⭐ recommended flag
 * @param {object} opts.rates - exchange rates (units per 1 AUD)
 * @returns {{ standardPrice: number, memberPrice: number, costAUD: number }}
 */
export function calculatePrice({ type, originalPrice, currency = 'CNY', recommended = false, rates = DEFAULT_RATES }) {
  if (type === 'used') {
    const p = originalPrice || 5
    return { standardPrice: p, memberPrice: p, costAUD: p }
  }

  if (type === 'corner') {
    const p = originalPrice || 0
    return { standardPrice: p, memberPrice: p, costAUD: p }
  }

  // New book
  const rate = rates[currency] || DEFAULT_RATES[currency] || 1
  const cost = originalPrice * SHIPPING_MARKUP
  const costAUD = cost / rate

  if (recommended) {
    const memberPrice = Math.ceil(costAUD * RECOMMENDED_DISCOUNT)
    const standardPrice = Math.ceil(costAUD)
    return { standardPrice, memberPrice, costAUD: Math.round(costAUD * 100) / 100 }
  }

  const standardPrice = Math.ceil(costAUD)
  const memberPrice = Math.ceil(standardPrice * MEMBER_DISCOUNT)
  return { standardPrice, memberPrice, costAUD: Math.round(costAUD * 100) / 100 }
}

export { DEFAULT_RATES }
