import { SectionHeader } from './ui/SectionHeader';

export function Support() {
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
        href="https://luma.com/elsewherebooks"
        target="_blank"
        rel="noreferrer"
      >
        Become a member
      </a>
    </article>
  );
}
