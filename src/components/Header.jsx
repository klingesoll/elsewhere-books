export default function Header() {
  return (
    <header className="header">
      <div className="cell p-md">
        <span className="label">Identity</span>
        <h1 className="brand">Elsewhere</h1>
        <h1 className="brand-cn">別處書社</h1>
      </div>
      <div className="cell p-md" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <span className="label">Coordinates</span>
          <p className="text">120.1551° E, 30.2741° N</p>
          <p className="text">A space of geometric escape.</p>
        </div>
        <nav style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
          <a href="#" style={{ fontWeight: 'bold' }}>(Index)</a>
          <a href="#">(About)</a>
          <a href="#">(Events)</a>
        </nav>
      </div>
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
