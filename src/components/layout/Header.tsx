import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCartStore } from '@/store/cartStore';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useSedes } from '@/hooks/useSedes';
import ThemeToggle from '../ThemeToggle';
import logoImg from '@/assets/images/logo.png';

const allNavLinks = [
  { to: '/', label: 'Inicio', slug: 'inicio' },
  { to: '/menu', label: 'Menú', slug: 'menu' },
  { to: '/institucional', label: 'Empresas', slug: 'institucional' },
  { to: '/sedes', label: 'Sedes', slug: 'sedes' },
  { to: '/nosotros', label: 'Nosotros', slug: 'nosotros' },
  { to: '/blog', label: 'Blog', slug: 'blog' },
];

export const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { totalItems, toggleCart } = useCartStore();
  const count = totalItems();
  const { settings } = useSiteSettingsMap();
  const { sedes } = useSedes();

  const brandName = settings.brand_name || 'DC Delicias Colombianas';
  const brandSubtitle = settings.brand_subtitle || 'Arbey Cabrera · Originales desde 1985';
  const brandLogo = settings.brand_logo || logoImg;
  const socialInstagram = settings.social_instagram || '';
  const socialFacebook = settings.social_facebook || '';

  const { data: pages } = useQuery({
    queryKey: ['active-pages'],
    queryFn: async () => {
      const { data } = await supabase.from('pages').select('slug, active').eq('active', true);
      return data?.map(p => p.slug) || [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const navLinks = useMemo(() => {
    if (!pages) return allNavLinks;
    return allNavLinks.filter(l => l.slug === 'inicio' || pages.includes(l.slug));
  }, [pages]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <>
      <div className="w-full bg-foreground text-background">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 flex items-center justify-between h-9 text-[11px] font-medium">
          <div className="hidden md:flex items-center gap-6">
            {sedes.filter(s => !s.name.includes('Administrativa')).map((s) => (
              <span key={s.name} className="flex items-center gap-1.5 opacity-80">
                <MapPin className="w-3 h-3" /> {s.name} — {s.address}
                <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="ml-1 opacity-80 hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Phone className="w-3 h-3" /> {s.phone}
                </a>
              </span>
            ))}
          </div>
          <div className="flex md:hidden items-center gap-1.5 opacity-80">
            <MapPin className="w-3 h-3" /> 2 Sedes en Bogotá
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2">
              {socialInstagram && <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity"><Instagram className="w-3.5 h-3.5" /></a>}
              {socialFacebook && <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity"><Facebook className="w-3.5 h-3.5" /></a>}
            </div>
          </div>
        </div>
      </div>

      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-medium bg-background/95 backdrop-blur-md' : 'bg-background'}`}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between h-[72px] px-4 lg:px-10">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <img src={brandLogo} alt={brandName} className="w-12 h-12 object-contain" />
            <div>
              <span className="font-display text-xl text-foreground leading-none tracking-tight">
                {brandName}
              </span>
              <span className="block text-[9px] text-muted-foreground font-semibold tracking-[0.18em] uppercase hidden sm:block">{brandSubtitle}</span>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {navLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-all duration-200 ${
                  location.pathname === l.to || (l.to !== '/' && location.pathname.startsWith(l.to))
                    ? 'bg-foreground text-background'
                    : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <Link to="/preguntas-frecuentes" className="hidden xl:inline-flex text-[13px] font-semibold text-foreground/70 hover:text-foreground px-3 py-2 rounded-full hover:bg-secondary transition-all">
              FAQ
            </Link>
            <div className="hidden xl:block w-px h-5 bg-border mx-1" />
            <ThemeToggle />
            <motion.button
              onClick={toggleCart}
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
            <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden p-2.5 rounded-full hover:bg-secondary">
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
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[300px] max-w-[85vw] bg-background z-50 lg:hidden shadow-elevated overflow-y-auto"
            >
              <div className="flex items-center justify-between p-5 border-b">
                <span className="font-display text-lg">Menú</span>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-full hover:bg-secondary">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-1">
                {navLinks.map((l, i) => (
                  <motion.div key={l.to} initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}>
                    <Link
                      to={l.to}
                      className={`block py-3.5 px-4 rounded-xl text-[15px] font-semibold transition-all ${
                        location.pathname === l.to ? 'text-primary bg-primary/5' : 'text-foreground/70 hover:bg-secondary'
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

              <div className="mx-5 p-4 bg-section-warm rounded-2xl space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-primary">Nuestras Sedes</p>
                {sedes.map((s) => (
                  <div key={s.name} className="text-sm">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-muted-foreground text-xs">{s.address}</p>
                    <p className="text-muted-foreground text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {s.hours}</p>
                    <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="text-primary text-xs font-medium flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {s.phone}
                    </a>
                  </div>
                ))}
              </div>

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
