import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { useLumaEvents } from './useLumaEvents';

const NAV_ITEMS = [
  { label: 'Room', href: '#room' },
  { label: 'Programme', href: '#programme' },
  { label: 'Shelves', href: '#shelves' },
  { label: 'Archive', href: '#archive' },
  { label: 'Visit', href: '#visit' },
];

const PROGRAMME = [
  {
    id: 'P-001',
    date: 'MAY 18',
    type: 'FILM SCREENING',
    title: '《敖鲁古雅，敖鲁古雅》放映与映后谈',
    time: '19:00–21:00',
    note: 'A screening room, a conversation, a temporary gathering around memory and disappearing landscapes.',
  },
  {
    id: 'P-002',
    date: 'MAY 25',
    type: 'READING GROUP',
    title: '店内读书会：迁徙、记忆与城市',
    time: '15:00–17:00',
    note: 'A slow reading session for people living between languages, cities and unfinished homes.',
  },
  {
    id: 'P-003',
    date: 'JUN 02',
    type: 'CONVERSATION',
    title: '中文写作、独立出版与南半球生活',
    time: '18:30–20:00',
    note: 'Small press, self-publishing, language, distance, friendship and the politics of making things by hand.',
  },
];

const BOOK_TOPICS = {
  diaspora: {
    title: '关于离散',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于亚裔离散、身份命名、自我书写与跨语言经验。',
    books: [
      {
        title: 'Queering the Asian Diaspora',
        author: 'Hongwei Bao',
        note: '从酷儿视角重新理解亚洲离散经验、身份政治与文化归属。'
      },
      {
        title: 'Self-portrait as a Banana',
        author: 'Hongwei Bao',
        note: '以“香蕉”作为种族化身份隐喻，书写移民、自我凝视与文化错位。'
      }
    ]
  },

  queerness: {
    title: '关于酷儿',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于身体、欲望、神话、酷儿文化与华语经验。',
    books: [
      {
        title: 'The Passion of the Rabbit God',
        author: 'Hongwei Bao',
        note: '以兔儿神为文化意象，将诗歌、信仰与酷儿欲望连接起来。'
      },
      {
        title: 'Queering the Asian Diaspora',
        author: 'Hongwei Bao',
        note: '讨论亚裔离散语境中的酷儿身份、文化生产与社群经验。'
      }
    ]
  },

  hongKongMemory: {
    title: '关于香港的记忆',
    image: '/images/diaspora-queer-hk-books.png',
    intro: '关于香港政治隐喻、抗争影像、城市创伤与后抗争时期的记忆整理。',
    books: [
      {
        title: 'How to Select a Chief Executive and Other Metaphors of Hong Kong Politics',
        author: 'Jennifer Eagleton',
        note: '以政治隐喻进入香港制度、语言与权力结构。'
      },
      {
        title: 'Umbrella Uprising',
        author: '作者 / 编者待补',
        note: '关于 2019 香港抗争的视觉档案。'
      },
      {
        title: 'Lamentations: Hong Kong 2019–2025',
        author: '作者待补',
        note: '关于香港 2019–2025 的城市哀悼、影像记忆与时代创伤。'
      }
    ]
  }
};

const SHELVES = [
  {
    id: 'S-001',
    label: '店员在读',
    title: 'KELLY is reading',
    items: ['《大路》', '《台湾漫游录》', '《大江大海1949》'],
  },
  {
    id: 'S-002',
    label: '租借书架',
    title: '书社创始人',
    items: ['《单读》', '《我还能看到多少次满月升起》', '《始于极限》'],
  },

  {
  id: 'S-003',
  label: '本月主题',
  title: '离散、酷儿与香港记忆',

  items: [
    {
      label: '关于离散',
      topicId: 'diaspora'
    },
    {
      label: '关于酷儿',
      topicId: 'queerness'
    },
    {
      label: '关于香港的记忆',
      topicId: 'hongKongMemory'
    }
  ]
}
];

const ARCHIVE = [
  ['A-024', 'screening', '边地、语言与消逝之前'],
  ['A-023', 'reading', '流动的房间：中文读书会'],
  ['A-022', 'talk', '翻译、失语与异乡生活'],
  ['A-021', 'table', 'Small Press Sunday'],
  ['A-020', 'notes', '读者来信 / Reader fragments'],
];

