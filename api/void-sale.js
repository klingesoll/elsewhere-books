import { createClient } from '@supabase/supabase-js'
import { verifyAdmin, getSupabaseConfig, restoreBooks } from './_shared.js'

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
    const { saleId, source, reason } = req.body

    if (!saleId) {
      return res.status(400).json({ error: 'Missing saleId' })
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determine the lookup field based on source
    // Desktop app syncs with source_id; web POS uses auto-generated id
    const isDesktop = source === 'desktop_app'
    const column = isDesktop ? 'source_id' : 'id'

    // Soft-delete: mark as voided (preserves audit trail)
    const { data, error } = await supabase
      .from('sales')
      .update({
        status: 'voided',
        voided_at: new Date().toISOString(),
        void_reason: reason || null,
      })
      .eq(column, saleId)
      .select()

    if (error) {
      console.error('[void-sale] DB error:', error.message)
      return res.status(500).json({ ok: false, error: error.message })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ ok: false, error: 'Sale not found' })
    }

    // Restore inventory: clear sold_in_sale_id for books linked to these sales
    let restored = 0
    for (const sale of data) {
      restored += await restoreBooks(supabase, sale.id)
    }

    console.log(`[void-sale] Voided sale ${saleId} (${column}), restored ${restored} books, reason: ${reason || 'none'}`)
    return res.json({ ok: true, voided: data.length, restored })

  } catch (err) {
    console.error('[void-sale] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
