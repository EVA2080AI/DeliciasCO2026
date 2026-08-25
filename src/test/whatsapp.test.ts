import { describe, it, expect } from 'vitest';
import { buildWaUrl, toWaNumber } from '@/lib/whatsapp';

describe('toWaNumber', () => {
  it('normalizes Colombian numbers to wa.me format', () => {
    expect(toWaNumber('3169259646')).toBe('573169259646');
    expect(toWaNumber('316 925 9646')).toBe('573169259646');
    expect(toWaNumber('+57 316 925 9646')).toBe('573169259646');
    expect(toWaNumber('573169259646')).toBe('573169259646');
    expect(toWaNumber('0057 316 9259646')).toBe('573169259646');
  });
  it('returns empty for garbage', () => {
    expect(toWaNumber('')).toBe('');
    expect(toWaNumber(null)).toBe('');
    expect(toWaNumber('abc')).toBe('');
  });
});

describe('buildWaUrl', () => {
  it('encodes the message', () => {
    expect(buildWaUrl('316 925 9646', 'Hola & adiós')).toBe('https://wa.me/573169259646?text=Hola%20%26%20adi%C3%B3s');
    expect(buildWaUrl('316 925 9646')).toBe('https://wa.me/573169259646');
  });
});
