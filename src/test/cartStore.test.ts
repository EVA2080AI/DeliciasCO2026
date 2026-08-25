import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_QTY,
  clampQty,
  repriceItems,
  sanitizeCartItems,
  useCartStore,
  type CartItem,
  type Product,
} from '@/store/cartStore';

const product = (over: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pastel de pollo',
  description: 'Clásico',
  price: 5000,
  category: 'pasteleria',
  image: '/pastel.webp',
  ...over,
});

beforeEach(() => {
  useCartStore.setState({ items: [], isOpen: false });
  localStorage.clear();
});

describe('clampQty', () => {
  it('keeps quantities within 1..MAX_QTY as integers', () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(-3)).toBe(1);
    expect(clampQty(2.7)).toBe(2);
    expect(clampQty(500)).toBe(MAX_QTY);
    expect(clampQty(NaN)).toBe(1);
    expect(clampQty(Infinity)).toBe(1);
  });
});

describe('cart actions', () => {
  it('addItem merges the same product and caps at MAX_QTY', () => {
    const { addItem } = useCartStore.getState();
    addItem(product(), 60);
    addItem(product(), 60);
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(MAX_QTY);
  });

  it('addItem clamps a first-time quantity', () => {
    useCartStore.getState().addItem(product(), 1000);
    expect(useCartStore.getState().items[0].quantity).toBe(MAX_QTY);
    useCartStore.getState().addItem(product({ id: 'p2' }), 0);
    expect(useCartStore.getState().items[1].quantity).toBe(1);
  });

  it('updateQuantity clamps to MAX_QTY and removes the line at 0', () => {
    const store = useCartStore.getState();
    store.addItem(product());
    store.updateQuantity('p1', 150);
    expect(useCartStore.getState().items[0].quantity).toBe(MAX_QTY);
    store.updateQuantity('p1', 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it('computes totals', () => {
    const store = useCartStore.getState();
    store.addItem(product(), 2);
    store.addItem(product({ id: 'p2', price: 1500 }), 3);
    expect(useCartStore.getState().totalItems()).toBe(5);
    expect(useCartStore.getState().totalPrice()).toBe(2 * 5000 + 3 * 1500);
    store.removeItem('p1');
    expect(useCartStore.getState().totalItems()).toBe(3);
    store.clearCart();
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe('sanitizeCartItems (persist migrate)', () => {
  it('drops malformed entries and clamps quantities', () => {
    const raw: unknown[] = [
      { product: product(), quantity: 2 },
      { product: product({ id: 'p2' }), quantity: 999 },
      { product: product({ id: 'p3' }), quantity: 0 },
      { product: { id: 'x' }, quantity: 1 }, // sin nombre ni precio
      { product: product({ id: 'p4', price: 'abc' as unknown as number }), quantity: 1 },
      { product: product({ id: 'p5' }), quantity: 'two' },
      { quantity: 1 },
      null,
      'str',
      42,
    ];
    const items = sanitizeCartItems(raw);
    expect(items.map((i) => [i.product.id, i.quantity])).toEqual([
      ['p1', 2],
      ['p2', MAX_QTY],
      ['p3', 1],
    ]);
  });

  it('merges duplicate ids and fills missing optional fields', () => {
    const items = sanitizeCartItems([
      { product: { id: 'a', name: 'A', price: 10, image: '' }, quantity: 1 },
      { product: { id: 'a', name: 'A', price: 10 }, quantity: 2 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].product.image).toBe('/placeholder.svg');
    expect(items[0].product.description).toBe('');
    expect(items[0].product.requiresAdvanceNotice).toBe(false);
  });

  it('returns an empty cart for non-arrays', () => {
    expect(sanitizeCartItems(undefined)).toEqual([]);
    expect(sanitizeCartItems(null)).toEqual([]);
    expect(sanitizeCartItems({})).toEqual([]);
    expect(sanitizeCartItems('[]')).toEqual([]);
  });

  it('is wired as the persist migration to version 2', async () => {
    expect(useCartStore.persist.getOptions().version).toBe(2);
    localStorage.setItem(
      'delicias-cart',
      JSON.stringify({
        state: { items: [{ product: product(), quantity: 500 }, { bad: true }] },
        version: 0,
      }),
    );
    await useCartStore.persist.rehydrate();
    const { items } = useCartStore.getState();
    expect(items).toHaveLength(1);
    expect(items[0].product.id).toBe('p1');
    expect(items[0].quantity).toBe(MAX_QTY);
  });

  it('sanitizes a same-version cart that was tampered with', async () => {
    localStorage.setItem(
      'delicias-cart',
      JSON.stringify({ state: { items: 'nope' }, version: 2 }),
    );
    await useCartStore.persist.rehydrate();
    expect(useCartStore.getState().items).toEqual([]);
  });
});

describe('repriceItems', () => {
  const cart: CartItem[] = [
    { product: product({ price: 5000 }), quantity: 2 },
    { product: product({ id: 'gone', name: 'Producto retirado' }), quantity: 1 },
  ];

  it('keeps the snapshot when the catalog is not available', () => {
    const r = repriceItems(cart, undefined);
    expect(r.fromSnapshot).toBe(true);
    expect(r.items).toBe(cart);
    expect(r.unavailable).toEqual([]);
    expect(r.total).toBe(2 * 5000 + 5000);
  });

  it('uses the current price/name and excludes products no longer active', () => {
    const r = repriceItems(cart, [product({ price: 6000, name: 'Pastel de pollo grande' })]);
    expect(r.fromSnapshot).toBe(false);
    expect(r.items).toHaveLength(1);
    expect(r.items[0].product.price).toBe(6000);
    expect(r.items[0].product.name).toBe('Pastel de pollo grande');
    expect(r.items[0].quantity).toBe(2);
    expect(r.unavailable.map((u) => u.product.id)).toEqual(['gone']);
    expect(r.priceChanges).toEqual([{ name: 'Pastel de pollo grande', oldPrice: 5000, newPrice: 6000 }]);
    expect(r.total).toBe(12000);
  });

  it('reports no changes when prices match and clamps stale quantities', () => {
    const r = repriceItems([{ product: product(), quantity: 400 }], [product()]);
    expect(r.priceChanges).toEqual([]);
    expect(r.items[0].quantity).toBe(MAX_QTY);
    expect(r.total).toBe(MAX_QTY * 5000);
  });
});
