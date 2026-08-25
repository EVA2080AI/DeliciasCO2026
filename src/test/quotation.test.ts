import { describe, it, expect } from 'vitest';
import {
  buildDeliveryAddress,
  buildQuotationMessage,
  buildQuotationNotes,
  clampQty,
  csvCell,
  formatRequestedDate,
  newQuotationId,
  validateQuotation,
  type QuotationFormValues,
} from '@/lib/quotation';
import { localISODate } from '@/lib/dates';

const valid: QuotationFormValues = {
  company: ' Acme S.A.S. ',
  nit: '900.123.456-7',
  contact: 'Ana Pérez',
  phone: '316 925 9646',
  email: 'ana@acme.co',
  deliveryType: 'delivery',
  sedeId: '',
  addressMain: 'Cra 7 # 45-12',
  addressDetail: 'Of. 301',
  neighborhood: 'Chapinero',
  requestedDate: '',
};

describe('validateQuotation', () => {
  it('accepts a complete delivery form', () => {
    expect(validateQuotation(valid, 2)).toBeNull();
  });
  it('requires company, contact and phone (trimmed)', () => {
    expect(validateQuotation({ ...valid, company: '   ' }, 1)).toMatch(/razón social/i);
    expect(validateQuotation({ ...valid, contact: '' }, 1)).toMatch(/razón social/i);
  });
  it('rejects short or garbage phones', () => {
    expect(validateQuotation({ ...valid, phone: '316 925' }, 1)).toMatch(/teléfono/i);
    expect(validateQuotation({ ...valid, phone: 'abc-def-ghij' }, 1)).toMatch(/teléfono/i);
    expect(validateQuotation({ ...valid, phone: '+57 (316) 925-9646' }, 1)).toBeNull();
  });
  it('validates email only when provided', () => {
    expect(validateQuotation({ ...valid, email: '' }, 1)).toBeNull();
    expect(validateQuotation({ ...valid, email: 'no-es-correo' }, 1)).toMatch(/correo/i);
  });
  it('requires at least one item', () => {
    expect(validateQuotation(valid, 0)).toMatch(/producto/i);
  });
  it('requires a sede for pickup and address+neighborhood for delivery', () => {
    expect(validateQuotation({ ...valid, deliveryType: 'pickup', sedeId: '' }, 1)).toMatch(/sede/i);
    expect(validateQuotation({ ...valid, deliveryType: 'pickup', sedeId: 'sede-quirinal' }, 1)).toBeNull();
    expect(validateQuotation({ ...valid, neighborhood: ' ' }, 1)).toMatch(/barrio/i);
  });
  it('requires the requested date to be tomorrow or later (local time)', () => {
    expect(validateQuotation({ ...valid, requestedDate: localISODate(0) }, 1)).toMatch(/mañana/i);
    expect(validateQuotation({ ...valid, requestedDate: localISODate(1) }, 1)).toBeNull();
  });
});

describe('clampQty', () => {
  it('clamps to [0, 999] and drops decimals/NaN', () => {
    expect(clampQty(-5)).toBe(0);
    expect(clampQty(12.9)).toBe(12);
    expect(clampQty(5000)).toBe(999);
    expect(clampQty(NaN)).toBe(0);
  });
});

describe('address / notes / message', () => {
  it('joins non-empty address parts', () => {
    expect(buildDeliveryAddress(valid)).toBe('Cra 7 # 45-12, Of. 301, Chapinero');
    expect(buildDeliveryAddress({ ...valid, addressDetail: '  ' })).toBe('Cra 7 # 45-12, Chapinero');
  });
  it('keeps the legacy notes format', () => {
    expect(buildQuotationNotes({ deliveryType: 'delivery', sedeName: '', address: 'Cra 7, Chapinero', requestedDate: '2026-09-01' }))
      .toBe('Fecha deseada: 2026-09-01 | ENVÍO DOMICILIO: Cra 7, Chapinero');
    expect(buildQuotationNotes({ deliveryType: 'pickup', sedeName: 'Sede Quirinal', address: '', requestedDate: '' }))
      .toBe('RECOGER EN SEDE: Sede Quirinal');
  });
  it('builds the WhatsApp message with items and total', () => {
    const msg = buildQuotationMessage(
      {
        company: 'Acme', nit: '', contact: 'Ana', phone: '3169259646', email: '',
        deliveryType: 'pickup', sedeName: 'Sede Quirinal', address: '', requestedDate: '',
        items: [{ name: 'Pastel de pollo', quantity: 10, subtotal: 50000 }],
        total: 50000,
      },
      'lunes 31 de agosto de 2026, 9:00 a. m.',
      'abcd1234',
    );
    expect(msg).toContain('*Cotización Corporativa - Delicias Colombianas*');
    expect(msg).toContain('- Ref: abcd1234');
    expect(msg).toContain('- RECOGER EN SEDE: Sede Quirinal');
    expect(msg).toContain('- 10x Pastel de pollo - ');
    expect(msg).toContain('50.000');
    expect(msg).not.toContain('NIT');
    expect(msg).not.toMatch(/\n\n\n/);
  });
});

describe('helpers', () => {
  it('csvCell quotes and escapes', () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(12)).toBe('"12"');
  });
  it('formatRequestedDate does not shift the day', () => {
    expect(formatRequestedDate('2026-09-01')).toMatch(/1 de septiembre de 2026/);
    expect(formatRequestedDate('')).toBe('');
    expect(formatRequestedDate(null)).toBe('');
  });
  it('newQuotationId returns a v4 uuid', () => {
    expect(newQuotationId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(newQuotationId()).not.toBe(newQuotationId());
  });
});
