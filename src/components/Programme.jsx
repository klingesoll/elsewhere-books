import { SectionHeader } from './ui/SectionHeader';

export function Programme({ events, loading }) {
  return (
    <section id="programme" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Printed programme" title="Programme wall" code="Issue 005">
          书店近期文化活动，详情请参Luma页面
        </SectionHeader>

        {loading ? (
          <div className="programme-notice programme-notice-loading">
            <p className="notice-kicker">Loading programme</p>
            <h3>正在同步活动</h3>
            <p>正在从 Luma 读取近期活动，请稍候。</p>
          </div>
        ) : !events || events.length === 0 ? (
          <div className="programme-notice">
            <p className="notice-kicker">Programme notice</p>
            <h3>近期活动正在整理中</h3>
            <p>
              放映、读书会、对话与小型文化聚会等活动正在整理中，敬请期待。你也可以在 Luma 查看过往活动。
            </p>
            <div className="notice-actions">
              <a href="#archive" className="button button--dark">查看过往活动</a>
              <a
                href="https://luma.com/elsewherebooks"
                className="button"
                target="_blank"
                rel="noreferrer"
              >
                打开 Luma
              </a>
            </div>
          </div>
        ) : (
          <div className="programme-grid">
            {events.map((event) => <ProgrammeCard key={event.id} event={event} />)}
          </div>
        )}
      </div>
    </section>
  );
}

function ProgrammeCard({ event }) {
  const ticketLabel = event.isFree ? 'Free' : (event.ticketPrice ?? 'Ticketed');
  return (
    <article className="programme-card">
      <div className="card-meta">
        <span>{event.id}</span>
        <span>{ticketLabel}</span>
      </div>
      <p className="date">{event.date}</p>
      <p className="type">{event.type}</p>
      <h3>{event.title}</h3>
      {event.description && <p>{event.description}</p>}
      <footer>
        <b>{event.time}</b>
        <a
          href={event.url || 'https://luma.com/elsewherebooks'}
          target="_blank"
          rel="noreferrer"
        >
          View on Luma →
        </a>
      </footer>
    </article>
  );
}
