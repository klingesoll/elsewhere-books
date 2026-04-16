import { VOLUNTEER_GROUPS } from '../constants/site'

export default function Volunteers() {
  return (
    <section className="volunteers-section">
      <div className="volunteers-header-row">
        <span className="label">Volunteers / 志願者</span>
      </div>

      {VOLUNTEER_GROUPS.map((g, i) => (
        <div className="volunteer-card" key={i}>
          <span className="volunteer-ordinal">
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="volunteer-info">
            <span className="volunteer-role">{g.en}</span>
            <span className="volunteer-name">{g.role}</span>
            <span className="volunteer-tagline">{g.tagline}</span>
          </div>
        </div>
      ))}

      {/* CTA cell */}
      <div className="volunteer-card volunteer-cta">
        <div className="cross-lines" />
        <div className="volunteer-info" style={{ zIndex: 2, textAlign: 'center', alignItems: 'center' }}>
          <span className="volunteer-name" style={{ fontSize: '2rem', lineHeight: 1 }}>+</span>
          <span className="volunteer-role" style={{ opacity: 0.7 }}>JOIN US / 加入我們</span>
        </div>
      </div>
    </section>
  )
}
