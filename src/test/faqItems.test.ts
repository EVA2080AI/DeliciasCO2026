import { describe, it, expect } from 'vitest';
import { normalizeFaqItems, tokenizeInline } from '@/lib/cmsGuards';

describe('normalizeFaqItems', () => {
  it('accepts q/a and question/answer, trimming values', () => {
    const items = normalizeFaqItems({
      items: [
        { q: ' ¿Hacen domicilios? ', a: ' Sí ' },
        { question: '¿Horario?', answer: '6 a 8' },
      ],
    });
    expect(items).toEqual([
      { q: '¿Hacen domicilios?', a: 'Sí' },
      { q: '¿Horario?', a: '6 a 8' },
    ]);
  });

  it('drops malformed entries instead of crashing the page', () => {
    const items = normalizeFaqItems({
      items: [
        { q: 'Solo pregunta' },
        { a: 'Solo respuesta' },
        { q: '', a: 'vacía' },
        null,
        'texto suelto',
        42,
        { q: 'Válida', a: 'Ok' },
      ],
    });
    expect(items).toEqual([{ q: 'Válida', a: 'Ok' }]);
  });

  it('accepts a bare array and a JSON string', () => {
    expect(normalizeFaqItems([{ q: 'a', a: 'b' }])).toEqual([{ q: 'a', a: 'b' }]);
    expect(normalizeFaqItems('{"items":[{"q":"a","a":"b"}]}')).toEqual([{ q: 'a', a: 'b' }]);
    expect(normalizeFaqItems('[{"question":"a","answer":"b"}]')).toEqual([{ q: 'a', a: 'b' }]);
  });

  it('returns an empty list for garbage input', () => {
    expect(normalizeFaqItems(null)).toEqual([]);
    expect(normalizeFaqItems(undefined)).toEqual([]);
    expect(normalizeFaqItems('{broken')).toEqual([]);
    expect(normalizeFaqItems({ items: 'nope' })).toEqual([]);
    expect(normalizeFaqItems({})).toEqual([]);
  });

  it('coerces numeric answers to strings', () => {
    expect(normalizeFaqItems([{ q: '¿Cuántas sedes?', a: 2 }])).toEqual([{ q: '¿Cuántas sedes?', a: '2' }]);
  });
});

describe('tokenizeInline (mini-markdown for blog paragraphs)', () => {
  it('splits **bold** and *italic* segments', () => {
    expect(tokenizeInline('Hola **mundo** y *cursiva*.')).toEqual([
      { type: 'text', value: 'Hola ' },
      { type: 'bold', value: 'mundo' },
      { type: 'text', value: ' y ' },
      { type: 'italic', value: 'cursiva' },
      { type: 'text', value: '.' },
    ]);
  });

  it('returns plain text untouched and handles empty input', () => {
    expect(tokenizeInline('sin formato')).toEqual([{ type: 'text', value: 'sin formato' }]);
    expect(tokenizeInline('')).toEqual([]);
  });

  it('leaves unbalanced markers as text', () => {
    expect(tokenizeInline('precio **sin cerrar')).toEqual([{ type: 'text', value: 'precio **sin cerrar' }]);
    expect(tokenizeInline('a * b')).toEqual([{ type: 'text', value: 'a * b' }]);
  });
});
