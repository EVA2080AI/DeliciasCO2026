import { describe, it, expect } from 'vitest';
import {
  pickSlide,
  normalizeHeroSlides,
  readCta,
  ensureSlideCtas,
  normalizeStats,
  isExternalHref,
  toExternalHref,
  ensureHttp,
  DEFAULT_HERO_CTA,
  DEFAULT_HERO_CTA2,
  type HeroSlide,
} from '@/lib/cmsGuards';

const fallback = { title: 'default' };

describe('pickSlide', () => {
  const slides = [{ title: 'a' }, { title: 'b' }, { title: 'c' }];

  it('returns the slide at the index when in range', () => {
    expect(pickSlide(slides, 1, fallback)).toEqual({ title: 'b' });
  });

  it('clamps to the last slide when the CMS delivered fewer slides than the timer advanced', () => {
    expect(pickSlide(slides, 7, fallback)).toEqual({ title: 'c' });
  });

  it('clamps negative or non-finite indexes to the first slide', () => {
    expect(pickSlide(slides, -3, fallback)).toEqual({ title: 'a' });
    expect(pickSlide(slides, Number.NaN, fallback)).toEqual({ title: 'a' });
  });

  it('falls back when there are no slides', () => {
    expect(pickSlide([], 0, fallback)).toBe(fallback);
    expect(pickSlide(null, 0, fallback)).toBe(fallback);
    expect(pickSlide(undefined, 2, fallback)).toBe(fallback);
  });
});

describe('normalizeHeroSlides', () => {
  it('accepts metadata as object or JSON string and drops non-object entries', () => {
    const meta = { slides: [{ title: 'x' }, null, 'junk', 4, { title: 'y' }] };
    expect(normalizeHeroSlides(meta)).toEqual([{ title: 'x' }, { title: 'y' }]);
    expect(normalizeHeroSlides(JSON.stringify(meta))).toEqual([{ title: 'x' }, { title: 'y' }]);
  });

  it('returns null (use defaults) when nothing usable is present', () => {
    expect(normalizeHeroSlides(null)).toBeNull();
    expect(normalizeHeroSlides({})).toBeNull();
    expect(normalizeHeroSlides({ slides: [] })).toBeNull();
    expect(normalizeHeroSlides({ slides: [null, 'x'] })).toBeNull();
    expect(normalizeHeroSlides('{not json')).toBeNull();
  });
});

describe('readCta', () => {
  it('returns null when there is no destination (button is not rendered)', () => {
    expect(readCta(undefined)).toBeNull();
    expect(readCta(null)).toBeNull();
    expect(readCta({})).toBeNull();
    expect(readCta({ to: '  ', label: 'x' })).toBeNull();
    expect(readCta('/menu')).toBeNull();
  });

  it('fills a missing label with the default', () => {
    expect(readCta({ to: '/menu' }, 'Pedir ahora')).toEqual({ to: '/menu', label: 'Pedir ahora' });
    expect(readCta({ to: ' /sedes ', label: ' Visítanos ' })).toEqual({ to: '/sedes', label: 'Visítanos' });
  });
});

describe('ensureSlideCtas', () => {
  it('fills missing cta objects with defaults before saving', () => {
    const slide: HeroSlide = { title: 'x' };
    const out = ensureSlideCtas(slide);
    expect(out.cta).toEqual(DEFAULT_HERO_CTA);
    expect(out.cta2).toEqual(DEFAULT_HERO_CTA2);
  });

  it('keeps provided values and only fills the missing halves', () => {
    const slide: HeroSlide = { cta: { to: '/x' }, cta2: { label: 'Ir' } };
    const out = ensureSlideCtas(slide);
    expect(out.cta).toEqual({ to: '/x', label: DEFAULT_HERO_CTA.label });
    expect(out.cta2).toEqual({ to: DEFAULT_HERO_CTA2.to, label: 'Ir' });
  });

  it('does not mutate the input', () => {
    const slide: HeroSlide = { title: 'x', cta: null };
    ensureSlideCtas(slide);
    expect(slide.cta).toBeNull();
  });
});

describe('normalizeStats', () => {
  const fb = [{ value: 1, suffix: '', label: 'fb' }];

  it('coerces string values to numbers and drops items without label', () => {
    expect(normalizeStats([{ value: '40', suffix: '+', label: 'Años' }, { value: 3 }, { label: 'Sin valor' }], fb)).toEqual([
      { value: 40, suffix: '+', label: 'Años' },
      { value: 0, suffix: '', label: 'Sin valor' },
    ]);
  });

  it('falls back when input is not an array or nothing survives', () => {
    expect(normalizeStats(null, fb)).toBe(fb);
    expect(normalizeStats([{ value: 1 }], fb)).toBe(fb);
  });
});

describe('isExternalHref / toExternalHref', () => {
  it('detects external destinations', () => {
    expect(isExternalHref('https://instagram.com/x')).toBe(true);
    expect(isExternalHref('http://x.co')).toBe(true);
    expect(isExternalHref('mailto:a@b.co')).toBe(true);
    expect(isExternalHref('tel:+573001234567')).toBe(true);
    expect(isExternalHref('wa.me/573001234567')).toBe(true);
    expect(isExternalHref('//cdn.example.com')).toBe(true);
  });

  it('treats routes and empty values as internal', () => {
    expect(isExternalHref('/menu?cat=pies')).toBe(false);
    expect(isExternalHref('menu')).toBe(false);
    expect(isExternalHref('')).toBe(false);
    expect(isExternalHref(null)).toBe(false);
  });

  it('adds https to wa.me and protocol-relative links', () => {
    expect(toExternalHref('wa.me/573001234567')).toBe('https://wa.me/573001234567');
    expect(toExternalHref('//cdn.example.com/a')).toBe('https://cdn.example.com/a');
    expect(toExternalHref('mailto:a@b.co')).toBe('mailto:a@b.co');
  });
});

describe('ensureHttp', () => {
  it('prepends https:// when the scheme is missing', () => {
    expect(ensureHttp('instagram.com/delicias')).toBe('https://instagram.com/delicias');
    expect(ensureHttp('www.facebook.com/delicias')).toBe('https://www.facebook.com/delicias');
    expect(ensureHttp('//instagram.com/x')).toBe('https://instagram.com/x');
  });

  it('leaves complete URLs and other schemes alone', () => {
    expect(ensureHttp('https://instagram.com/delicias')).toBe('https://instagram.com/delicias');
    expect(ensureHttp('http://x.co')).toBe('http://x.co');
    expect(ensureHttp('mailto:hola@delicias.com')).toBe('mailto:hola@delicias.com');
  });

  it('returns empty for empty input', () => {
    expect(ensureHttp('')).toBe('');
    expect(ensureHttp('   ')).toBe('');
    expect(ensureHttp(undefined)).toBe('');
  });
});
