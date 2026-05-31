import { SectionHeader } from './ui/SectionHeader';

const MEMBERSHIPS = [
  {
    title: '普通年度会员',
    titleEn: 'Annual Membership',
    price: '$58',
    period: '/ year',
    stamp: 'annual',
    desc: 'Support the programme, the reading room, and the slow work of keeping a small cultural space alive.',
    perks: [
      'Member event price',
      'Programme notes',
      'Priority registration',
      'Special gatherings',
    ],
  },
  {
    title: '优惠年度会员',
    titleEn: 'Concession Membership',
    price: '$28',
    period: '/ year',
    stamp: 'concession',
    desc: 'For students, seniors and concession card holders. Please bring proof of eligibility when attending.',
    perks: [
      'Member event price',
      'Programme notes',
      'Special gatherings',
    ],
  },
];

export function Support() {
  return (
    <section id="support" className="section">
      <div className="container frame support">
        <SectionHeader eyebrow="Support structure" title="Keep the room open" code="Membership">
          成为会员，支持这个空间持续开放、策展与相遇。
        </SectionHeader>
        <div className="support-grid">
          {MEMBERSHIPS.map((m) => (
            <MembershipCard key={m.title} membership={m} />
          ))}
        </div>
      </div>
    </section>
  );
}

function MembershipCard({ membership }) {
  const { title, titleEn, price, period, stamp, desc, perks } = membership;
  return (
    <article className="membership-card">
      <span className="stamp">{stamp}</span>
      <div>
        <h3>{title}</h3>
        <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '.16em', fontWeight: 950, margin: '4px 0 0', opacity: .6 }}>{titleEn}</p>
      </div>
      <p className="price">{price} <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '.04em' }}>{period}</span></p>
      <p>{desc}</p>
      <ul>
        {perks.map((perk) => (
          <li key={perk}>{perk}</li>
        ))}
      </ul>
      <a
        className="button button--dark"
        href={`mailto:event@ciff.org.au?subject=${encodeURIComponent(titleEn + ' Enquiry')}`}
      >
        Become a member
      </a>
    </article>
  );
}
