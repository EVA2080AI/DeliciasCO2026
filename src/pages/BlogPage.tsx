import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { Skeleton } from '@/components/ui/skeleton';
import heroImg from '@/assets/images/hero-pastel.jpg';
import pastelPolloImg from '@/assets/images/products/pastel-pollo.jpg';
import pastelCarneImg from '@/assets/images/products/pastel-carne.jpg';
import empanadaImg from '@/assets/images/products/empanada.jpg';
import cafePremiumImg from '@/assets/images/products/cafe-premium.jpg';
import panDeBonoImg from '@/assets/images/products/pan-de-bono.jpg';
import almojabanaImg from '@/assets/images/products/almojabana.jpg';
import chocolateImg from '@/assets/images/products/chocolate-queso.jpg';
import pastelRealImg from '@/assets/images/pastel-real.jpg';

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
  read_time: string;
  published_at: string | null;
  created_at: string;
}

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
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
    staleTime: 1000 * 60 * 5,
  });

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
            <img src={getBlogImage(first)} alt={first.title} className="w-full h-full object-cover" />
          </div>
          <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {categoryLabels[first.category] || first.category}
            </span>
            <h1 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-4">
              {first.title}
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed mb-4">{first.excerpt}</p>
            <p className="text-xs text-muted-foreground/60 mb-6">
              {first.published_at ? formatDate(first.published_at) : formatDate(first.created_at)} · {first.read_time}
            </p>
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
                          <img
                            src={getBlogImage(post)}
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            loading="lazy"
                          />
                      </div>
                      <div className="p-6 flex flex-col flex-1">
                        <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary mb-2">
                          {categoryLabels[post.category] || post.category}
                        </span>
                        <h3 className="font-display text-lg group-hover:text-primary transition-colors line-clamp-2 leading-snug">{post.title}</h3>
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2 leading-relaxed flex-1">{post.excerpt}</p>
                        <p className="text-xs text-muted-foreground/50 mt-3">
                          {post.published_at ? formatDate(post.published_at) : formatDate(post.created_at)} · {post.read_time}
                        </p>
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
