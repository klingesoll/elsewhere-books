export default async function handler(req, res) {
  const isbn = req.query.isbn?.replace(/[^0-9X]/gi, '')
  if (!isbn) return res.status(400).json({ error: 'ISBN required' })

  try {
    // Try Google Books first (has decent Chinese coverage)
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&langRestrict=zh`
    )
    const gbData = await gbRes.json()
    const vol = gbData.items?.[0]?.volumeInfo

    if (vol) {
      return res.json({ ok: true, book: {
        titleCn:   vol.title || '',
        titleEn:   '',
        author:    vol.authors?.join(', ') || '',
        publisher: vol.publisher || '',
        year:      vol.publishedDate?.slice(0, 4) || '',
        isbn,
        category:  vol.categories?.[0] || '',
        price:     '',
        excerpt:   vol.description?.slice(0, 100) || '',
        coverUrl:  vol.imageLinks?.thumbnail?.replace('http:', 'https:') || '',
      }})
    }

    // Fallback: Open Library
    const olRes = await fetch(
      `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`
    )
    const olData = await olRes.json()
    const entry = olData[`ISBN:${isbn}`]

    if (entry) {
      return res.json({ ok: true, book: {
        titleCn:   entry.title || '',
        titleEn:   '',
        author:    entry.authors?.map(a => a.name).join(', ') || '',
        publisher: entry.publishers?.map(p => p.name).join(', ') || '',
        year:      entry.publish_date?.slice(-4) || '',
        isbn,
        category:  '',
        price:     '',
        excerpt:   '',
        coverUrl:  entry.cover?.large || entry.cover?.medium || '',
      }})
    }

    // Nothing found — tell frontend to fall back to camera
    return res.status(404).json({ ok: false, error: 'Not found' })

  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
