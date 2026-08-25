/**
 * Guards puros para contenido editable desde el panel (page_sections.metadata, site_settings).
 * El dueño puede dejar JSON incompleto o malformado: nada de aquí debe lanzar ni devolver
 * valores que hagan crashear un render. Sin React: testeable con vitest.
 */

export type HeroCta = { to: string; label: string };
export type HeroSlide = {
  tag?: string;
  title?: string;
  desc?: string;
  img?: string;
  cta?: Partial<HeroCta> | null;
  cta2?: Partial<HeroCta> | null;
};
export type FaqItem = { q: string; a: string };
export type StatItem = { value: number; suffix: string; label: string };

export const DEFAULT_HERO_CTA: HeroCta = { to: '/menu', label: 'Pedir ahora' };
export const DEFAULT_HERO_CTA2: HeroCta = { to: '/nosotros', label: 'Nuestra historia' };

/** site_settings.key → CSS var de fondo de sección (valores "H S% L%" o #hex). Persisten desde el panel. */
export const SECTION_COLOR_VARS: Record<string, string> = {
  section_color_warm: '--section-warm',
  section_color_dark: '--section-dark',
  section_color_cream: '--section-cream',
  section_color_terracotta: '--section-terracotta',
};

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string => (v === null || v === undefined ? '' : String(v)).trim();

/** Metadata como objeto o string JSON → objeto; null si no se puede interpretar. */
export const parseMetadata = (meta: unknown): Record<string, unknown> | null => {
  if (!meta) return null;
  if (typeof meta === 'string') {
    try {
      const parsed = JSON.parse(meta);
      return isObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isObject(meta) ? meta : null;
};

/** Slide seguro aunque el índice haya quedado fuera de rango (el CMS trajo menos slides que el timer). */
export const pickSlide = <T>(slides: readonly T[] | null | undefined, index: number, fallback: T): T => {
  if (!Array.isArray(slides) || slides.length === 0) return fallback;
  const safeIndex = Number.isFinite(index) ? Math.floor(index) : 0;
  const i = Math.min(Math.max(0, safeIndex), slides.length - 1);
  return slides[i] ?? fallback;
};

/** Lista de slides del hero: solo objetos; null si no hay ninguno válido (usar defaults). */
export const normalizeHeroSlides = (meta: unknown): HeroSlide[] | null => {
  const parsed = parseMetadata(meta);
  const raw = parsed?.slides;
  if (!Array.isArray(raw)) return null;
  const slides = raw.filter(isObject) as HeroSlide[];
  return slides.length > 0 ? slides : null;
};

/** CTA de un slide: null si no tiene destino (no se renderiza el botón); label con default. */
export const readCta = (raw: unknown, defaultLabel = 'Ver más'): HeroCta | null => {
  if (!isObject(raw)) return null;
  const to = str(raw.to);
  if (!to) return null;
  return { to, label: str(raw.label) || defaultLabel };
};

/** Antes de guardar desde el panel: garantiza que cada slide tenga objetos `cta`/`cta2` completos. */
export const ensureSlideCtas = <T extends HeroSlide>(slide: T, defaults: { cta?: HeroCta; cta2?: HeroCta } = {}): T => {
  const d1 = defaults.cta ?? DEFAULT_HERO_CTA;
  const d2 = defaults.cta2 ?? DEFAULT_HERO_CTA2;
  const fill = (raw: unknown, d: HeroCta): HeroCta => {
    const r = isObject(raw) ? raw : {};
    return { to: str(r.to) || d.to, label: str(r.label) || d.label };
  };
  return { ...slide, cta: fill(slide.cta, d1), cta2: fill(slide.cta2, d2) };
};

/**
 * Items de FAQ desde el CMS: acepta `{ items: [...] }`, un array directo o el JSON string de
 * cualquiera de los dos. Cada item puede usar `q`/`a` o `question`/`answer`; se descartan los
 * que no tengan ambos campos.
 */
export const normalizeFaqItems = (input: unknown): FaqItem[] => {
  let list: unknown = input;
  if (typeof input === 'string') {
    try {
      list = JSON.parse(input);
    } catch {
      return [];
    }
  }
  if (isObject(list)) list = list.items;
  if (!Array.isArray(list)) return [];
  const out: FaqItem[] = [];
  for (const item of list) {
    if (!isObject(item)) continue;
    const q = str(item.q) || str(item.question);
    const a = str(item.a) || str(item.answer);
    if (q && a) out.push({ q, a });
  }
  return out;
};

/** Stats (contadores): `value` numérico, sin items sin `label`; fallback si no queda ninguno. */
export const normalizeStats = (items: unknown, fallback: StatItem[]): StatItem[] => {
  if (!Array.isArray(items)) return fallback;
  const out: StatItem[] = [];
  for (const item of items) {
    if (!isObject(item)) continue;
    const label = str(item.label);
    if (!label) continue;
    const value = Number(item.value);
    out.push({ value: Number.isFinite(value) ? value : 0, suffix: str(item.suffix), label });
  }
  return out.length > 0 ? out : fallback;
};

/** URL externa: http(s), protocol-relative, mailto, tel o wa.me (no debe ir en <Link>). */
export const isExternalHref = (href: string | null | undefined): boolean => {
  const h = str(href);
  return /^(https?:\/\/|\/\/|mailto:|tel:|wa\.me\/)/i.test(h);
};

/** Href listo para un <a>: `wa.me/…` y `//host` reciben `https:`. */
export const toExternalHref = (href: string): string => {
  const h = str(href);
  if (/^wa\.me\//i.test(h)) return `https://${h}`;
  if (h.startsWith('//')) return `https:${h}`;
  return h;
};

/** Enlaces sociales del CMS: si el dueño pegó `instagram.com/x` sin esquema, se antepone https://. */
export const ensureHttp = (url: string | null | undefined): string => {
  const u = str(url);
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // ya tiene esquema (https:, mailto:, tel:)
  if (u.startsWith('//')) return `https:${u}`;
  return `https://${u.replace(/^\/+/, '')}`;
};

export type InlineToken = { type: 'text' | 'bold' | 'italic'; value: string };

/** Mini-markdown de una línea: `**negrita**` y `*cursiva*`. Sin HTML crudo, sin dependencias. */
export const tokenizeInline = (text: string): InlineToken[] => {
  const src = text ?? '';
  if (!src) return [];
  const tokens: InlineToken[] = [];
  const re = /\*\*([^*]+?)\*\*|\*([^*\n]+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: src.slice(last, m.index) });
    if (m[1] !== undefined) tokens.push({ type: 'bold', value: m[1] });
    else tokens.push({ type: 'italic', value: m[2] });
    last = m.index + m[0].length;
  }
  if (last < src.length) tokens.push({ type: 'text', value: src.slice(last) });
  return tokens;
};
