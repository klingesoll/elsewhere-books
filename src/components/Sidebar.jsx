const categories = [
  'Literature / 文學',
  'Philosophy / 哲學',
  'Architecture / 建築',
  'Typography / 字體排印',
  'Photography / 攝影',
  'Art Theory / 藝術理論',
  'Spatial Design / 空間設計',
  'Independent Zines / 獨立誌',
]

const authors = [
  'Walter Benjamin',
  'Susan Sontag',
  'Roland Barthes',
  'Italo Calvino',
  'Kenya Hara',
  'Peter Zumthor',
  'Jorge Luis Borges',
  'John Berger',
]

export default function Sidebar() {
  return (
    <aside className="cell index-sidebar p-sm">
      <div style={{ marginBottom: '2rem' }}>
        <span className="label">Categories</span>
        <ul className="dense-list">
          {categories.map(c => (
            <li key={c}><a href="#">{c}</a></li>
          ))}
        </ul>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <span className="label">Curated Authors</span>
        <ul className="dense-list">
          {authors.map(a => (
            <li key={a}><a href="#">{a}</a></li>
          ))}
        </ul>
      </div>

      <div style={{ flexGrow: 1, borderTop: '1px solid var(--line-color)', paddingTop: '0.5rem', marginTop: 'auto' }}>
        <span className="label">Events</span>
        <p className="text" style={{ fontSize: '0.8rem', marginBottom: '0.5rem' }}>
          <strong>Reading Group:</strong><br />
          Spaces of Illusion<br />
          Sat 14:00
        </p>
        <p className="text" style={{ fontSize: '0.8rem' }}>
          <strong>Exhibition:</strong><br />
          Grid &amp; Bone<br />
          Ongoing
        </p>
      </div>
    </aside>
  )
}
