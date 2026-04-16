import BookCover from './BookCover'

export default function BookCard({ imgSrc, excerpt, sku, price, titleCn, author, style, featured }) {
  // Use designed SVG cover if no real image, or if image is a pexels placeholder
  const isPexels = imgSrc?.includes('pexels.com')
  const showSvgCover = !imgSrc || isPexels

  if (featured) {
    return (
      <article className="cell book-cell book-cell--featured" style={style}>
        <div className="featured-cover-side">
          {showSvgCover ? (
            <div className="book-cover book-cover-svg featured-cover">
              <BookCover sku={sku} titleCn={titleCn} author={author} />
            </div>
          ) : (
            <img src={imgSrc} alt={titleCn} className="book-cover featured-cover" />
          )}
        </div>
        <div className="featured-text-side">
          <span className="label">Editor's Pick</span>
          <h3 className="featured-title">{titleCn}</h3>
          <p className="featured-author">{author}</p>
          <p className="featured-excerpt">{excerpt}</p>
          <p className="featured-info">{sku}{price ? ` · ${price}` : ''}</p>
        </div>
      </article>
    )
  }

  return (
    <article className="cell book-cell" style={style}>
      <div className="book-cover-wrapper">
        {showSvgCover ? (
          <div className="book-cover book-cover-svg">
            <BookCover sku={sku} titleCn={titleCn} author={author} />
          </div>
        ) : (
          <img src={imgSrc} alt={titleCn} className="book-cover" />
        )}
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
      <div className="book-meta">
        <h3 className="book-meta-title">{titleCn}</h3>
        <p className="book-meta-author">{author}</p>
        <p className="book-meta-info">{sku}{price ? ` · ${price}` : ''}</p>
      </div>
    </article>
  )
}
