const MAP_QUERY = 'Level 3/139 Franklin St, Melbourne VIC';

export function Visit() {
  const encodedQuery = encodeURIComponent(MAP_QUERY);
  return (
    <section id="visit" className="section">
      <div className="container frame visit-grid">
        <div className="panel panel--text">
          <p className="eyebrow">Visit the reading room</p>
          <h2 className="section-title">Come by. Stay a while.</h2>
          <p><b>Level 3 / 139 Franklin St, Melbourne VIC</b></p>
          <p>
            Open Fri–Sun 15:00–19:00<br />
            Public holiday hours may vary.
          </p>
          <p className="side-note">Bring a friend, a question, a half-finished book, or nothing at all.</p>
          <div className="actions">
            <a
              className="button"
              href={`https://www.google.com/maps/search/?api=1&query=${encodedQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Map
            </a>
            <a className="button" href="https://luma.com/elsewherebooks" target="_blank" rel="noreferrer">
              Luma
            </a>
          </div>
        </div>
        <div className="panel map-embed">
          <iframe
            title="Elsewhere Books Google Map"
            src={`https://www.google.com/maps?q=${encodedQuery}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}
