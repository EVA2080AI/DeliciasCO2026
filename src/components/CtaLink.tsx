import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isExternalHref, toExternalHref } from '@/lib/cmsGuards';

type Props = {
  /** Valor de `cta_link` del CMS (puede venir vacío o ser una URL externa). */
  to: string | null | undefined;
  /** Ruta interna usada cuando el CMS no trae enlace. */
  fallback?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Enlace de CTA editable desde el panel: rutas internas con <Link>; URLs externas (http, wa.me,
 * mailto, tel) con <a>. Un `<Link to="https://…">` haría que el router navegue a /https:… (404).
 */
export const CtaLink = ({ to, fallback = '/', className, children }: Props) => {
  const href = (to ?? '').trim() || fallback;
  if (isExternalHref(href)) {
    const external = toExternalHref(href);
    const newTab = /^https?:\/\//i.test(external);
    return (
      <a
        href={external}
        className={className}
        {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
};

export default CtaLink;
