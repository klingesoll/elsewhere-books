import { createClient } from '@supabase/supabase-js'
import { verifyAdmin, getSupabaseConfig, setCorsHeaders } from './_shared.js'

export default async function handler(req, res) {
  setCorsHeaders(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

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
    const book = req.body
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('books')
      .insert([{
        title_cn:   book.titleCn   || null,
        title_en:   book.titleEn   || null,
        author:     book.author    || null,
        publisher:  book.publisher || null,
        year:       book.year      || null,
        isbn:       book.isbn      || null,
        category:   book.category  || null,
        price:      book.price ? parseFloat(book.price) : null,
        excerpt:    book.excerpt   || null,
        sku:        book.sku       || null,
        cover_url:  book.coverUrl  || null,
        status:     'active',
      }])
      .select()
      .single()

    if (error) return res.status(400).json({ error: error.message })
    return res.json({ ok: true, book: data })

  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
