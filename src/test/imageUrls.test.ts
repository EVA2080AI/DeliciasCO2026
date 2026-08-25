import { describe, it, expect } from 'vitest';
import { bucketPathFromUrl, cleanImageUrl, getThumbUrl, isThumbPath, publicUrlForPath, thumbPathFor } from '@/lib/imageUrls';

const base = publicUrlForPath('x.webp').replace(/x\.webp$/, '');

describe('imageUrls', () => {
  it('extracts the bucket path from a public URL (ignoring query strings)', () => {
    expect(bucketPathFromUrl(`${base}site/brand_logo.png?t=123`)).toBe('site/brand_logo.png');
    expect(bucketPathFromUrl(`${base}product-1.jpg`)).toBe('product-1.jpg');
  });

  it('returns null for URLs outside the bucket', () => {
    expect(bucketPathFromUrl('https://example.com/a.png')).toBeNull();
    expect(bucketPathFromUrl('/placeholder.svg')).toBeNull();
    expect(bucketPathFromUrl(null)).toBeNull();
  });

  it('derives thumb paths by convention', () => {
    expect(thumbPathFor('product-1.webp')).toBe('product-1-thumb.webp');
    expect(thumbPathFor('site/logo.png')).toBe('site/logo-thumb.webp');
    expect(isThumbPath('a-thumb.webp')).toBe(true);
    expect(isThumbPath('a.webp')).toBe(false);
  });

  it('only offers thumbs for .webp bucket objects', () => {
    expect(getThumbUrl(`${base}product-1.webp`)).toBe(`${base}product-1-thumb.webp`);
    expect(getThumbUrl(`${base}product-1.jpg`)).toBeNull();
    expect(getThumbUrl('https://example.com/a.webp')).toBeNull();
    expect(getThumbUrl(`${base}a-thumb.webp?x=1`)).toBe(`${base}a-thumb.webp`);
  });

  it('cleans cache busters', () => {
    expect(cleanImageUrl('https://h/a.png?t=1#x')).toBe('https://h/a.png');
  });
});
