import { describe, it, expect } from 'vitest';
import { isTodayOrLater, localISODate } from '@/lib/dates';

describe('localISODate', () => {
  it('uses local time, not UTC', () => {
    // 23:30 local → still the same local day even if UTC already rolled over
    const late = new Date(2026, 7, 25, 23, 30);
    expect(localISODate(0, late)).toBe('2026-08-25');
    expect(localISODate(1, late)).toBe('2026-08-26');
    expect(localISODate(7, new Date(2026, 11, 28))).toBe('2027-01-04');
  });
  it('compares ISO dates lexicographically', () => {
    expect(isTodayOrLater(localISODate(1), 1)).toBe(true);
    expect(isTodayOrLater(localISODate(0), 1)).toBe(false);
    expect(isTodayOrLater('', 0)).toBe(false);
  });
});
