import { ArrowIcon } from './ArrowIcon';

export function ButtonLink({ href, children, dark = false }) {
  return (
    <a href={href} className={dark ? 'button button-dark' : 'button'}>
      <span>{children}</span>
      <ArrowIcon size={14} />
    </a>
  );
}
