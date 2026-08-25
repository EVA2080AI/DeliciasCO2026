import { MapPin, Clock, Phone, MessageCircle, Users, Loader2, Navigation, Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSedes, type Sede } from '@/hooks/useSedes';
import { buildWaUrl } from '@/lib/whatsapp';

const iconMap: Record<Sede['type'], typeof Users> = {
  tienda: Users,
  administrativa: Building2,
};

const directionsUrl = (address: string) =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;

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
                const phoneHref = sede.phone ? `tel:${sede.phone.replace(/\s/g, '')}` : '';
                return (
                  <StaggerItem key={sede.id}>
                    <div className="rounded-2xl overflow-hidden bg-section-cream h-full flex flex-col">
                      <div className="aspect-video relative bg-card border-b">
                        {sede.mapEmbed ? (
                          <>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
                              <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                            </div>
                            <iframe
                              src={sede.mapEmbed}
                              className="w-full h-full border-0 relative z-10"
                              loading="lazy"
                              title={`Mapa de ${sede.name}`}
                              allowFullScreen
                              referrerPolicy="no-referrer-when-downgrade"
                            />
                          </>
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <MapPin className="w-8 h-8 text-primary/60" aria-hidden="true" />
                            <p className="text-xs font-medium">Mapa no disponible</p>
                          </div>
                        )}
                      </div>
                      <div className="p-8 space-y-4 flex-1 flex flex-col">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h2 className="font-display text-xl">{sede.name}</h2>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                              {sede.type === 'administrativa' ? 'Oficina administrativa' : 'Punto de venta'}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2.5 flex-1">
                          {sede.address && (
                            <p className="flex items-start gap-3 text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" /> {sede.address}
                            </p>
                          )}
                          {sede.hours && (
                            <p className="flex items-center gap-3 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4 shrink-0 text-primary" /> {sede.hours}
                            </p>
                          )}
                          {phoneHref && (
                            <a
                              href={phoneHref}
                              className="flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="w-4 h-4 shrink-0 text-primary" /> {sede.phone}
                            </a>
                          )}
                          {sede.address && (
                            <a
                              href={directionsUrl(sede.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-3 text-sm font-semibold text-primary hover:underline"
                            >
                              <Navigation className="w-4 h-4 shrink-0" /> Cómo llegar
                            </a>
                          )}
                        </div>
                        {sede.whatsapp && (
                          <motion.a
                            whileTap={{ scale: 0.97 }}
                            href={buildWaUrl(sede.whatsapp, `Hola, quiero hacer un pedido en ${sede.name}`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary inline-flex mt-2"
                          >
                            <MessageCircle className="w-4 h-4" /> Escribir por WhatsApp
                          </motion.a>
                        )}
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
