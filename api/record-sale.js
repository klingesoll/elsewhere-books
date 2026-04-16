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
    const { items, purchaseType, manager } = req.body
    // items: [{ title, category, type, currency, originalPrice, standardPrice, memberPrice, recommended }]
    // purchaseType: 'member' | 'standard'
    // manager: string

    if (!items?.length || !purchaseType) {
      return res.status(400).json({ error: 'Missing items or purchaseType' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    const totalAUD = items.reduce((sum, it) => {
      return sum + (purchaseType === 'member' ? it.memberPrice : it.standardPrice)
    }, 0)

    const { data, error } = await supabase
      .from('sales')
      .insert([{
        items: JSON.stringify(items),
        purchase_type: purchaseType,
        manager: manager || null,
        total_aud: totalAUD,
        item_count: items.length,
      }])
      .select()
      .single()

    if (error) {
      console.error('[record-sale] DB error:', error.message)
      return res.json({ ok: true, saved: false, reason: error.message, total: totalAUD })
    }

    // Link sold books to this sale by barcode
    let deducted = 0
    for (const it of items) {
      const bookId = await deductBook(supabase, data.id, { barcode: it.barcode, title: it.title, isbn: it.isbn })
      if (bookId) deducted++
    }
    console.log(`[record-sale] ${items.length} items, ${deducted} linked to sale ${data.id}`)

    return res.json({ ok: true, saved: true, sale: data, total: totalAUD, deducted })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
