import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/store/cartStore';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useSedes } from '@/hooks/useSedes';
import { ensureHttp } from '@/lib/cmsGuards';
import ThemeToggle from '../ThemeToggle';
import logoImg from '@/assets/images/logo.webp';

const allNavLinks = [
  { to: '/', label: 'Inicio', slug: 'inicio' },
  { to: '/menu', label: 'Menú', slug: 'menu' },
  { to: '/institucional', label: 'Empresas', slug: 'institucional' },
  { to: '/sedes', label: 'Sedes', slug: 'sedes' },
  { to: '/nosotros', label: 'Nosotros', slug: 'nosotros' },
  { to: '/blog', label: 'Blog', slug: 'blog' },
];

const MOBILE_NAV_ID = 'mobile-nav';

/** `tel:` sin espacios; vacío si la sede no tiene teléfono. */
const telHref = (phone: string | undefined) => (phone ? `tel:${phone.replace(/\s/g, '')}` : '');

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { totalItems, toggleCart } = useCartStore();
  const count = totalItems();
  const { settings, isLoading: settingsLoading } = useSiteSettingsMap();
  const { tiendas } = useSedes();

  const brandName = settings.brand_name || 'DC Delicias Colombianas';
  const brandNameMobile = settings.brand_name_mobile || 'DC Delicias';
  const brandSubtitle = settings.brand_subtitle || 'Arbey Cabrera · Originales desde 1985';
  const brandLogo = settingsLoading ? null : (settings.brand_logo || logoImg);
  const socialInstagram = ensureHttp(settings.social_instagram);
  const socialFacebook = ensureHttp(settings.social_facebook);

  const { data: pages } = useQuery({
    queryKey: ['active-pages'],
    queryFn: async () => {
      const { data } = await supabase.from('pages').select('slug, active').eq('active', true);
      return data?.map(p => p.slug) || [];
    },
  });

  const navLinks = useMemo(() => {
    if (!pages || pages.length === 0) return allNavLinks;
    return allNavLinks.filter(l => l.slug === 'inicio' || pages.includes(l.slug));
  }, [pages]);

  // "Menú" también activo en la ficha de producto (/producto/:id)
  const isNavActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    if (location.pathname === to || location.pathname.startsWith(`${to}/`) || location.pathname.startsWith(`${to}?`)) return true;
    return to === '/menu' && location.pathname.startsWith('/producto/');
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  // Drawer móvil: cerrar con Escape y bloquear el scroll del body mientras está abierto.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  return (
    <>
      <div className="w-full bg-foreground text-background">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 flex items-center justify-between h-9 text-[11px] font-medium">
          <div className="hidden md:flex items-center gap-6">
            {tiendas.map((s) => (
              <span key={s.id} className="flex items-center gap-1.5 opacity-80">
                <MapPin className="w-3 h-3" /> {s.name}{s.address ? ` — ${s.address}` : ''}
                {s.phone && (
                  <a href={telHref(s.phone)} className="ml-1 opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {s.phone}
                  </a>
                )}
              </span>
            ))}
          </div>
          <div className="flex md:hidden items-center gap-1.5 opacity-80">
            <MapPin className="w-3 h-3" /> {tiendas.length} {tiendas.length === 1 ? 'Sede' : 'Sedes'} en Bogotá
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {socialInstagram && <a href={socialInstagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="opacity-60 hover:opacity-100 transition-opacity"><Instagram className="w-3.5 h-3.5" /></a>}
              {socialFacebook && <a href={socialFacebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="opacity-60 hover:opacity-100 transition-opacity"><Facebook className="w-3.5 h-3.5" /></a>}
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-medium bg-background/95 backdrop-blur-md' : 'bg-background'}`}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-[72px] px-4 lg:px-10">
          <Link to="/" className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0">{brandLogo && <img src={brandLogo} alt={brandName} width={48} height={48} decoding="async" className="w-full h-full object-contain" />}</div>
            <div className="flex flex-col">
              <span className="font-display text-lg sm:text-xl text-foreground leading-none tracking-tight font-bold">
                <span className="hidden sm:inline">{brandName}</span>
                <span className="sm:hidden">{brandNameMobile}</span>
              </span>
              <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.18em] uppercase hidden md:block mt-0.5">{brandSubtitle}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5" aria-label="Principal">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                aria-current={isNavActive(l.to) ? 'page' : undefined}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                  isNavActive(l.to)
                    ? 'bg-foreground text-background'
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <Link to="/preguntas-frecuentes" className="hidden xl:inline-flex text-[13px] font-semibold text-foreground/70 hover:text-foreground px-3 py-2 rounded-full hover:bg-secondary transition-all">
              FAQ
            </Link>
            <div className="hidden xl:block w-px h-5 bg-border mx-1" />
            <ThemeToggle />
            <motion.button
              onClick={toggleCart}
              aria-label="Abrir carrito"
              className="relative p-2.5 rounded-full hover:bg-secondary transition-colors"
              whileTap={{ scale: 0.92 }}
            >
              <ShoppingCart className="w-5 h-5" />
              <AnimatePresence>
                {count > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-0.5 -right-0.5 w-5 h-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold"
                  >
                    {count}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <Link to="/menu" className="hidden sm:inline-flex btn-primary text-[13px] py-2.5 px-6">
              Pedir ahora
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls={MOBILE_NAV_ID}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
              className="lg:hidden p-2.5 rounded-full hover:bg-secondary"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.nav
              id={MOBILE_NAV_ID}
              aria-label="Menú móvil"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-background z-50 lg:hidden shadow-elevated overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b">
                <span className="font-display text-lg">Menú</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" className="p-2 rounded-full hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-1">
                {navLinks.map((l, i) => (
                  <motion.div key={l.to} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={l.to}
                      aria-current={isNavActive(l.to) ? 'page' : undefined}
                      className={`block py-3.5 px-4 rounded-xl text-[15px] font-semibold transition-all ${
                        isNavActive(l.to) ? 'text-primary bg-primary/5' : 'text-foreground/70 hover:bg-secondary'
                      }`}
                    >
                      {l.label}
                    </Link>
                  </motion.div>
                ))}
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
                  <Link to="/preguntas-frecuentes" className="block py-3.5 px-4 rounded-xl text-[15px] font-semibold text-foreground/70 hover:bg-secondary">
                    Preguntas Frecuentes
                  </Link>
                </motion.div>
              </div>

              {tiendas.length > 0 && (
                <div className="mx-5 p-4 bg-section-warm rounded-2xl space-y-3">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Nuestras Sedes</p>
                  {tiendas.map((s) => (
                    <div key={s.id} className="text-sm">
                      <p className="font-semibold text-foreground">{s.name}</p>
                      {s.address && <p className="text-muted-foreground text-xs">{s.address}</p>}
                      {s.hours && <p className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {s.hours}</p>}
                      {s.phone && (
                        <a href={telHref(s.phone)} className="text-primary text-xs font-medium flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {s.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="p-5 pt-4">
                <Link to="/menu" className="btn-primary w-full text-center">Pedir ahora</Link>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
