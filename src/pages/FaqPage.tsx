import { useState, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ChevronDown, Search, Package, UtensilsCrossed, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { usePageSectionsMap } from '@/hooks/usePageSections';

const iconMap: Record<string, typeof Package> = {
  pedidos: Package,
  productos: UtensilsCrossed,
  institucional: Building2,
  sedes_horarios: MapPin,
};


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

const FaqPage = () => {
  usePageTitle('Preguntas Frecuentes');
  const [search, setSearch] = useState('');
  const { sections: s, isLoading: sectionsLoading } = usePageSectionsMap('faq');

  // FAQs exclusively from CMS — no hardcoded fallback defaults
  const faqs = useMemo(() => {
    const faqKeys = ['pedidos', 'productos', 'institucional', 'sedes_horarios'];
    return faqKeys
      .map(key => {
        const section = s[key];
        if (!section || section.active === false) return null;
        try {
          const meta = typeof section.metadata === 'string' ? JSON.parse(section.metadata) : section.metadata;
          if (meta?.items && Array.isArray(meta.items) && meta.items.length > 0) {
            return {
              key,
              category: section.title || key,
              icon: iconMap[key] || Package,
              items: meta.items,
            };
          }
        } catch { /* fall through */ }
        return null;
      })
      .filter(Boolean) as { key: string; category: string; icon: typeof Package; items: { q: string; a: string }[] }[];
  }, [s]);

  const filteredFaqs = sectionsLoading
    ? []
    : faqs.map((section) => ({
        ...section,
        items: section.items.filter(
          (f) =>
            f.q.toLowerCase().includes(search.toLowerCase()) ||
            f.a.toLowerCase().includes(search.toLowerCase())
        ),
      })).filter((section) => section.items.length > 0);

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 md:py-24 text-center">
          <FadeInWhenVisible>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
              {s.hero?.subtitle}
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
              {s.hero?.title}
            </h1>
            {s.hero?.content && (
              <p className="text-muted-foreground text-base max-w-lg mx-auto mb-8">
                {s.hero.content}
              </p>
            )}
            <div className="max-w-md mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
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
            {filteredFaqs.map((section) => {
              const Icon = section.icon;
              return (
                <FadeInWhenVisible key={section.category}>
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <h2 className="font-display text-xl">{section.category}</h2>
                    </div>
                    <div className="bg-section-cream rounded-2xl px-6">
                      {section.items.map((f) => (
                        <FaqItem key={f.q} q={f.q} a={f.a} />
                      ))}
                    </div>
                  </div>
                </FadeInWhenVisible>
              );
            })}
          </div>

          {filteredFaqs.length === 0 && !sectionsLoading && (
            <p className="text-center text-muted-foreground py-16 text-sm">
              {search ? `No se encontraron resultados para "${search}"` : 'Las preguntas frecuentes aún no están configuradas en el CMS.'}
            </p>
          )}

          <FadeInWhenVisible className="mt-16 text-center">
            <p className="text-muted-foreground text-sm mb-4">¿No encontraste lo que buscabas?</p>
            <Link to="/sedes" className="btn-primary">Contáctanos por WhatsApp</Link>
          </FadeInWhenVisible>
        </div>
      </section>
    </>
  );
};

export default FaqPage;
