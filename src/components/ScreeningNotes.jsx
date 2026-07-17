import { useState, useEffect } from 'react';
import { SectionHeader } from './ui/SectionHeader';
import { ArrowIcon } from './ui/ArrowIcon';
import { QNA_RECORDS } from '../content/qnaRecords';

export function ScreeningNotes() {
  const [selectedNote, setSelectedNote] = useState(null);

  useEffect(() => {
    if (!selectedNote) return;
    function onKey(e) { if (e.key === 'Escape') setSelectedNote(null); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selectedNote]);

  return (
    <section id="screening-notes" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Screening notes" title="After the screening" code="Notes">
          映后谈笔记整理
        </SectionHeader>
        <div className="notes-grid">
          {QNA_RECORDS.map((record) => (
            <article key={record.id} className="note-card">
              <div className="note-card__meta">
                <span className="eyebrow">{record.id}</span>
                <span className="note-card__type">{record.type}</span>
              </div>
              <h3>{record.title}</h3>
              <p>{record.summary}</p>
              <ul className="tag-list">
                {record.topics.slice(0, 6).map((topic) => (
                  <li key={topic} className="tag">{topic}</li>
                ))}
              </ul>
              <button
                type="button"
                className="button note-card__btn"
                onClick={() => setSelectedNote(record)}
              >
                Open notes <ArrowIcon size={13} />
              </button>
            </article>
          ))}
        </div>
      </div>

      {selectedNote && (
        <div
          className="book-modal"
          role="dialog"
          aria-modal="true"
          aria-label={selectedNote.title}
          onClick={() => setSelectedNote(null)}
        >
          <div className="qna-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="book-modal-header">
              <p>{selectedNote.id} / {selectedNote.type}</p>
              <button type="button" onClick={() => setSelectedNote(null)}>Close ×</button>
            </div>
            <div className="book-modal-body">
              <p className="eyebrow">{selectedNote.film}</p>
              <h2 className="modal-title">{selectedNote.title}</h2>
              <p className="book-modal-intro">{selectedNote.intro || selectedNote.summary}</p>
              <ul className="tag-list">
                {selectedNote.topics.map((topic) => (
                  <li key={topic} className="tag">{topic}</li>
                ))}
              </ul>
              {selectedNote.pullQuotes?.length > 0 && (
                <div className="pull-quotes">
                  {selectedNote.pullQuotes.map((q, i) => (
                    <blockquote key={i} className="pull-quote">"{q}"</blockquote>
                  ))}
                </div>
              )}
              <div className="qna-sections">
                {selectedNote.sections.map((section) => (
                  <div key={section.heading} className="qna-section">
                    <h3>{section.heading}</h3>
                    {section.points.map((point) => (
                      <div key={point.title} className="qna-point">
                        <h4>{point.title}</h4>
                        <p>{point.body}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