const IMAGE_ZONES = [
  {
    id: 'shelves',
    number: '01',
    label: 'Shelves',
    title: 'Printed Matter Shelves',
    href: '#shelves',
    x: 38,
    y: 45,
    w: 36,
    h: 28,
    copy: 'Zines, books, notes, fragments and reading paths selected from the room.',
  },
  {
    id: 'programme',
    number: '02',
    label: 'Programme',
    title: 'Events Programme',
    href: '#programme',
    x: 58,
    y: 55,
    w: 22,
    h: 20,
    copy: 'Screenings, reading groups, conversations and small gatherings on the calendar.',
  },
  {
    id: 'archive',
    number: '03',
    label: 'Archive',
    title: 'Small Press Archive',
    href: '#archive',
    x: 74,
    y: 45,
    w: 24,
    h: 22,
    copy: 'Past gatherings, programme notes, catalogues and traces from previous events.',
  },
  {
    id: 'visit',
    number: '04',
    label: 'Visit',
    title: 'Visit the Reading Room',
    href: '#visit',
    x: 14,
    y: 64,
    w: 22,
    h: 22,
    copy: 'Opening hours, address, map and practical notes for visiting the room.',
  },
];

function App() {
  const { upcoming, past, loading } = useLumaEvents();

  return (
    <main className="site">
      <Announcement />
      <Header />
      <Hero />
      <Room />
      <Manifesto />
      <Programme events={upcoming ?? PROGRAMME} loading={loading} />
      <Shelves />
      <Archive entries={past ?? ARCHIVE.map(([id, type, title]) => ({ id, type, title, url: '#programme' }))} loading={loading} />
      <Support />
      <Visit />
      <Footer />
    </main>
  );
}

function Announcement() {
  return (
    <a className="announcement" href="#programme">
      Printed programme no. 005 · Open Fri–Sun 15:00–19:00 · Franklin St reading room · View events →
    </a>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <a className="wordmark" href="#top">Elsewhere Books <span>/ 别处书社</span></a>
        <nav className="nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
      </div>
    </header>
  );
}


function ArrowIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}
function ButtonLink({ href, children, dark = false }) {
  return (
    <a
      href={href}
      className={dark ? "button button-dark" : "button"}
    >
      <span>{children}</span>
      <ArrowIcon size={14} />
    </a>
  );
}

