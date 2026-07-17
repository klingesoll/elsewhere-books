import { SectionHeader } from './ui/SectionHeader';

export function Archive({ entries, loading }) {
  return (
    <section id="archive" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Archive index" title="Past gatherings" code="Box A">
          过往活动档案|PAST LIVES
        </SectionHeader>
        {loading ? (
          <p className="eyebrow" style={{ padding: '24px clamp(20px, 4vw, 56px)' }}>Loading archive…</p>
        ) : !entries || entries.length === 0 ? (
          <p className="eyebrow" style={{ padding: '24px clamp(20px, 4vw, 56px)' }}>No past events yet.</p>
        ) : (
          <div className="archive-list">
            {entries.map((entry) => (
              <a
                key={entry.id}
                href={entry.url || '#'}
                className="archive-row"
                target={entry.url ? '_blank' : undefined}
                rel="noopener noreferrer"
              >
                <span>{entry.id}</span>
                <span>{entry.type}</span>
                <strong>{entry.title}</strong>
                <em>open →</em>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
