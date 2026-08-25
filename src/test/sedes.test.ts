import { describe, it, expect } from 'vitest';
import { fallBackSedes, normalizeSede, parseSedes } from '@/hooks/useSedes';

describe('parseSedes', () => {
  it('falls back when the CMS value is missing or malformed', () => {
    expect(parseSedes(undefined)).toBe(fallBackSedes);
    expect(parseSedes('not json')).toBe(fallBackSedes);
    expect(parseSedes('{}')).toBe(fallBackSedes);
    expect(parseSedes('[]')).toBe(fallBackSedes);
    expect(parseSedes('[{"phone":"123"}]')).toBe(fallBackSedes); // sin nombre → descartada
  });

  it('normalizes sedes seeded without id/type/whatsapp (the original migration seed)', () => {
    const [s] = parseSedes(JSON.stringify([{ name: 'Sede Quirinal', phone: '+57 316 925 9646', hours: 'Lun-Sáb', address: 'Calle 60' }]));
    expect(s.id).toBe('sede-sede-quirinal');
    expect(s.type).toBe('tienda');
    expect(s.whatsapp).toBe('573169259646');
    expect(s.mapEmbed).toBe('');
    expect(s.email).toBeUndefined();
  });

  it('keeps explicit values and sanitizes the whatsapp field', () => {
    const s = normalizeSede({ id: 'x', name: 'Norte', type: 'tienda', phone: '1', whatsapp: '+57 315 290 5160', mapEmbed: 'https://maps' }, 0)!;
    expect(s.id).toBe('x');
    expect(s.whatsapp).toBe('573152905160');
    expect(s.mapEmbed).toBe('https://maps');
  });

  it('detects administrative offices so they are hidden from store lists', () => {
    expect(normalizeSede({ name: 'Oficina Administrativa', phone: '' }, 0)!.type).toBe('administrativa');
    expect(normalizeSede({ name: 'Centro', type: 'administrativa' }, 0)!.type).toBe('administrativa');
  });
});
