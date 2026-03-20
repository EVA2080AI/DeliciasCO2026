import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import heroImg from '@/assets/images/hero-pastel.jpg';
import pastelImg from '@/assets/images/pastel-real.jpg';
import cafeImg from '@/assets/images/cafe-premium.jpg';
import pandebonoImg from '@/assets/images/pan-de-bono.jpg';
import empanadaImg from '@/assets/images/empanada.jpg';
import jugoImg from '@/assets/images/jugo-natural.jpg';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeInWhenVisible, StaggerContainer, StaggerItem, CountUp } from '@/components/ScrollAnimations';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useSedes } from '@/hooks/useSedes';

const defaultHeroSlides = [
  {
    tag: 'Tradición desde 1985',
    title: 'El mejor pastel de pollo de Colombia',
    desc: 'Recetas artesanales transmitidas por generaciones. Horneado fresco cada mañana, con los mejores ingredientes colombianos.',
    cta: { to: '/menu', label: 'Pedir ahora' },
    cta2: { to: '/nosotros', label: 'Nuestra historia' },
  },
  {
    tag: 'Café de origen',
    title: 'El mejor café colombiano en cada taza',
    desc: 'Granos seleccionados del Huila y Nariño, tostados con pasión. Acompaña tu pastel favorito con un café excepcional.',
    cta: { to: '/menu?cat=cafeteria', label: 'Ver cafetería' },
    cta2: { to: '/sedes', label: 'Visítanos' },
  },
  {
    tag: 'Delicias artesanales',
    title: 'Pan de bono, almojábanas y más',
    desc: 'Las delicias colombianas que nos definen. Recetas auténticas del Valle, Boyacá y Bogotá en cada bocado.',
    cta: { to: '/menu?cat=delicias', label: 'Ver delicias' },
    cta2: { to: '/institucional', label: 'Pedidos empresariales' },
  },
];

const heroImages = [heroImg, cafeImg, pandebonoImg];
const sectionImages: Record<string, string> = {
  productos: pastelImg,
  cafeteria: cafeImg,
  delicias: pandebonoImg,
  empresas: empanadaImg,
  visitanos: jugoImg,
};

const defaultStats = [
  { value: 40, suffix: '+', label: 'Años de tradición' },
  { value: 60, suffix: '+', label: 'Productos artesanales' },
  { value: 2, suffix: '', label: 'Sedes en Bogotá' },
  { value: 10000, suffix: '+', label: 'Clientes felices' },
];