function Hero() {
  return (
    <section id="top" className="section hero">
      <div className="container frame hero__grid">
        <div className="hero__logo panel">
          <div className="hero__meta">
            <span className="stamp">artist-run room</span>
            <span>Opening / 2025-09-21</span>
          </div>
          <img src="/images/elsewhere-logo-transparent-full.png" alt="别处书社 Elsewhere Books" className="logo" />
          <div className="hero__note split-text">
            <p>一本临时书展手册，一面活动海报墙，一间中文阅读室。</p>
            <p>A small press table, a cultural archive, a room for gathering around books and ideas.</p>
          </div>
        </div>
        <div className="hero__copy panel">
          <p className="eyebrow">Independent art book fair / Reading room / Small press archive</p>
          <h1>在别处<br />阅读。</h1>
          <h2>Reading<br />from elsewhere.</h2>
          <p className="lead">A Chinese-language bookshop and artist-run cultural space in Melbourne. Books, screenings, zines, conversations and gatherings for readers living between places.</p>
          <div className="actions">
            <ButtonLink href="https://luma.com/elsewherebooks" dark>查看活动PROGRAMME</ButtonLink>
            <ButtonLink href="#visit">到店信息VISIT</ButtonLink>
          </div>
          <div className="info-strip">
            <div><b>Fri–Sun</b><span>15:00-19:00</span></div>
            <div><b>Level 3 / 139 Franklin St</b><span>Melbourne VIC</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Room() {
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
  const active = IMAGE_ZONES.find((zone) => zone.id === activeId);
  const selected = IMAGE_ZONES.find((zone) => zone.id === selectedId);

  function handlePointerMove(event) {
    const rect = event.currentTarget.getBoundingClientRect();
    setCursor({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  }

  return (
    <div className="table-wrap panel">
      <div className="table-art" onPointerMove={handlePointerMove} onPointerLeave={() => setActiveId(null)}>
        <img src="/images/printed-matter-table.png" alt="Hand-drawn printed matter table with zines, books, notes, cups and people browsing" />
        <span className="table-label">Table B / Interactive Printed Matter</span>
        <span className="cursor-label" style={{ left: `${Math.min(cursor.x + 2, 76)}%`, top: `${Math.min(cursor.y + 2, 80)}%`, opacity: active ? 1 : 0 }}>
          {active ? `${active.number} / ${active.label}` : ''}
        </span>

        {IMAGE_ZONES.map((zone) => (
          <button
            key={zone.id}
            className="hotspot"
            style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
            aria-label={`Open ${zone.title}`}
            onPointerEnter={() => setActiveId(zone.id)}
            onFocus={() => setActiveId(zone.id)}
            onClick={() => setSelectedId(zone.id)}
          >
            <span>{zone.number} {zone.label}</span>
          </button>
        ))}

        {selected && (
          <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="table-card-title">
            <div className="modal-card">
              <div className="modal-card__bar">
                <span>{selected.number} / {selected.label}</span>
                <button type="button" onClick={() => setSelectedId(null)}>Close</button>
              </div>
              <div className="modal-card__body">
                <h3 id="table-card-title">{selected.title}</h3>
                <p>{selected.copy}</p>
                <a className="button button--dark" href={selected.href} onClick={() => setSelectedId(null)}>Enter section</a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-zones" aria-label="Visual gateway links">
        {IMAGE_ZONES.map((zone) => <a key={zone.id} href={zone.href}>{zone.number} {zone.label}</a>)}
      </div>
    </div>
  );
}

function Manifesto() {
  return (
    <section className="manifesto">
      <div className="container manifesto__inner">
        <p className="eyebrow">Artist-run note</p>
        <h2>Not just a bookshop. A temporary cultural room.</h2>
        <div className="split-text split-text--large">
          <p>别处书社是一间位于墨尔本的中文独立书店与文化空间。这里有书，也有放映、讲座、读书会与对话。</p>
          <p>它更接近一个小型出版展、一张工作台、一面海报墙和一间临时阅览室：人们围绕语言、电影、书籍和异乡生活短暂停留。</p>
        </div>
      </div>
    </section>
  );
}

function Programme({ events, loading }) {
  return (
    <section id="programme" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Printed programme" title="Programme wall" code="Issue 005">
          一份持续更新的 programme，收录放映、阅读、对话与小型文化聚会。
        </SectionHeader>

        {loading ? (
          <div className="programme-notice programme-notice-loading">
            <p className="notice-kicker">Loading programme</p>
            <h3>正在同步活动</h3>
            <p>正在从 Luma 读取近期活动，请稍候。</p>
          </div>
        ) : events.length === 0 ? (
          <div className="programme-notice">
            <p className="notice-kicker">Programme notice</p>
            <h3>近期活动正在整理中</h3>
            <p>
              新的放映、读书会、对话与小型文化聚会会在这里更新。你也可以先查看过往活动档案。
            </p>
            <div className="notice-actions">
              <a href="#archive" className="button button-dark">
                查看过往活动
              </a>
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
            {events.map((event) => (
              <article className="programme-card" key={event.id}>
                <div className="card-meta">
                  <span>{event.id}</span>
                  <span>ticket</span>
                </div>

                <p className="date">{event.date}</p>
                <p className="type">{event.type}</p>
                <h3>{event.title}</h3>
                <p>{event.note}</p>

                <footer>
                  <b>{event.time}</b>
                  <a
                    href={event.url ?? "https://luma.com/elsewherebooks"}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View on Luma →
                  </a>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Shelves() {
  const [activeTopicId, setActiveTopicId] = React.useState(null);
  const activeTopic = activeTopicId ? BOOK_TOPICS[activeTopicId] : null;

  return (
    <section id="books" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Printed matter table" title="Shelves / zines / reading paths" code="Table B">
          一组围绕主题整理的阅读路径，展开后可查看对应书目与介绍。
        </SectionHeader>

        <div className="shelves-grid">
          {SHELVES.map((shelf) => (
            <article className="shelf-card" key={shelf.id}>
              <div className="card-meta">
                <span>{shelf.id}</span>
                <span>{shelf.label}</span>
              </div>

              <h3>{shelf.title}</h3>

              <ul className="shelf-items">
                {shelf.items.map((item) => {
                  const isTopicItem =
                    typeof item === 'object' &&
                    item !== null &&
                    item.topicId;

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
        <BookTopicModal
          topic={activeTopic}
          onClose={() => setActiveTopicId(null)}
        />
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
          <button type="button" onClick={onClose}>
            Close
          </button>
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

function Archive({ entries, loading }) {
  return (
    <section id="archive" className="section">
      <div className="container frame">
        <SectionHeader eyebrow="Archive index" title="Past gatherings" code="Box A">
          过去活动不做成博客列表，而像小型文化档案：编号、类型、题名、缺页、注释、可追溯的现场痕迹。
        </SectionHeader>
        {loading ? (
          <p className="eyebrow">Loading archive…</p>
        ) : (
          <div className="archive-list">
            {entries.map((entry) => (
              <a key={entry.id} href={entry.url ?? '#programme'} className="archive-row" target={entry.url && entry.url !== '#programme' ? '_blank' : undefined} rel="noopener noreferrer">
                <span>{entry.id}</span><span>{entry.type}</span><strong>{entry.title}</strong><em>open →</em>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Support() {
  return (
    <section id="support" className="section">
      <div className="container frame support">
        <SectionHeader eyebrow="Support structure" title="Keep the room open" code="Membership">
          成为会员，支持这个空间持续开放、策展与相遇。
        </SectionHeader>
        <div className="support-grid">
          <MembershipCard title="普通年度会员" price="$58 / year" />
          <MembershipCard title="优惠年度会员" price="$28 / year" />
        </div>
      </div>
    </section>
  );
}

function MembershipCard({ title, price }) {
  return (
    <article className="membership-card">
      <span className="stamp">support</span>
      <h3>{title}</h3>
      <p className="price">{price}</p>
      <p>Support the programme, the reading room, and the slow work of keeping a small cultural space alive.</p>
      <ul>
        <li>Member event price</li>
        <li>Programme notes</li>
        <li>Priority registration</li>
        <li>Special gatherings</li>
      </ul>
      <a
        className="button button--dark"
        href="https://luma.com/elsewherebooks?period=past"
        target="_blank"
        rel="noreferrer"
      >
        Become a member
      </a>
    </article>
  );
}

function Visit() {
  const mapQuery = 'Level 3/139 Franklin St, Melbourne VIC';
  const encodedMapQuery = encodeURIComponent(mapQuery);

  return (
    <section id="visit" className="section">
      <div className="container frame visit-grid">
        <div className="panel panel--text">
          <p className="eyebrow">Visit the reading room</p>
          <h2 className="section-title">Come by. Stay a while.</h2>

          <p>
            <b>Level 3 / 139 Franklin St, Melbourne VIC</b>
          </p>

          <p>
            Open Fri–Sun 15:00–19:00
            <br />
            Public holiday hours may vary.
          </p>

          <p className="side-note">
            Bring a friend, a question, a half-finished book, or nothing at all.
          </p>

          <div className="actions">
            <a
              className="button"
              href={`https://www.google.com/maps/search/?api=1&query=${encodedMapQuery}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Map
            </a>

            <a
              className="button"
              href="https://luma.com/elsewherebooks"
              target="_blank"
              rel="noreferrer"
            >
              Luma
            </a>
          </div>
        </div>

        <div className="panel map-embed">
          <iframe
            title="Elsewhere Books Google Map"
            src={`https://www.google.com/maps?q=${encodedMapQuery}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <h2>别处书社<br />ELSEWHERE BOOKS</h2>
          <p>A Chinese-language bookshop, reading room and artist-run cultural space in Melbourne.</p>
        </div>
        <div>
          <p className="eyebrow">Links</p>
          <a href="https://www.instagram.com/elsewhere_books_mel/">Instagram</a>
          <a href="https://luma.com/elsewherebooks">Luma</a>
          <a href="mailto:event@ciff.org.au">Email</a>
        </div>
        <div>
          <p className="eyebrow">Acknowledgement of Country</p>
          <p>Elsewhere Books acknowledges the Wurundjeri Woi-wurrung and Bunurong / Boon Wurrung peoples of the Kulin Nation as the Traditional Owners of the land on which we gather. We pay our respects to Elders past and present, and extend that respect to all Aboriginal and Torres Strait Islander peoples.</p>
        </div>
      </div>
    </footer>
  );
}

function SectionHeader({ eyebrow, title, code, children }) {
  return (
    <header className="section-header">
      {code && <span className="section-code">{code}</span>}
      <p className="eyebrow">{eyebrow}</p>
      <div>
        <h2>{title}</h2>
        <p>{children}</p>
      </div>
    </header>
  );
}

createRoot(document.getElementById('root')).render(<App />);
