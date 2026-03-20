import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowRight, HandHeart, Leaf, Heart, Briefcase, GraduationCap, ChefHat } from 'lucide-react';
import { FadeInWhenVisible, StaggerContainer, StaggerItem, CountUp } from '@/components/ScrollAnimations';
import heroImg from '@/assets/images/hero-pastel.jpg';
import empanadaImg from '@/assets/images/empanada.jpg';
import pastelImg from '@/assets/images/pastel-carne.jpg';
import cafeImg from '@/assets/images/cafe-premium.jpg';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useMemo } from 'react';

const defaultValues = [
  { icon: HandHeart, title: 'Artesanal 100%', desc: 'Cada producto hecho a mano con recetas familiares transmitidas por generaciones. Nunca industrializado.' },
  { icon: Leaf, title: 'Ingredientes frescos', desc: 'Sin conservantes ni procesados. Todo se prepara diariamente con ingredientes colombianos de primera calidad.' },
  { icon: Heart, title: 'Raíces campesinas', desc: 'Nuestras recetas nacieron en el Caquetá y se perfeccionaron en Bogotá. Cada bocado lleva la esencia de la tradición colombiana.' },
];

const milestoneIcons = [Briefcase, Heart, GraduationCap, ChefHat];

const NosotrosPage = () => {
  const { sections: s } = usePageSectionsMap('nosotros');
  usePageTitle('Nuestra Historia');

  const isActive = (key: string) => s[key]?.active !== false;

  const valores = useMemo(() => {
    try {
      const meta = s.valores?.metadata;
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
    } catch { /* fall through */ }
    return defaultValues;
  }, [s.valores]);

  const milestones = useMemo(() => {
    try {
      const meta = s.disciplina?.metadata;
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      if (parsed?.milestones && Array.isArray(parsed.milestones)) return parsed.milestones;
    } catch { /* fall through */ }
    return [
      { title: 'Primeros Pasos', desc: 'Su primer empleo remunerado fue como mensajero en una zapatería.' },
      { title: 'Esfuerzo Físico', desc: 'Trabajó como ayudante de obra cargando ladrillos y realizando mezclas.' },
      { title: 'Formación Profesional', desc: 'Logró estudiar Ingeniería Electrónica en la Universidad Antonio Nariño.' },
      { title: 'Experiencia Comercial', desc: 'Trabajó en ventas en el entonces naciente negocio Foto Japón.' },
    ];
  }, [s.disciplina]);

  const paragraph2Origen = useMemo(() => {
    try {
      const meta = s.origen?.metadata;
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      return parsed?.paragraph2 || '';
    } catch { return ''; }
  }, [s.origen]);

  const paragraph2Promesa = useMemo(() => {
    try {
      const meta = s.promesa?.metadata;
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      return parsed?.paragraph2 || '';
    } catch { return ''; }
  }, [s.promesa]);

  const statsItems = useMemo(() => {
    try {
      const meta = s.stats?.metadata;
      const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
      if (parsed?.items && Array.isArray(parsed.items)) return parsed.items;
    } catch { /* fall through */ }
    return [
      { value: 40, suffix: '+', label: 'Años de tradición' },
      { value: 60, suffix: '+', label: 'Productos artesanales' },
      { value: 2, suffix: '', label: 'Sedes en Bogotá' },
      { value: 10000, suffix: '+', label: 'Clientes felices' },
    ];
  }, [s.stats]);

  return (
    <>
      {/* Hero */}
      {isActive('hero') && (
        <section className="w-full bg-section-dark">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[70vh]">
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 order-2 md:order-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
                {s.hero?.subtitle || 'Nuestra Historia'}
              </p>
              <h1 className="font-display text-4xl md:text-5xl text-white leading-tight mb-6">
                {s.hero?.title || '¿Quién está detrás del pastel de pollo más famoso de Bogotá?'}
              </h1>
              <p className="text-white/60 text-base leading-relaxed max-w-md mb-8">
                {s.hero?.content || 'Esta es la historia de Arbey Cabrera...'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={s.hero?.cta_link || '/menu'} className="btn-outline-light gap-2">
                  {s.hero?.cta_text || 'Conoce nuestro menú'} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </FadeInWhenVisible>
            <div className="relative min-h-[350px] md:min-h-0 order-1 md:order-2">
              <img src={s.hero?.image_url || heroImg} alt="Fundador de Delicias Colombianas" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* El origen */}
      {isActive('origen') && (
        <section className="w-full bg-section-cream">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <div className="relative min-h-[350px] md:min-h-0">
              <img src={s.origen?.image_url || empanadaImg} alt="Tradición familiar" className="w-full h-full object-cover" />
            </div>
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
                {s.origen?.subtitle || 'Un Comienzo Forjado en la Resiliencia'}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-6">
                {s.origen?.title || 'María Obdulia Zapata: el coraje de una madre'}
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed max-w-md">
                <p>{s.origen?.content || 'Todo comenzó en la década de 1980 en Florencia, Caquetá. Tras la pérdida de nuestro padre por la violencia del conflicto armado, nuestra madre, María Obdulia Zapata, con 8 hijos a cargo, nos enseñó el valor del trabajo duro marcando el inicio de nuestra tradición repostera.'}</p>
                <p>{paragraph2Origen || 'Con este espíritu de supervivencia y recetas caseras inigualables, plantamos la semilla de lo que hoy es Delicias Colombianas.'}</p>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* La disciplina */}
      {isActive('disciplina') && (
        <section className="w-full bg-section-warm">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24 order-2 md:order-1">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
                {s.disciplina?.subtitle || 'Disciplina y Esfuerzo'}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-6">
                {s.disciplina?.title || 'La disciplina de un emprendedor'}
              </h2>
              <p className="text-muted-foreground text-base leading-relaxed max-w-md mb-6">
                {s.disciplina?.content || 'El camino no fue fácil. Arbey Cabrera forjó su carácter desde muy joven trabajando incansablemente, demostrando que con tenacidad cualquier sueño es posible.'}
              </p>
              <div className="space-y-4 max-w-md">
                {milestones.map((item: { title: string; desc: string }, idx: number) => {
                  const Icon = milestoneIcons[idx % milestoneIcons.length];
                  return (
                    <div key={item.title} className="flex gap-4 items-start">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                        <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </FadeInWhenVisible>
            <div className="relative min-h-[350px] md:min-h-0 order-1 md:order-2">
              <img src={s.disciplina?.image_url || pastelImg} alt="Emprendedor colombiano" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}

      {/* De la ingeniería al hojaldre */}
      {isActive('ingenieria') && (
        <section className="w-full bg-background">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
            <div className="relative min-h-[350px] md:min-h-0">
              <img src={s.ingenieria?.image_url || cafeImg} alt="Panadería" className="w-full h-full object-cover" />
            </div>
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
                {s.ingenieria?.subtitle || 'El Giro Definitivo'}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-foreground leading-tight mb-6">
                {s.ingenieria?.title || 'De la ingeniería al corazón del hojaldre'}
              </h2>
              <div className="space-y-4 text-muted-foreground text-base leading-relaxed max-w-md">
                <p>{s.ingenieria?.content || 'A pesar de haberse graduado como Ingeniero Electrónico, el llamado de la tradición familiar y su visión lo llevaron a transformar sus conocimientos técnicos en un proceso artesanal estandarizado, garantizando sabor y calidad inigualables.'}</p>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* Nuestra Promesa */}
      {isActive('promesa') && (
        <section className="w-full bg-section-dark">
          <div className="max-w-[1440px] mx-auto px-8 py-20 md:px-16 lg:px-24 text-center">
            <FadeInWhenVisible>
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4 block">
                {s.promesa?.subtitle || 'Nuestra Promesa'}
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-white leading-tight mb-6 max-w-3xl mx-auto">
                {s.promesa?.title || 'Ofrecerte lo MEJOR!'}
              </h2>
              <p className="text-white/60 text-base leading-relaxed max-w-2xl mx-auto mb-4">
                {s.promesa?.content || 'Nuestra misión es simple pero poderosa: entregarte el mejor pastel de pollo de Colombia, horneado diariamente con ingredientes frescos, 100% artesanales y el amor de una familia resiliente.'}
              </p>
              <p className="text-white/50 text-base leading-relaxed max-w-2xl mx-auto">
                {paragraph2Promesa || 'Cada vez que nos visitas, no solo estás disfrutando de una comida; estás apoyando una historia de superación y tradición que sigue viva en cada bocado.'}
              </p>
            </FadeInWhenVisible>
          </div>
        </section>
      )}

      {/* Valores */}
      {isActive('valores') && (
        <section className="w-full py-20 bg-section-cream">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <FadeInWhenVisible>
              <div className="text-center mb-14">
                <h2 className="font-display text-3xl md:text-4xl text-foreground mb-3">
                  {s.valores?.title || 'Lo que nos define'}
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {s.valores?.content || 'Los mismos valores que forjaron esta historia.'}
                </p>
              </div>
            </FadeInWhenVisible>
            <StaggerContainer className="grid sm:grid-cols-3 gap-8" staggerDelay={0.1}>
              {valores.map((item: { icon?: React.ElementType; title: string; desc: string }, idx: number) => {
                const Icon = item.icon || [HandHeart, Leaf, Heart][idx % 3];
                return (
                  <StaggerItem key={item.title}>
                    <div className="text-center p-8 rounded-2xl bg-background">
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className="font-display text-xl mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </div>
        </section>
      )}

      {/* Stats */}
      {isActive('stats') && (
        <section className="w-full bg-section-terracotta py-20">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {statsItems.map((stat: { value: number; suffix: string; label: string }) => (
                <div key={stat.label}>
                  <p className="font-display text-3xl md:text-4xl font-bold text-primary-foreground">
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="text-sm text-primary-foreground/70 mt-2">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {isActive('cta') && (
        <section className="w-full bg-section-dark">
          <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[400px]">
            <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
              <h2 className="font-display text-3xl md:text-4xl text-white leading-tight mb-4">
                {s.cta?.title || 'Conoce más en nuestro blog'}
              </h2>
              <p className="text-white/60 text-base leading-relaxed mb-8 max-w-md">
                {s.cta?.content || 'Recetas tradicionales y la historia de la pastelería colombiana.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to={s.cta?.cta_link || '/blog'} className="btn-outline-light gap-2">
                  {s.cta?.cta_text || 'Ir al blog'} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/menu" className="btn-outline-light">Ver menú</Link>
              </div>
            </FadeInWhenVisible>
            <div className="relative min-h-[300px] md:min-h-0">
              <img src={s.cta?.image_url || heroImg} alt="Blog" className="w-full h-full object-cover" />
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default NosotrosPage;