const Index = () => {
  const { data: products = [], isLoading } = useProducts();
  const featured = products.filter((p) => p.featured);
  const [slide, setSlide] = useState(0);
  usePageTitle();
  const { sections } = usePageSectionsMap('index');
  const { tiendas } = useSedes();

  // Hero slides from DB or defaults
  const heroSlides = useMemo(() => {
    const heroSection = sections.hero;
    if (heroSection?.metadata) {
      try {
        const meta = typeof heroSection.metadata === 'string' ? JSON.parse(heroSection.metadata) : heroSection.metadata;
        if (meta.slides && Array.isArray(meta.slides) && meta.slides.length > 0) return meta.slides;
      } catch { /* fall through */ }
    }
    return defaultHeroSlides;
  }, [sections.hero]);

  // Stats from DB or defaults
  const stats = useMemo(() => {
    const statsSection = sections.stats;
    if (statsSection?.metadata) {
      try {
        const meta = typeof statsSection.metadata === 'string' ? JSON.parse(statsSection.metadata) : statsSection.metadata;
        if (meta.items && Array.isArray(meta.items)) return meta.items;
      } catch { /* fall through */ }
    }
    return defaultStats;
  }, [sections.stats]);

  const next = useCallback(() => setSlide((s) => (s + 1) % heroSlides.length), [heroSlides.length]);
  const prev = useCallback(() => setSlide((s) => (s - 1 + heroSlides.length) % heroSlides.length), [heroSlides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const current = heroSlides[slide];
  const s = sections; // shorthand

  // Helper: check if section is active (default true if not in DB)
  const isActive = (key: string) => s[key]?.active !== false;

  return (
    <>
      {/* ====== HERO SLIDER ====== */}
      {isActive('hero') && (
        <section className="relative w-full bg-section-warm overflow-hidden">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[85vh]">
            <div className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 order-2 md:order-1 relative z-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
                    {current.tag}
                  </p>
                  <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl text-foreground leading-[1.08] mb-6">
                    {current.title}
                  </h1>
                  <p className="text-muted-foreground text-base md:text-lg max-w-md leading-relaxed mb-8">
                    {current.desc}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Link to={current.cta.to} className="btn-primary">{current.cta.label}</Link>
                    <Link to={current.cta2.to} className="btn-outline">{current.cta2.label}</Link>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center gap-4 mt-10">
                <button onClick={prev} className="w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground hover:text-background transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  {heroSlides.map((_: unknown, i: number) => (
                    <button
                      key={i}
                      onClick={() => setSlide(i)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === slide ? 'w-8 bg-primary' : 'w-3 bg-foreground/20'}`}
                    />
                  ))}
                </div>
                <button onClick={next} className="w-10 h-10 rounded-full border border-foreground/20 flex items-center justify-center hover:bg-foreground hover:text-background transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="relative min-h-[350px] md:min-h-0 order-1 md:order-2 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={slide}
                  src={current.img || heroImages[slide % heroImages.length]}
                  alt={current.title}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </AnimatePresence>
            </div>
          </div>
        </section>
      )}

      {/* ====== FOLD 2 - Nuestros productos (Dark bg) ====== */}
      {isActive('productos') && (
        <section className="w-full bg-section-dark">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <div className="relative min-h-[350px] md:min-h-0 overflow-hidden">
              <img src={s.productos?.image_url || sectionImages.productos} alt={s.productos?.title || ''} className="w-full h-full object-cover" />
            </div>
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <h2 className="font-display text-3xl md:text-4xl text-white leading-tight mb-4">
                {s.productos?.title || 'Más de 60 productos artesanales'}
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
                {s.productos?.content || 'Pasteles, empanadas, almojábanas, pan de bono, café premium colombiano y mucho más.'}
              </p>
              <div>
                <Link to={s.productos?.cta_link || '/menu'} className="btn-outline-light">
                  {s.productos?.cta_text || 'Ver menú completo'}
                </Link>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* ====== FOLD 3 - Cafetería ====== */}
      {isActive('cafeteria') && (
        <section className="w-full bg-section-cream">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 order-2 md:order-1">
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-4">
                {s.cafeteria?.title || 'Café colombiano de origen'}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-md">
                {s.cafeteria?.content || 'Granos seleccionados del Huila y Nariño.'}
              </p>
              <div>
                <Link to={s.cafeteria?.cta_link || '/menu?cat=cafeteria'} className="btn-primary">
                  {s.cafeteria?.cta_text || 'Descubrir cafetería'}
                </Link>
              </div>
            </FadeInWhenVisible>
            <div className="relative min-h-[350px] md:min-h-0 overflow-hidden order-1 md:order-2">
              <img src={s.cafeteria?.image_url || sectionImages.cafeteria} alt={s.cafeteria?.title || ''} className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* ====== FOLD 4 - Delicias (Terracotta) ====== */}
      {isActive('delicias') && (
        <section className="w-full bg-section-terracotta">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <div className="relative min-h-[350px] md:min-h-0 overflow-hidden">
              <img src={s.delicias?.image_url || sectionImages.delicias} alt={s.delicias?.title || ''} className="w-full h-full object-cover" />
            </div>
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <h2 className="font-display text-3xl md:text-4xl text-primary-foreground leading-tight mb-4">
                {s.delicias?.title || 'Pan de bono, almojábanas y más'}
              </h2>
              <p className="text-primary-foreground/70 text-base leading-relaxed mb-8 max-w-md">
                {s.delicias?.content || 'Las delicias colombianas que nos definen.'}
              </p>
              <div>
                <Link to={s.delicias?.cta_link || '/menu?cat=delicias'} className="btn-outline-light">
                  {s.delicias?.cta_text || 'Explorar delicias'}
                </Link>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* ====== FEATURED PRODUCTS ====== */}
      {isActive('featured') && (
        <section className="w-full py-20 bg-background">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <FadeInWhenVisible>
              <div className="text-center mb-14">
                <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  {s.featured?.title || 'Los favoritos de nuestros clientes'}
                </h2>
                <p className="text-muted-foreground text-base max-w-lg mx-auto">
                  {s.featured?.content || 'Más de 40 años perfeccionando estas recetas.'}
                </p>
              </div>
            </FadeInWhenVisible>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden border bg-card">
                    <Skeleton className="aspect-[4/3] w-full" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-5 w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.1}>
                {featured.map((p) => (
                  <StaggerItem key={p.id}>
                    <ProductCard product={p} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
            <FadeInWhenVisible className="text-center mt-12">
              <Link to={s.featured?.cta_link || '/menu'} className="btn-outline gap-2">
                {s.featured?.cta_text || 'Ver menú completo'} <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* ====== Empresas (Dark bg) ====== */}
      {isActive('empresas') && (
        <section className="w-full bg-section-dark">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 order-2 md:order-1">
              <h2 className="font-display text-3xl md:text-4xl text-white leading-tight mb-4">
                {s.empresas?.title || '¿Pedidos para tu empresa?'}
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
                {s.empresas?.content || 'Desayunos corporativos, eventos y catering.'}
              </p>
              <div>
                <Link to={s.empresas?.cta_link || '/institucional'} className="btn-outline-light">
                  {s.empresas?.cta_text || 'Cotizar ahora'}
                </Link>
              </div>
            </FadeInWhenVisible>
            <div className="relative min-h-[350px] md:min-h-0 overflow-hidden order-1 md:order-2">
              <img src={s.empresas?.image_url || sectionImages.empresas} alt={s.empresas?.title || ''} className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* ====== STATS ====== */}
      {isActive('stats') && (
        <section className="w-full bg-section-cream py-16">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {stats.map((stat: { value: number; suffix: string; label: string }) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl md:text-4xl font-bold text-primary">
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ====== Visítanos ====== */}
      {isActive('visitanos') && (
        <section className="w-full bg-section-warm">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <div className="relative min-h-[350px] md:min-h-0 overflow-hidden">
              <img src={s.visitanos?.image_url || sectionImages.visitanos} alt={s.visitanos?.title || ''} className="w-full h-full object-cover" />
            </div>
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-4">
                {s.visitanos?.title || 'Visítanos en nuestras sedes'}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed mb-4 max-w-md">
                {s.visitanos?.content || 'Dos ubicaciones en Bogotá para que disfrutes la experiencia.'}
              </p>
              <ul className="space-y-2 mb-8 text-sm text-foreground/80">
                {tiendas.map((sede) => (
                  <li key={sede.id} className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" /> {sede.name} — {sede.hours}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3">
                <Link to={s.visitanos?.cta_link || '/sedes'} className="btn-primary">
                  {s.visitanos?.cta_text || 'Ver ubicaciones'}
                </Link>
                <Link to="/preguntas-frecuentes" className="btn-outline">Preguntas frecuentes</Link>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* ====== BLOG ====== */}
      {isActive('blog') && <BlogSection sections={s} />}
    </>
  );
};

const fallbackPosts = [
  { title: 'Huyendo del conflicto armado: cómo nació Delicias Colombianas', category: 'Historia', slug: 'origen-conflicto-armado-familia-pastelera' },
  { title: 'El secreto de nuestro Pastel de Pollo', category: 'Recetas', slug: 'secreto-pastel-pollo' },
  { title: 'Receta del pastel de pollo colombiano paso a paso', category: 'Recetas', slug: 'receta-pastel-pollo-colombiano' },
];

const BlogSection = ({ sections: s }: { sections: Record<string, any> }) => {
  const { data: dbPosts } = useQuery({
    queryKey: ['blog-posts-home'],
    queryFn: async () => {
      const { data } = await supabase
        .from('blog_posts')
        .select('title, slug, category')
        .eq('published', true)
        .order('published_at', { ascending: false })
        .limit(3);
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const posts = (dbPosts && dbPosts.length > 0) ? dbPosts : fallbackPosts;

  return (
    <section className="w-full py-20 bg-background">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
        <FadeInWhenVisible>
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
              {s.blog?.title || 'Recetas, historia y tradición'}
            </h2>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              {s.blog?.content || 'Descubre los secretos de la cocina colombiana.'}
            </p>
          </div>
        </FadeInWhenVisible>
        <StaggerContainer className="grid grid-cols-1 md:grid-cols-3 gap-8" staggerDelay={0.1}>
          {posts.map((post) => (
            <StaggerItem key={post.slug}>
              <Link to={`/blog/${post.slug}`} className="group block p-8 rounded-2xl bg-section-cream hover:shadow-elevated transition-all duration-300">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">{post.category}</span>
                <h3 className="font-display text-xl mt-3 group-hover:text-primary transition-colors leading-snug">{post.title}</h3>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground/70 mt-4 group-hover:gap-2.5 transition-all">
                  Leer más <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
};

export default Index;
