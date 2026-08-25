import { useState, useMemo, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronDown, Search, Package, UtensilsCrossed, Building2, MapPin, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useSedes, DEFAULT_WHATSAPP } from '@/hooks/useSedes';
import { buildWaUrl } from '@/lib/whatsapp';
import { normalizeFaqItems, type FaqItem as FaqItemData } from '@/lib/cmsGuards';

const iconMap: Record<string, typeof Package> = {
  pedidos: Package,
  productos: UtensilsCrossed,
  institucional: Building2,
  sedes_horarios: MapPin,
};

type FaqCategory = { key: string; category: string; icon: typeof Package; items: FaqItemData[] };

const defaultFaqs: FaqCategory[] = [
  {
    key: 'pedidos',
    category: 'Pedidos y Envíos',
    icon: Package,
    items: [
      { q: '¿Hacen domicilios en Bogotá?', a: 'Sí, realizamos envíos en Bogotá a través de nuestras sedes de Quirinal y Sprint Norte. El valor del domicilio se calcula según la distancia.' },
      { q: '¿Cuál es el tiempo de entrega?', a: 'Los pedidos regulares se entregan en 1 a 2 horas dentro de nuestra zona de cobertura. Para pedidos institucionales, coordinamos con anticipación.' },
      { q: '¿Puedo hacer pedidos por anticipado?', a: 'Para pedidos grandes te recomendamos hacerlo con al menos 24 horas de anticipación para garantizar disponibilidad y frescura.' },
      { q: '¿Cuáles son los medios de pago?', a: 'Aceptamos efectivo, tarjeta débito/crédito, Nequi, Daviplata y transferencia bancaria.' },
    ],
  },
  {
    key: 'productos',
    category: 'Productos',
    icon: UtensilsCrossed,
    items: [
      { q: '¿Los productos son frescos?', a: 'Todo se prepara diariamente con ingredientes frescos. No usamos conservantes, colorantes artificiales ni productos pre-fabricados.' },
      { q: '¿Tienen opciones vegetarianas?', a: 'Sí, ofrecemos almojábanas, pan de bono, pan de yuca y jugos naturales aptos para vegetarianos.' },
      { q: '¿Cuál es el producto más vendido?', a: 'Nuestro legendario Pastel de Pollo es el favorito. Más de 40 años perfeccionando la receta.' },
      { q: '¿Manejan productos sin gluten?', a: 'El pan de bono (hecho con almidón de yuca) es naturalmente libre de gluten. Consulta para más opciones.' },
    ],
  },
  {
    key: 'institucional',
    category: 'Servicio Institucional',
    icon: Building2,
    items: [
      { q: '¿Cuál es el pedido mínimo para empresas?', a: 'No hay pedido mínimo, pero los mejores precios se obtienen a partir de 20 unidades por producto.' },
      { q: '¿Ofrecen desayunos corporativos?', a: 'Sí, armamos combos de desayuno que incluyen pasteles, bebidas calientes y jugos.' },
      { q: '¿Hacen catering para eventos?', a: 'Ofrecemos catering para eventos empresariales, reuniones y celebraciones.' },
    ],
  },
  {
    key: 'sedes_horarios',
    category: 'Sedes y Horarios',
    icon: MapPin,
    items: [
      { q: '¿Cuáles son los horarios?', a: 'Lunes a sábado de 6:00 AM a 8:00 PM. Domingos y festivos de 7:00 AM a 3:00 PM.' },
      { q: '¿Puedo visitar sin reservar?', a: 'Sí, nuestras sedes están abiertas al público sin necesidad de reserva.' },
      { q: '¿Tienen parqueadero?', a: 'Sede Quirinal cuenta con parqueadero. En Sprint Norte hay zonas de parqueo público cercanas.' },
      { q: '¿Van a abrir más sedes?', a: 'Estamos evaluando opciones de expansión en Bogotá. ¡Síguenos en redes!' },
    ],
  },
];

