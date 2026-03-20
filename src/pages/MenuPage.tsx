import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSearchParams, Link } from 'react-router-dom';
import { UtensilsCrossed, Coffee, GlassWater, Cookie, Package, LayoutGrid, CalendarDays, Store, ChevronRight } from 'lucide-react';
import { categories } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
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

const MenuPage = () => {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get('cat') || 'all';
  usePageTitle('Menú');
  const [activeCategory, setActiveCategory] = useState(initialCat);
  const { data: products = [], isLoading } = useProducts();
  const { sections: s } = usePageSectionsMap('menu');

  const filtered =
    activeCategory === 'all'
      ? products
      : products.filter((p) => p.category === activeCategory);

  const groupedByCategory = activeCategory === 'all'
    ? categories.filter(c => c.id !== 'all').map(cat => ({
        ...cat,
        products: products.filter(p => p.category === cat.id),
      })).filter(g => g.products.length > 0)
    : null;

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
            <nav className="space-y-1">
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.id] || UtensilsCrossed;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeCategory === cat.id
                        ? 'bg-foreground text-background'
                        : 'text-foreground/60 hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {cat.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* Mobile pills */}
          <div className="flex-1 min-w-0">
            <div className="lg:hidden sticky top-[72px] z-30 bg-background border-b px-4 py-3 overflow-x-auto">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => {
                  const Icon = categoryIcons[cat.id] || UtensilsCrossed;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${
                        activeCategory === cat.id
                          ? 'bg-foreground text-background'
                          : 'text-foreground/60 hover:text-foreground border hover:bg-secondary'
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
              {isLoading ? (
                <SkeletonGrid count={9} />
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
                            onClick={() => setActiveCategory(group.id)}
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
                </div>
              ) : (
                /* Filtered view */
                <>
                  <StaggerContainer
                    key={activeCategory}
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
                    <p className="text-center text-muted-foreground py-20">No hay productos en esta categoría.</p>
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
