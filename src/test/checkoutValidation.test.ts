import { describe, expect, it } from 'vitest';
import { localISODate } from '@/lib/dates';
import {
  ADDRESS_MAX,
  NOTES_MAX,
  isUuid,
  isValidPhone,
  minDateOffset,
  validateCheckout,
  type CheckoutInput,
} from '@/lib/checkoutValidation';

const base: CheckoutInput = {
  name: 'Ana María',
  phone: '316 925 9646',
  deliveryType: 'pickup',
  sedeId: 'sede-quirinal',
  hasSedes: true,
  pickupTime: '10:00',
  address: '',
  neighborhood: '',
  requestedDate: '',
  requiresAdvanceNotice: false,
  notes: '',
  acceptedPolicy: true,
  itemCount: 2,
};

const check = (over: Partial<CheckoutInput>) => validateCheckout({ ...base, ...over });

describe('isUuid', () => {
  it('accepts canonical uuids (any case)', () => {
    expect(isUuid('0f1e2d3c-4b5a-4978-8a9b-0c1d2e3f4a5b')).toBe(true);
    expect(isUuid('0F1E2D3C-4B5A-4978-8A9B-0C1D2E3F4A5B')).toBe(true);
  });
  it('rejects slugs, numbers and empty values', () => {
    expect(isUuid('pastel-de-pollo')).toBe(false);
    expect(isUuid('123')).toBe(false);
    expect(isUuid('')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(null)).toBe(false);
    expect(isUuid('0f1e2d3c-4b5a-4978-8a9b-0c1d2e3f4a5b-extra')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts Colombian mobiles in common formats', () => {
    expect(isValidPhone('316 925 9646')).toBe(true);
    expect(isValidPhone('3169259646')).toBe(true);
    expect(isValidPhone('+57 316 925 9646')).toBe(true);
    expect(isValidPhone('(316) 925-9646')).toBe(true);
    expect(isValidPhone('  573169259646 ')).toBe(true);
  });
  it('rejects short numbers, letters and empties', () => {
    expect(isValidPhone('1234567')).toBe(false); // 7 dígitos: sin indicativo posible
    expect(isValidPhone('57316925964')).toBe(false); // 11 dígitos
    expect(isValidPhone('316 925 96ab')).toBe(false);
    expect(isValidPhone('')).toBe(false);
    expect(isValidPhone('   ')).toBe(false);
  });
});

describe('minDateOffset', () => {
  it('is tomorrow for 24h products, today otherwise', () => {
    expect(minDateOffset(true)).toBe(1);
    expect(minDateOffset(false)).toBe(0);
  });
});

describe('validateCheckout', () => {
  it('passes a valid pickup order', () => {
    expect(check({})).toBeNull();
  });

  it('passes a valid delivery order', () => {
    expect(check({ deliveryType: 'delivery', pickupTime: '', address: 'Cra 7 #45-12', neighborhood: 'Chapinero' })).toBeNull();
  });

  it('requires items and available sedes', () => {
    expect(check({ itemCount: 0 })).toMatch(/carrito/i);
    expect(check({ hasSedes: false })).toMatch(/sedes/i);
  });

  it('requires a trimmed name of at least 2 chars', () => {
    expect(check({ name: '' })).toMatch(/nombre/i);
    expect(check({ name: '  A  ' })).toMatch(/nombre/i);
    expect(check({ name: '  Al ' })).toBeNull();
  });

  it('requires a valid phone', () => {
    expect(check({ phone: '123' })).toMatch(/teléfono/i);
    expect(check({ phone: 'abc' })).toMatch(/teléfono/i);
  });

  it('requires an explicit sede (no silent default)', () => {
    expect(check({ sedeId: '' })).toMatch(/sede/i);
  });

  it('requires a date from tomorrow when the cart has 24h products', () => {
    expect(check({ requiresAdvanceNotice: true, requestedDate: '' })).toMatch(/fecha/i);
    expect(check({ requiresAdvanceNotice: true, requestedDate: localISODate(0) })).toMatch(/mañana/i);
    expect(check({ requiresAdvanceNotice: true, requestedDate: localISODate(1) })).toBeNull();
  });

  it('keeps the date optional otherwise but rejects past dates', () => {
    expect(check({ requestedDate: '' })).toBeNull();
    expect(check({ requestedDate: localISODate(0) })).toBeNull();
    expect(check({ requestedDate: localISODate(-1) })).toMatch(/fecha/i);
  });

  it('requires a pickup time for pickup orders', () => {
    expect(check({ pickupTime: '' })).toMatch(/hora/i);
    expect(check({ pickupTime: '   ' })).toMatch(/hora/i);
  });

  it('requires address (5..200 chars) and neighborhood for delivery', () => {
    const delivery: Partial<CheckoutInput> = { deliveryType: 'delivery', pickupTime: '' };
    expect(check({ ...delivery, address: '', neighborhood: 'Centro' })).toMatch(/dirección/i);
    expect(check({ ...delivery, address: 'Cr 7', neighborhood: 'Centro' })).toMatch(/dirección/i);
    expect(check({ ...delivery, address: 'x'.repeat(ADDRESS_MAX + 1), neighborhood: 'Centro' })).toMatch(/dirección/i);
    expect(check({ ...delivery, address: 'Cra 7 #45-12', neighborhood: '' })).toMatch(/barrio/i);
    expect(check({ ...delivery, address: 'x'.repeat(ADDRESS_MAX), neighborhood: 'Centro' })).toBeNull();
  });

  it('caps notes length', () => {
    expect(check({ notes: 'n'.repeat(NOTES_MAX) })).toBeNull();
    expect(check({ notes: 'n'.repeat(NOTES_MAX + 1) })).toMatch(/notas/i);
  });

  it('requires accepting the data policy', () => {
    expect(check({ acceptedPolicy: false })).toMatch(/política/i);
  });
});
