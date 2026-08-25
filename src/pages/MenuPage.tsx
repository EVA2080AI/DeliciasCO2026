import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParams, Link } from 'react-router-dom';
import {
  UtensilsCrossed, Coffee, GlassWater, Cookie, Package, LayoutGrid, CalendarDays, Store, ChevronRight, Search, X, AlertTriangle, RefreshCw,
} from 'lucide-react';
import { categories } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import type { Product } from '@/store/cartStore';
import ProductCard from '@/components/ProductCard';
import { SkeletonGrid } from '@/components/ui/SkeletonCard';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { usePageSectionsMap } from '@/hooks/usePageSections';

const categoryIcons: Record<string, React.ElementType> = {
  all: LayoutGrid,
  pasteleria: UtensilsCrossed,
  pies: UtensilsCrossed,
  cafeteria: Coffee,
  bebidas: GlassWater,
  delicias: Cookie,
  combos: Package,
};

/** Minúsculas y sin acentos: "Pastel de Pollo" y "pastel de pollo" / "almojábana" y "almojabana" coinciden. */
const normalizeText = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

const matchesQuery = (p: Product, q: string) =>
  normalizeText(p.name).includes(q) || normalizeText(p.description ?? '').includes(q);

const MenuPage = () => {
  // Categoría y búsqueda viven en la URL: los enlaces del footer (/menu?cat=x) funcionan estando ya
  // en /menu, y el botón Atrás del navegador vuelve a la categoría anterior.
  const [searchParams, setSearchParams] = useSearchParams();
  const catParam = searchParams.get('cat') || 'all';
  const activeCategory = categories.some((c) => c.id === catParam) ? catParam : 'all';
  const query = searchParams.get('q') ?? '';
  const normalizedQuery = normalizeText(query);

  usePageTitle('Menú');
  const { data: products = [], isLoading, isError, refetch, isFetching } = useProducts();
  const { sections: s } = usePageSectionsMap('menu');

  const setCategory = (id: string) => {
    const next = new URLSearchParams(searchParams);
    if (id === 'all') next.delete('cat');
    else next.set('cat', id);
    setSearchParams(next);
  };

  const setQuery = (q: string) => {
    const next = new URLSearchParams(searchParams);
    if (q) next.set('q', q);
    else next.delete('q');
    // replace: cada tecla no debe crear una entrada en el historial.
    setSearchParams(next, { replace: true });
  };

  const inCategory = activeCategory === 'all' ? products : products.filter((p) => p.category === activeCategory);
  const filtered = normalizedQuery ? inCategory.filter((p) => matchesQuery(p, normalizedQuery)) : inCategory;

  const groupedByCategory =
    activeCategory === 'all' && !normalizedQuery
      ? categories
          .filter((c) => c.id !== 'all')
          .map((cat) => ({ ...cat, products: products.filter((p) => p.category === cat.id) }))
          .filter((g) => g.products.length > 0)
      : null;

  const activeLabel = categories.find((c) => c.id === activeCategory)?.label ?? 'Todos';

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-14 md:py-20 text-center">
          <FadeInWhenVisible>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-3">
              {s.hero?.subtitle || 'Menú'}
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
              {s.hero?.title || 'Nuestros productos'}
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              {s.hero?.content || 'Tradición artesanal en cada producto que sale de nuestro horno, preparado fresco cada día.'}
            </p>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* CTA Banner: Fecha de pedido */}
      <section className="w-full border-b bg-secondary/60">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-3.5 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5 text-sm text-foreground/80">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span>Pedido para <strong>hoy, {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}</strong> · Puedes cambiar la fecha en el checkout</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/checkout"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Store className="w-3.5 h-3.5" /> Ir al checkout
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Starbucks-style layout: sidebar + grid */}
      <section className="w-full bg-background">
        <div className="max-w-[1440px] mx-auto flex">
          {/* Sidebar - Desktop */}
          <aside className="hidden lg:block w-[260px] shrink-0 border-r sticky top-[72px] self-start h-[calc(100vh-72px)] overflow-y-auto py-8 px-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Categorías</p>
            <nav className="space-y-1" aria-label="Categorías">
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.id] || UtensilsCrossed;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    aria-current={active ? 'true' : undefined}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      active ? 'bg-foreground text-background' : 'text-foreground/60 hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {cat.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Mobile pills */}
            <div className="lg:hidden sticky top-[72px] z-30 bg-background border-b px-4 py-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => {
                  const Icon = categoryIcons[cat.id] || UtensilsCrossed;
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      aria-current={active ? 'true' : undefined}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${
                        active ? 'bg-foreground text-background' : 'text-foreground/60 hover:text-foreground border hover:bg-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="px-6 lg:px-10 py-10">
              {/* Buscador */}
              <div className="relative max-w-md mb-8">
                <label htmlFor="menu-search" className="sr-only">Buscar producto</label>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                <input
                  id="menu-search"
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar producto…"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="w-full pl-11 pr-11 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all [&::-webkit-search-cancel-button]:appearance-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    aria-label="Limpiar búsqueda"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isLoading ? (
                <SkeletonGrid count={9} />
              ) : isError ? (
                <div role="alert" className="max-w-md mx-auto text-center py-16">
                  <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <h2 className="font-display text-2xl mb-2">No pudimos cargar el menú</h2>
                  <p className="text-sm text-muted-foreground mb-6">Revisa tu conexión e inténtalo de nuevo.</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    disabled={isFetching}
                    className="btn-primary inline-flex disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} /> Reintentar
                  </button>
                </div>
              ) : groupedByCategory ? (
                /* "All" view - grouped by category */
                <div className="space-y-14">
                  {groupedByCategory.map((group) => {
                    const Icon = categoryIcons[group.id] || UtensilsCrossed;
                    return (
                      <div key={group.id}>
                        <div className="flex items-center gap-3 mb-6">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <h2 className="font-display text-2xl md:text-3xl text-foreground">{group.label}</h2>
                          <button
                            type="button"
                            onClick={() => setCategory(group.id)}
                            className="ml-auto text-sm font-semibold text-primary hover:underline"
                          >
                            Ver todos →
                          </button>
                        </div>
                        <StaggerContainer
                          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                          staggerDelay={0.05}
                        >
                          {group.products.slice(0, 3).map((p) => (
                            <StaggerItem key={p.id}>
                              <ProductCard product={p} />
                            </StaggerItem>
                          ))}
                        </StaggerContainer>
                      </div>
                    );
                  })}
                  {groupedByCategory.length === 0 && (
                    <p className="text-center text-muted-foreground py-20">Pronto tendremos productos disponibles.</p>
                  )}
                </div>
              ) : (
                /* Filtered view (category and/or search) */
                <>
                  {normalizedQuery && (
                    <p className="text-sm text-muted-foreground mb-6" aria-live="polite">
                      {filtered.length === 0 ? 'Sin resultados' : `${filtered.length} resultado${filtered.length === 1 ? '' : 's'}`} para{' '}
                      <strong className="text-foreground">“{query.trim()}”</strong>
                      {activeCategory !== 'all' && <> en {activeLabel}</>}
                    </p>
                  )}

                  <StaggerContainer
                    key={`${activeCategory}-${normalizedQuery}`}
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6"
                    staggerDelay={0.05}
                  >
                    {filtered.map((p) => (
                      <StaggerItem key={p.id}>
                        <ProductCard product={p} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>

                  {filtered.length === 0 && (
                    <div className="text-center text-muted-foreground py-20">
                      {normalizedQuery ? (
                        <>
                          <p className="mb-4">No encontramos productos para “{query.trim()}”.</p>
                          <div className="flex flex-wrap justify-center gap-3">
                            <button type="button" onClick={() => setQuery('')} className="btn-outline inline-flex">Limpiar búsqueda</button>
                            {activeCategory !== 'all' && (
                              <button type="button" onClick={() => setCategory('all')} className="btn-primary inline-flex">Buscar en todo el menú</button>
                            )}
                          </div>
                        </>
                      ) : (
                        <p>No hay productos en esta categoría.</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default MenuPage;
