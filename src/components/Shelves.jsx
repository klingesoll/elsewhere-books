import { useState } from 'react';
import { SectionHeader } from './ui/SectionHeader';
import { SHELVES, BOOK_TOPICS } from '../content/shelves';

export function Shelves() {
  const [activeTopicId, setActiveTopicId] = useState(null);
  const activeTopic = activeTopicId ? BOOK_TOPICS[activeTopicId] : null;

  return (
    <section id="shelves" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Thematic shelves" title="Shelves / zines / reading paths" code="Table B">
          一组围绕主题整理的阅读路径，展开后可查看对应书目与介绍。
        </SectionHeader>

        <div className="shelf-grid">
          {SHELVES.map((shelf) => (
            <article className="shelf-card" key={shelf.id}>
              <div className="card-meta">
                <span>{shelf.id}</span>
                <span>{shelf.label}</span>
              </div>
              <h3>{shelf.title}</h3>
              <ul className="shelf-items">
                {shelf.items.map((item) => {
                  const isTopicItem = typeof item === 'object' && item !== null && item.topicId;
                  return (
                    <li key={isTopicItem ? item.topicId : item}>
                      {isTopicItem ? (
                        <button
                          type="button"
                          className="shelf-item-button"
                          onClick={() => setActiveTopicId(item.topicId)}
                        >
                          <span>{item.label}</span>
                          <small>open notes →</small>
                        </button>
                      ) : (
                        <span className="shelf-item-static">{item}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      </div>

      {activeTopic && (
        <BookTopicModal topic={activeTopic} onClose={() => setActiveTopicId(null)} />
      )}
    </section>
  );
}

function BookTopicModal({ topic, onClose }) {
  return (
    <div className="book-modal" role="dialog" aria-modal="true">
      <div className="book-modal-card">
        <div className="book-modal-header">
          <p>{topic.title}</p>
          <button type="button" onClick={onClose}>Close</button>
        </div>
        <div className="book-modal-body">
          {topic.image && (
            <figure className="book-topic-image">
              <img src={topic.image} alt={`${topic.title} book selection`} />
            </figure>
          )}
          <p className="book-modal-intro">{topic.intro}</p>
          <div className="book-list">
            {topic.books.map((book) => (
              <article className="book-entry" key={book.title}>
                <h4>{book.title}</h4>
                <p>{book.author}</p>
                <small>{book.note}</small>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
