import BookCard from './BookCard'

const books = [
  {
    imgSrc: 'https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg?auto=compress&cs=tinysrgb&w=600',
    excerpt: <>「真正的發現之旅非發現新景觀，而是有新的目光。」<br /><br />The real voyage of discovery consists not in seeking new landscapes, but in having new eyes.</>,
    sku: 'SKU: B-001',
    price: '¥128.00',
    titleCn: '追憶似水年華',
    author: 'Marcel Proust',
  },
  {
    imgSrc: 'https://images.pexels.com/photos/3747468/pexels-photo-3747468.jpeg?auto=compress&cs=tinysrgb&w=600',
    excerpt: <>「空間並非虛無，它是關係的總和。」<br /><br />Space is not a void; it is the sum of relationships.</>,
    sku: 'SKU: B-084',
    price: '¥95.00',
    titleCn: '空間詩學',
    author: 'Gaston Bachelard',
  },
  {
    imgSrc: 'https://images.pexels.com/photos/256450/pexels-photo-256450.jpeg?auto=compress&cs=tinysrgb&w=600',
    excerpt: <>「我們建造建築，然後建築塑造我們。」<br /><br />We shape our buildings; thereafter they shape us.</>,
    sku: 'SKU: B-211',
    price: '¥150.00',
    titleCn: '建築十書',
    author: 'Vitruvius',
  },
  {
    imgSrc: 'https://images.pexels.com/photos/415071/pexels-photo-415071.jpeg?auto=compress&cs=tinysrgb&w=600',
    excerpt: <>「文字是人類所創造最偉大的幾何學。」<br /><br />Letters are the greatest geometry created by humanity.</>,
    sku: 'SKU: B-105',
    price: '¥110.00',
    titleCn: '網格系統',
    author: 'Josef Müller-Brockmann',
  },
  {
    imgSrc: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=600',
    excerpt: <>「美存在於物體與物體產生的陰影之間。」<br /><br />Beauty lies in the shadow created between one object and another.</>,
    sku: 'SKU: B-072',
    price: '¥88.00',
    titleCn: '陰翳禮讚',
    author: "Jun'ichirō Tanizaki",
  },
]

export default function BookCatalog() {
  return (
    <main className="main-catalog">
      {books.map((book, i) => (
        <BookCard key={i} {...book} />
      ))}

      {/* Coming Soon card */}
      <article className="cell book-cell" style={{ backgroundColor: 'var(--highlight-purple)' }}>
        <div className="book-cover-wrapper">
          <div className="cross-lines" />
          <h3 className="title-cn" style={{ position: 'absolute', zIndex: 2, fontSize: '2rem', textAlign: 'center', lineHeight: 1.2 }}>
            即將<br />出版
          </h3>
        </div>
        <div className="book-meta p-sm" style={{ backgroundColor: 'transparent' }}>
          <span className="label">Status</span>
          <h3 className="title-cn">別處期刊 Vol.2</h3>
          <p className="author">Pre-order / 預購</p>
        </div>
      </article>
    </main>
  )
}
