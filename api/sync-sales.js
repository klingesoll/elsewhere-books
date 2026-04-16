import { createClient } from '@supabase/supabase-js'
import { verifyAdmin, getSupabaseConfig, deductBook } from './_shared.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  if (!verifyAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  let supabaseUrl, supabaseKey
  try {
    ({ url: supabaseUrl, key: supabaseKey } = getSupabaseConfig())
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }

  try {
    const { sales } = req.body
    if (!Array.isArray(sales) || sales.length === 0) {
      return res.status(400).json({ error: 'Missing or empty sales array' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check which sale IDs already exist to avoid duplicates
    const ids = sales.map(s => s.id)
    const { data: existing } = await supabase
      .from('sales')
      .select('source_id')
      .in('source_id', ids)

    const existingIds = new Set((existing || []).map(r => r.source_id))

    // Filter to only new sales
    const newSales = sales.filter(s => !existingIds.has(s.id))

    if (newSales.length === 0) {
      return res.json({ ok: true, inserted: 0, skipped: sales.length, message: 'All records already synced' })
    }

    // Transform to DB rows
    const rows = newSales.map(sale => ({
      source_id: sale.id,
      timestamp: sale.timestamp,
      items: JSON.stringify(sale.books),
      purchase_type: sale.sale_type,
      manager: sale.books[0]?.manager || null,
      total_aud: sale.actual_revenue,
      total_member: sale.total_member_price,
      total_standard: sale.total_standard_price,
      item_count: sale.books.length,
      source: 'desktop_app',
    }))

    const { data: insertedRows, error } = await supabase.from('sales').insert(rows).select('id, source_id')

    if (error) {
      console.error('[sync-sales] DB error:', error.message)
      return res.status(500).json({ ok: false, error: error.message })
    }

    // Build source_id → sale.id map for linking books
    const saleIdMap = new Map((insertedRows || []).map(r => [r.source_id, r.id]))

    // Link sold books to their sales by barcode
    let deducted = 0
    for (const sale of newSales) {
      const dbSaleId = saleIdMap.get(sale.id)
      if (!dbSaleId) continue
      for (const book of (sale.books || [])) {
        const bookId = await deductBook(supabase, dbSaleId, { barcode: book.barcode, title: book.title, isbn: book.isbn })
        if (bookId) deducted++
      }
    }
    console.log(`[sync-sales] ${newSales.length} sales, ${deducted} books linked`)

    return res.json({
      ok: true,
      inserted: newSales.length,
      skipped: sales.length - newSales.length,
      deducted,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
