import { useState } from 'react';
import { IMAGE_ZONES } from '../content/imageZones';

export function Room() {
  return (
    <section id="room" className="section">
      <div className="container frame room__grid">
        <div className="panel panel--text">
          <p className="eyebrow">Interactive visual gateway</p>
          <h2 className="section-title">Printed matter table.</h2>
          <p>读书在别处，灵魂在此地。</p>
          <p className="side-note">Hover objects to reveal annotations. Click a zone to open its card, then enter the corresponding section.</p>
        </div>
        <InteractiveTable />
      </div>
    </section>
  );
}

function InteractiveTable() {
  const [activeId, setActiveId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const active = IMAGE_ZONES.find((z) => z.id === activeId);
  const selected = IMAGE_ZONES.find((z) => z.id === selectedId);

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="table-wrap panel">
      <div
        className="table-art"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setActiveId(null)}
      >
        <img
          src="/images/printed-matter-table.png"
          alt="Hand-drawn printed matter table with zines, books, notes, cups and people browsing"
        />
        <span className="table-label">Table B / Interactive Printed Matter</span>
        <span
          className="cursor-label"
          style={{
            left: `${Math.min(cursor.x + 2, 76)}%`,
            top: `${Math.min(cursor.y + 2, 80)}%`,
            opacity: active ? 1 : 0,
          }}
        >
          {active ? `${active.number} / ${active.label}` : ''}
        </span>

        {IMAGE_ZONES.map((zone) => (
          <button
            key={zone.id}
            className="hotspot"
            style={{
              left: `${zone.x}%`,
              top: `${zone.y}%`,
              width: `${zone.w}%`,
              height: `${zone.h}%`,
            }}
            aria-label={`Open ${zone.title}`}
            onPointerEnter={() => setActiveId(zone.id)}
            onFocus={() => setActiveId(zone.id)}
            onClick={() => setSelectedId(zone.id)}
          >
            <span>{zone.number} {zone.label}</span>
          </button>
        ))}

        {selected && (
          <div
            className="modal-backdrop"
            role="dialog"
            aria-modal="true"
            aria-labelledby="table-card-title"
          >
            <div className="modal-card">
              <div className="modal-card__bar">
                <span>{selected.number} / {selected.label}</span>
                <button type="button" onClick={() => setSelectedId(null)}>Close</button>
              </div>
              <div className="modal-card__body">
                <h3 id="table-card-title">{selected.title}</h3>
                <p>{selected.copy}</p>
                <a
                  className="button button--dark"
                  href={selected.href}
                  onClick={() => setSelectedId(null)}
                >
                  Enter section
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-zones" aria-label="Visual gateway links">
        {IMAGE_ZONES.map((zone) => (
          <a key={zone.id} href={zone.href}>{zone.number} {zone.label}</a>
        ))}
      </div>
    </div>
  );
}
