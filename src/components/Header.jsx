export default function Header() {
  return (
    <header className="header">
      {/* ── Logo cell ── */}
      <div className="cell p-md" style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
        <svg width="52" height="42" viewBox="0 0 120 80" style={{ flexShrink: 0 }}>
          <line x1="20" y1="75" x2="20" y2="40" stroke="black" strokeWidth="2" />
          <line x1="100" y1="75" x2="100" y2="40" stroke="black" strokeWidth="2" />
          <line x1="20" y1="75" x2="100" y2="75" stroke="black" strokeWidth="2" />
          <path d="M 20,40 Q 35,25 50,20" stroke="black" strokeWidth="2" fill="none" />
          <line x1="20" y1="40" x2="50" y2="20" stroke="black" strokeWidth="1.5" />
          <path d="M 50,20 Q 65,25 100,40" stroke="black" strokeWidth="2" fill="none" />
          <line x1="50" y1="20" x2="100" y2="40" stroke="black" strokeWidth="1.5" />
          <line x1="50" y1="20" x2="50" y2="45" stroke="black" strokeWidth="1.5" />
          <line x1="25" y1="42" x2="45" y2="22" stroke="black" strokeWidth="1" />
          <line x1="28" y1="44" x2="42" y2="24" stroke="black" strokeWidth="1" />
          <line x1="55" y1="22" x2="95" y2="42" stroke="black" strokeWidth="1" />
          <line x1="58" y1="24" x2="92" y2="44" stroke="black" strokeWidth="1" />
        </svg>

        <div>
          <span className="label" style={{ marginBottom: '0.4rem' }}>Identity</span>
          <h1 className="brand">ELSEWHERE BOOKS</h1>
          <h1 className="brand-cn" style={{ marginTop: '0.3rem' }}>別 處 書 社</h1>
        </div>
      </div>

      {/* ── Coordinates / Nav ── */}
      <div className="cell p-md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span className="label">Coordinates</span>
          <p className="text">144.9631° E, 37.8136° S</p>
          <p className="text">A space of geometric escape.</p>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <a href="/" style={{ fontWeight: 'bold' }}>(Index)</a>
          <a href="/scan">(上架)</a>
          <a href="#events">(Events)</a>
        </nav>
      </div>

      {/* ── Status ── */}
      <div className="cell p-md" style={{ background: 'var(--highlight-blue)' }}>
        <span className="label">Status</span>
        <p className="text" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          ARCHIVE ONLINE<br />
          VOL. 01 / EST. 2024<br />
          GRID ALIGNED
        </p>
      </div>
    </header>
  )
}
