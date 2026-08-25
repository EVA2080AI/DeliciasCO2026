import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  category: 'pasteleria' | 'cafeteria' | 'delicias' | 'bebidas' | 'combos' | 'pies';
  image: string;
  featured?: boolean;
  requiresAdvanceNotice?: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const MAX_QTY = 99;

/** Cantidad entera entre 1 y MAX_QTY (valores no numéricos → 1). */
export const clampQty = (n: number): number => {
  const value = Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.min(MAX_QTY, Math.max(1, value));
};

const PLACEHOLDER_IMAGE = '/placeholder.svg';

/**
 * Valida un carrito persistido. localStorage puede traer versiones viejas del esquema o datos
 * editados a mano: se descartan entradas malformadas, se unifican ids repetidos y se acota la cantidad.
 */
export const sanitizeCartItems = (raw: unknown): CartItem[] => {
  if (!Array.isArray(raw)) return [];
  const byId = new Map<string, CartItem>();
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const { product, quantity } = entry as { product?: unknown; quantity?: unknown };
    if (!product || typeof product !== 'object') continue;
    const p = product as Record<string, unknown>;
    if (typeof p.id !== 'string' || !p.id) continue;
    if (typeof p.name !== 'string' || !p.name) continue;
    if (typeof p.price !== 'number' || !Number.isFinite(p.price) || p.price < 0) continue;
    if (typeof quantity !== 'number' || !Number.isFinite(quantity)) continue;

    const clean: Product = {
      id: p.id,
      name: p.name,
      description: typeof p.description === 'string' ? p.description : '',
      longDescription: typeof p.longDescription === 'string' ? p.longDescription : undefined,
      price: p.price,
      category: (typeof p.category === 'string' ? p.category : 'delicias') as Product['category'],
      image: typeof p.image === 'string' && p.image ? p.image : PLACEHOLDER_IMAGE,
      featured: !!p.featured,
      requiresAdvanceNotice: !!p.requiresAdvanceNotice,
    };
    const existing = byId.get(clean.id);
    byId.set(clean.id, { product: clean, quantity: clampQty((existing?.quantity ?? 0) + quantity) });
  }
  return [...byId.values()];
};

const sumItems = (items: CartItem[]) => items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

export interface PriceChange {
  name: string;
  oldPrice: number;
  newPrice: number;
}

export interface RepriceResult {
  /** Líneas válidas con nombre/precio ACTUALES del catálogo. */
  items: CartItem[];
  /** Líneas cuyo producto ya no está activo (excluidas del pedido). */
  unavailable: CartItem[];
  priceChanges: PriceChange[];
  total: number;
  /** true cuando no había catálogo disponible y se usó el snapshot del carrito tal cual. */
  fromSnapshot: boolean;
}

/**
 * Re-precia el carrito contra el catálogo vigente (`useProducts()` solo devuelve productos activos).
 * Si `products` es undefined (cargando / error) se conserva el snapshot del carrito.
 */
export const repriceItems = (items: CartItem[], products?: Product[] | null): RepriceResult => {
  if (!products) {
    return { items, unavailable: [], priceChanges: [], total: sumItems(items), fromSnapshot: true };
  }
  const byId = new Map(products.map((p) => [p.id, p]));
  const out: CartItem[] = [];
  const unavailable: CartItem[] = [];
  const priceChanges: PriceChange[] = [];
  for (const item of items) {
    const fresh = byId.get(item.product.id);
    if (!fresh) {
      unavailable.push(item);
      continue;
    }
    if (fresh.price !== item.product.price) {
      priceChanges.push({ name: fresh.name, oldPrice: item.product.price, newPrice: fresh.price });
    }
    out.push({ product: { ...item.product, ...fresh }, quantity: clampQty(item.quantity) });
  }
  return { items: out, unavailable, priceChanges, total: sumItems(out), fromSnapshot: false };
};

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  totalItems: () => number;
  totalPrice: () => number;
}

type PersistedCart = { items: CartItem[] };

const readPersistedItems = (persisted: unknown): CartItem[] =>
  sanitizeCartItems((persisted as Partial<PersistedCart> | undefined)?.items);

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.product.id === product.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id
                  ? { ...i, quantity: clampQty(i.quantity + quantity) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { product, quantity: clampQty(quantity) }] };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product.id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        if (!Number.isFinite(quantity) || quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.product.id === productId ? { ...i, quantity: clampQty(quantity) } : i
          ),
        }));
      },

      clearCart: () => set({ items: [] }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
      setCartOpen: (open) => set({ isOpen: open }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => sumItems(get().items),
    }),
    {
      name: 'delicias-cart',
      version: 2,
      partialize: (state): PersistedCart => ({ items: state.items }),
      // v0/v1 → v2: mismo esquema, pero validado (cantidades acotadas, entradas rotas fuera).
      migrate: (persisted): PersistedCart => ({ items: readPersistedItems(persisted) }),
      // También saneamos en cada hidratación por si alguien edita localStorage a mano.
      merge: (persisted, current) => ({ ...current, items: readPersistedItems(persisted) }),
    }
  )
);
