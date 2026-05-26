export function SectionHeader({ eyebrow, title, code, children }) {
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
