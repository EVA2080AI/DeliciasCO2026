import { MapPin, Clock, Phone, MessageCircle, Users, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSedes, type Sede } from '@/hooks/useSedes';

const iconMap: Record<string, typeof Users> = {
  tienda: Users,
};

const SedesPage = () => {
  const { sections: s } = usePageSectionsMap('sedes');
  const { sedes, isLoading } = useSedes();
  usePageTitle('Sedes');

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 md:py-24 text-center">
          <FadeInWhenVisible>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {s.hero?.subtitle || 'Visítanos'}
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
              {s.hero?.title || 'Nuestras sedes'}
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              {s.hero?.content || `${sedes.length > 0 ? sedes.length : 'Nuestras'} ubicaciones en Bogotá para vivir la experiencia Delicias Colombianas.`}
            </p>
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="w-full py-12 bg-background">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl bg-section-cream h-80 animate-pulse" />
              ))}
            </div>
          ) : (
            <StaggerContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.15}>
              {sedes.map((sede) => {
                const Icon = iconMap[sede.type] || Users;
                return (
                  <StaggerItem key={sede.id}>
                    <div className="rounded-2xl overflow-hidden bg-section-cream h-full flex flex-col">
                      <div className="aspect-video relative bg-card border-b flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                        </div>
                        <iframe
                          src={sede.mapEmbed}
                          className="w-full h-full border-0 relative z-10"
                          loading="lazy"
                          title={sede.name}
                          allowFullScreen
                          // Using CSS trick to hide while not loaded if we wanted, but loading="lazy" works best when just leaving it.
                        />
                      </div>
                      <div className="p-8 space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h2 className="font-display text-xl">{sede.name}</h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              Punto de venta
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2.5 flex-1">
                          <p className="flex items-start gap-3 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" /> {sede.address}
                          </p>
                          <p className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 shrink-0 text-primary" /> {sede.hours}
                          </p>
                          <p className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Phone className="w-4 h-4 shrink-0 text-primary" /> {sede.phone}
                          </p>
                        </div>
                        <motion.a
                          whileTap={{ scale: 0.97 }}
                          href={`https://wa.me/${sede.whatsapp}?text=${encodeURIComponent(
                            'Hola, quiero hacer un pedido en ' + sede.name
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary inline-flex mt-2"
                        >
                          <><MessageCircle className="w-4 h-4" /> Escribir por WhatsApp</>
                        </motion.a>
                        {sede.email && (
                          <div className="mt-3 pt-3 border-t">
                            <a href={`mailto:${sede.email}`} className="text-xs text-muted-foreground hover:text-foreground hover:underline">
                              {sede.email}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          )}
        </div>
      </section>
    </>
  );
};

export default SedesPage;
