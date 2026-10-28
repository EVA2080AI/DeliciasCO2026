import { describe, it, expect } from 'vitest';
import { comandaTotal, findComandaAbierta } from '@/lib/comandas';
import type { ComandaItem } from '@/lib/comandas';

const item = (unit_price: number, quantity: number): ComandaItem =>
  ({ unit_price, quantity }) as ComandaItem;

describe('comandaTotal', () => {
  it('suma precio por cantidad de cada renglón', () => {
    expect(comandaTotal([item(3500, 2), item(1200, 1)])).toBe(8200);
  });

  it('una mesa recién abierta vale cero', () => {
    expect(comandaTotal([])).toBe(0);
  });

  it('no arrastra decimales: los precios son enteros en pesos', () => {
    expect(Number.isInteger(comandaTotal([item(1, 3), item(2, 5)]))).toBe(true);
  });
});

describe('findComandaAbierta', () => {
  const abiertas = [
    { id: 'a', mesa: 'Mesa 5' },
    { id: 'b', mesa: 'Barra' },
  ];

  it('encuentra la mesa ocupada para entrar a su cuenta', () => {
    expect(findComandaAbierta(abiertas, 'Mesa 5')?.id).toBe('a');
  });

  it('una mesa libre no devuelve nada, así se abre cuenta nueva', () => {
    expect(findComandaAbierta(abiertas, 'Mesa 7')).toBeUndefined();
  });

  // El motivo de todo esto: escrito a mano, cada variante abría una cuenta aparte.
  it('trata como la misma mesa lo que solo cambia en mayúsculas o espacios', () => {
    expect(findComandaAbierta(abiertas, 'mesa 5')?.id).toBe('a');
    expect(findComandaAbierta(abiertas, '  Mesa 5  ')?.id).toBe('a');
    expect(findComandaAbierta(abiertas, 'BARRA')?.id).toBe('b');
  });

  it('no confunde mesas distintas que empiezan igual', () => {
    expect(findComandaAbierta(abiertas, 'Mesa 50')).toBeUndefined();
  });

  it('aguanta que todavía no hayan cargado las comandas', () => {
    expect(findComandaAbierta(undefined, 'Mesa 5')).toBeUndefined();
  });
});
