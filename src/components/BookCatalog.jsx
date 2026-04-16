import { useEffect, useState } from 'react'
import BookCover from './BookCover'
import supabase from '../lib/supabase'
import { QUOTES, READING_LISTS, STATIC_BOOKS } from '../constants/site'

function dbBookToProps(b) {
  return {
    sku: b.sku, price: b.price ? `¥${b.price}` : '',
    titleCn: b.title_cn || b.title_en, author: b.author,
    excerpt: b.excerpt || '—',
  }
}

/** Deduplicate DB rows — multiple copies of the same book collapse into one entry */
function deduplicateBooks(dbRows) {
  const seen = new Map()
  for (const b of dbRows) {
    const key = b.barcode || b.title_cn || b.title_en || b.id
    if (!seen.has(key)) seen.set(key, b)
  }
  return [...seen.values()].map(dbBookToProps)
}

export default function BookCatalog() {
  const [dbBooks, setDbBooks] = useState(null)
  const [useDb, setUseDb] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!import.meta.env.VITE_SUPABASE_URL || !supabase) { setDbBooks([]); return }
    supabase
      .from('books').select('*').is('sold_in_sale_id', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data?.length > 0) { setDbBooks(data); setUseDb(true) }
        else setDbBooks([])
      })
  }, [])

  const books = useDb ? deduplicateBooks(dbBooks) : STATIC_BOOKS

  const marqueeText = QUOTES.map(q => `${q.text} —— ${q.from}`).join('　　　　')

  return (
    <main className="main-catalog">
      <div className="catalog-header-row">
        <span className="label">Featured / 精選書目</span>
        <span className="catalog-hint">HOVER TO BROWSE</span>
      </div>
      <div className="accordion">
        {books.map((book, i) => {
          const isActive = i === active
          return (
            <div
              key={book.sku || `book-${i}`}
              className={`accordion-item ${isActive ? 'accordion-item--active' : ''}`}
              onClick={() => setActive(i)}
            >
              <div className="spine" onMouseEnter={() => setActive(i)}>
                <span className="spine-index">{String(i + 1).padStart(2, '0')}</span>
                <span className="spine-title">{book.titleCn}</span>
                <span className="spine-author">{book.author}</span>
              </div>
              <div className="accordion-panel">
                <div className="panel-cover">
                  <BookCover sku={`SKU: ${book.sku}`} titleCn={book.titleCn} author={book.author} />
                </div>
                <div className="panel-text">
                  <p className="panel-excerpt">{book.excerpt}</p>
                  <span className="panel-info">SKU: {book.sku} · {book.price}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quote marquee */}
      <div className="marquee-strip">
        <div className="marquee-track">
          <span>{marqueeText}</span>
          <span>{marqueeText}</span>
        </div>
      </div>

      {/* Themed reading lists */}
      <div className="reading-lists-header">
        <span className="label">Reading Lists / 主題書單</span>
      </div>
      <div className="reading-lists">
        {READING_LISTS.map(list => (
          <div className="reading-list-card" key={list.id} style={{ '--card-accent': list.color }}>
            <div className="rl-head">
              <span className="rl-title-en">{list.titleEn}</span>
              <h3 className="rl-title">{list.title}</h3>
              <p className="rl-desc">{list.description}</p>
            </div>
            <ol className="rl-books">
              {list.books.map((b, j) => (
                <li key={j}>
                  <span className="rl-book-num">{String(j + 1).padStart(2, '0')}</span>
                  <span className="rl-book-name">{b}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </main>
  )
}
