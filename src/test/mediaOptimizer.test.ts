import { describe, it, expect } from 'vitest';
import { publicUrlForPath } from '@/lib/imageUrls';
import {
  collectUrlsDeep,
  planOptimization,
  presetForItem,
  presetForPath,
  replaceUrlsDeep,
  summarizePlan,
  type BucketObject,
  type RefLocation,
} from '@/lib/mediaOptimizer';

const url = (p: string) => publicUrlForPath(p);
const obj = (path: string, size: number, mime = 'image/png'): BucketObject => ({ path, size, mime });

describe('replaceUrlsDeep / collectUrlsDeep', () => {
  const meta = {
    slides: [
      { title: 'A', img: url('product-1.jpg'), cta: { to: '/menu' } },
      { title: 'B', img: 'https://external.com/b.jpg' },
    ],
    other: { nested: [url('section-2.png')] },
  };

  it('collects only bucket URLs, anywhere in the JSON', () => {
    expect(collectUrlsDeep(meta)).toEqual([url('product-1.jpg'), url('section-2.png')]);
  });

  it('replaces matching URLs immutably', () => {
    const out = replaceUrlsDeep(meta, 'product-1.jpg', url('product-1.webp'));
    expect(out.slides[0].img).toBe(url('product-1.webp'));
    expect(out.slides[1].img).toBe('https://external.com/b.jpg');
    expect(out.other.nested[0]).toBe(url('section-2.png'));
    expect(meta.slides[0].img).toBe(url('product-1.jpg')); // original untouched
  });
});

describe('preset selection', () => {
  it('falls back to filename heuristics when unreferenced', () => {
    expect(presetForPath('product-1.jpg')).toBe('product');
    expect(presetForPath('slide-abc-0-1.png')).toBe('hero');
    expect(presetForPath('blog-1.jpg')).toBe('blog');
    expect(presetForPath('site/brand_logo.png')).toBe('logo');
    expect(presetForPath('site/seo_og_image-123.png')).toBe('og');
    expect(presetForPath('site/login_cover_image-1.png')).toBe('cover');
    expect(presetForPath('media-1.png')).toBe('section');
  });

  it('uses the highest-resolution preset among references', () => {
    const refs: RefLocation[] = [
      { table: 'products', id: '1', column: 'image_url' },
      { table: 'page_sections', id: '2', column: 'metadata' },
    ];
    expect(presetForItem('product-1.jpg', refs)).toBe('hero');
    expect(presetForItem('x.png', [{ table: 'site_settings', key: 'brand_logo' }])).toBe('logo');
  });
});

describe('planOptimization', () => {
  const refs = new Map<string, RefLocation[]>([
    ['product-1.jpg', [{ table: 'products', id: 'p1', column: 'image_url' }]],
    ['product-2.webp', [{ table: 'products', id: 'p2', column: 'image_url' }]],
    ['product-3.webp', [{ table: 'products', id: 'p3', column: 'image_url' }]],
    ['site/brand_logo.png', [{ table: 'site_settings', key: 'brand_logo' }]],
    ['big.webp', [{ table: 'page_sections', id: 's1', column: 'image_url' }]],
  ]);
  const objects = [
    obj('product-1.jpg', 400_000, 'image/jpeg'),
    obj('product-2.webp', 120_000, 'image/webp'),
    obj('product-2-thumb.webp', 8_000, 'image/webp'),
    obj('product-3.webp', 120_000, 'image/webp'),
    obj('site/brand_logo.png', 1_270_000),
    obj('site/seo_og_image-old.png', 1_200_000),
    obj('orphan-thumb.webp', 5_000, 'image/webp'),
    obj('big.webp', 900_000, 'image/webp'),
    obj('notes.txt', 10),
  ];
  const plan = planOptimization(objects, refs);
  const byPath = Object.fromEntries(plan.map((p) => [p.path, p]));

  it('converts referenced non-webp images to a NEW webp path', () => {
    expect(byPath['product-1.jpg'].action).toBe('convert');
    expect(byPath['product-1.jpg'].newPath).toBe('product-1.webp');
    expect(byPath['product-1.jpg'].thumbPath).toBe('product-1-thumb.webp');
    expect(byPath['site/brand_logo.png'].action).toBe('convert');
    expect(byPath['site/brand_logo.png'].newPath).toBe('site/brand_logo.webp');
    expect(byPath['site/brand_logo.png'].thumbPath).toBeUndefined();
  });

  it('skips already optimized webp with thumb, and requests only a thumb when missing', () => {
    expect(byPath['product-2.webp'].action).toBe('skip');
    expect(byPath['product-3.webp'].action).toBe('thumb-only');
    expect(byPath['product-3.webp'].thumbPath).toBe('product-3-thumb.webp');
  });

  it('re-encodes oversized webp to a -opt path', () => {
    expect(byPath['big.webp'].action).toBe('convert');
    expect(byPath['big.webp'].newPath).toBe('big-opt.webp');
  });

  it('flags unreferenced files and orphan thumbs', () => {
    expect(byPath['site/seo_og_image-old.png'].action).toBe('orphan');
    expect(byPath['orphan-thumb.webp'].action).toBe('orphan');
    expect(byPath['product-2-thumb.webp'].action).toBe('thumb');
  });

  it('ignores non-image objects and never reuses an existing path', () => {
    expect(byPath['notes.txt']).toBeUndefined();
    const clash = planOptimization([obj('a.png', 500_000), obj('a.webp', 10, 'image/webp')], new Map([['a.png', refs.get('product-1.jpg')!]]));
    expect(clash.find((p) => p.path === 'a.png')?.newPath).toBe('a-1.webp');
  });

  it('summarizes counts and bytes', () => {
    const s = summarizePlan(plan);
    expect(s.convert).toBe(3);
    expect(s.thumbOnly).toBe(1);
    expect(s.skip).toBe(1);
    expect(s.orphan).toBe(2);
    expect(s.bytesToConvert).toBe(400_000 + 1_270_000 + 900_000);
  });
});
