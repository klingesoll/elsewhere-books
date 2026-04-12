export default function BookCard({ imgSrc, excerpt, sku, price, titleCn, author, style }) {
  return (
    <article className="cell book-cell" style={style}>
      <div className="book-cover-wrapper">
        <img src={imgSrc} alt="Book Cover" className="book-cover" />
        <div className="book-details-hover">
          <span className="label" style={{ background: 'white', padding: '2px 5px', display: 'inline-block', width: 'max-content' }}>
            Excerpt
          </span>
          <p className="excerpt">{excerpt}</p>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', marginTop: '1rem' }}>
            {sku} / {price}
          </span>
        </div>
      </div>
      <div className="book-meta p-sm">
        <span className="label">Title</span>
        <h3 className="title-cn">{titleCn}</h3>
        <p className="author">{author}</p>
      </div>
    </article>
  )
}
