import { NAV_ITEMS } from '../content/nav';

export function Header() {
  return (
    <header className="header">
      <div className="container header__inner">
        <a className="wordmark" href="#top">Elsewhere Books <span>/ 别处书社</span></a>
        <nav className="nav" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href}>{item.label}</a>
          ))}
        </nav>
      </div>
    </header>
  );
}