const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex items-center justify-between w-full py-5 text-left text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {q}
        <ChevronDown className={`w-4 h-4 shrink-0 ml-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const JSONLD_ID = 'faq-jsonld';

const FaqPage = () => {
  usePageTitle('Preguntas Frecuentes');
  const [search, setSearch] = useState('');
  const { sections: s } = usePageSectionsMap('faq');
  const { tiendas } = useSedes();

  // FAQs desde el CMS con fallback a defaults. Una categoría desactivada en el panel se OCULTA
  // (antes volvía a los textos por defecto). Los items se normalizan: q/a o question/answer.
  const faqs = useMemo<FaqCategory[]>(() => {
    return defaultFaqs.flatMap((def) => {
      const section = s[def.key];
      if (!section) return [def];
      if (section.active === false) return [];
      const items = normalizeFaqItems(section.metadata);
      return [{
        ...def,
        category: section.title || def.category,
        icon: iconMap[def.key] || def.icon,
        items: items.length > 0 ? items : def.items,
      }];
    });
  }, [s]);

  // Datos estructurados FAQPage para buscadores (se retira al salir de la página).
  useEffect(() => {
    const entities = faqs.flatMap((section) =>
      section.items.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    );
    if (entities.length === 0) return;
    document.getElementById(JSONLD_ID)?.remove();
    const script = document.createElement('script');
    script.id = JSONLD_ID;
    script.type = 'application/ld+json';
    script.text = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: entities });
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [faqs]);

  const term = search.trim().toLowerCase();
  const filteredFaqs = faqs
    .map((section) => ({
      ...section,
      items: term
        ? section.items.filter((f) => f.q.toLowerCase().includes(term) || f.a.toLowerCase().includes(term))
        : section.items,
    }))
    .filter((section) => section.items.length > 0);

  const waUrl = buildWaUrl(tiendas[0]?.whatsapp || DEFAULT_WHATSAPP, 'Hola, tengo una pregunta');

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 md:py-24 text-center">
          <FadeInWhenVisible>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {s.hero?.subtitle || 'Centro de ayuda'}
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
              {s.hero?.title || 'Preguntas frecuentes'}
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto mb-8">
              {s.hero?.content || 'Todo lo que necesitas saber sobre Delicias Colombianas.'}
            </p>
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="search"
                aria-label="Buscar pregunta"
                placeholder="Buscar pregunta..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-full bg-background text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-soft"
              />
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* FAQ content */}
      <section className="w-full py-12 bg-background">
        <div className="max-w-2xl mx-auto px-6">
          <div className="space-y-8">
            {filteredFaqs.map((section, si) => {
              const Icon = section.icon;
              return (
                <FadeInWhenVisible key={`${section.key}-${si}`}>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-[18px] h-[18px] text-primary" />
                      </div>
                      <h2 className="font-display text-xl">{section.category}</h2>
                    </div>
                    <div className="bg-section-cream rounded-2xl px-6">
                      {section.items.map((f, i) => (
                        <FaqItem key={`${f.q}-${i}`} q={f.q} a={f.a} />
                      ))}
                    </div>
                  </div>
                </FadeInWhenVisible>
              );
            })}
          </div>

          {filteredFaqs.length === 0 && (
            <p className="text-center text-muted-foreground py-16 text-sm">
              {term ? `No se encontraron resultados para "${search}"` : 'Pronto publicaremos las preguntas frecuentes.'}
            </p>
          )}

          <FadeInWhenVisible className="mt-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">¿No encontraste lo que buscabas?</p>
            <a href={waUrl} target="_blank" rel="noopener noreferrer" className="btn-primary gap-2">
              <MessageCircle className="w-4 h-4" /> Contáctanos por WhatsApp
            </a>
          </FadeInWhenVisible>
        </div>
      </section>
    </>
  );
};

export default FaqPage;
