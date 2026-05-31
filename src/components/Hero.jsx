import { ButtonLink } from './ui/ButtonLink';

export function Hero() {
  return (
    <section id="top" className="section hero">
      <div className="container frame hero__grid">
        <div className="hero__logo panel">
          <div className="hero__meta">
            <span className="stamp">artist-run room</span>
            <span>Est. / 2025</span>
          </div>
          <img src="/images/elsewhere-logo-transparent-full.png" alt="别处书社 Elsewhere Books" className="logo" />
          <div className="hero__note split-text">
            <p>一本临时书展手册，一面活动海报墙，一间华文阅读室。</p>
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
