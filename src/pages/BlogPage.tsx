import { Link } from 'react-router-dom';
import { SafeImage } from '@/components/ThumbImage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { Skeleton } from '@/components/ui/skeleton';
import heroImg from '@/assets/images/hero-pastel.webp';
import pastelPolloImg from '@/assets/images/pastel-pollo.webp';
import pastelCarneImg from '@/assets/images/pastel-carne.webp';
import empanadaImg from '@/assets/images/empanada.webp';
import cafePremiumImg from '@/assets/images/cafe-premium.webp';
import panDeBonoImg from '@/assets/images/pan-de-bono.webp';
import almojabanaImg from '@/assets/images/almojabana.webp';
import chocolateImg from '@/assets/images/chocolate-queso.webp';
import pastelRealImg from '@/assets/images/pastel-real.webp';

// Fallback images by blog slug for congruent visuals
const blogImageMap: Record<string, string> = {
  'secreto-pastel-pollo': pastelRealImg,
  'receta-pastel-pollo-colombiano': pastelPolloImg,
  'pastel-pollo-eventos-bogota': pastelRealImg,
  'primer-pastel-1985': pastelRealImg,
  'empanada-colombiana-perfecta': empanadaImg,
  'cafe-colombiano-origen': cafePremiumImg,
  'cafe-colombiano-preparacion': cafePremiumImg,
  'pandebono-valle-del-cauca': panDeBonoImg,
  'almojabana-tradicion-boyacense': almojabanaImg,
  'origen-conflicto-armado-familia-pastelera': heroImg,
  'primer-pastel-pollo-1985': pastelRealImg,
  'historia-pasteleria-colombiana': pastelCarneImg,
  'mejores-pastelerias-bogota': chocolateImg,
};

const getBlogImage = (post: { slug: string; image_url: string | null }) =>
  post.image_url || blogImageMap[post.slug] || heroImg;

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image_url: string | null;
  read_time: string | null;
  published_at: string | null;
  created_at: string;
}

/** "25 ago 2026 · 5 min" — sin el separador cuando el post no tiene tiempo de lectura. */
const postMeta = (post: Pick<BlogPost, 'published_at' | 'created_at' | 'read_time'>) => {
  const date = formatDate(post.published_at || post.created_at);
  const readTime = (post.read_time || '').trim();
  return readTime ? `${date} · ${readTime}` : date;
};

const categoryLabels: Record<string, string> = {
  recetas: 'Recetas',
  historia: 'Historia',
  tips: 'Tips',
  noticias: 'Noticias',
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

const BlogPage = () => {
  usePageTitle('Blog');
  const { data: posts, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        // Posts publicados sin fecha van al final (por defecto Postgres pone los NULL primero en DESC).
        .order('published_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  if (isError) {
    return (
      <section className="w-full bg-section-warm py-24 text-center">
        <div className="max-w-[1440px] mx-auto px-6">
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">Blog</h1>
          <p className="text-muted-foreground mb-2">No pudimos cargar los artículos en este momento.</p>
          <p className="text-xs text-muted-foreground/70 mb-6">{error instanceof Error ? error.message : 'Error de conexión'}</p>
          <button onClick={() => refetch()} disabled={isFetching} className="btn-primary disabled:opacity-60">
            {isFetching ? 'Reintentando…' : 'Reintentar'}
          </button>
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <>
        <section className="w-full bg-section-warm py-16">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <Skeleton className="h-10 w-64 mx-auto mb-4" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
        </section>
        <section className="w-full py-16 bg-background">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden bg-card">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="p-6 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <section className="w-full bg-section-warm py-24 text-center">
        <div className="max-w-[1440px] mx-auto px-6">
          <h1 className="font-display text-4xl md:text-5xl text-foreground mb-4">Blog</h1>
          <p className="text-muted-foreground">Próximamente publicaremos artículos sobre recetas, historia y tradición.</p>
        </div>
      </section>
    );
  }

  const [first, ...rest] = posts;

  return (
    <>
      {/* Hero - Featured post */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
          <div className="relative min-h-[300px] md:min-h-0 overflow-hidden">
            <SafeImage src={getBlogImage(first)} alt={first.title} className="w-full h-full object-cover" priority />
          </div>
          <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {categoryLabels[first.category] || first.category}
            </span>
            <h1 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-4">
              {first.title}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-4">{first.excerpt}</p>
            <p className="text-xs text-muted-foreground/60 mb-6">{postMeta(first)}</p>
            <div>
              <Link to={`/blog/${first.slug}`} className="btn-primary gap-2">
                Leer artículo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Grid */}
      {rest.length > 0 && (
        <section className="w-full py-16 bg-background">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <FadeInWhenVisible>
              <h2 className="font-display text-3xl text-foreground mb-10">Más artículos</h2>
            </FadeInWhenVisible>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.06}>
              {rest.map((post) => (
                <StaggerItem key={post.slug}>
                  <Link to={`/blog/${post.slug}`} className="group block h-full">
                    <div className="rounded-2xl overflow-hidden bg-section-cream h-full flex flex-col transition-all duration-300 hover:shadow-elevated">
                      <div className="aspect-[16/10] overflow-hidden bg-secondary">
                          <SafeImage
                            src={getBlogImage(post)}
                            alt={post.title}
                            width={800}
                            height={500}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">
                          {categoryLabels[post.category] || post.category}
                        </span>
                        <h3 className="font-display text-lg group-hover:text-primary transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed flex-1">{post.excerpt}</p>
                        <p className="text-xs text-muted-foreground/50 mt-3">{postMeta(post)}</p>
                      </div>
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </>
  );
};

export default BlogPage;
