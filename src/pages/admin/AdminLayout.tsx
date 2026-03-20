import { Outlet, Link, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import logoImg from '@/assets/images/logo.png';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { LayoutDashboard, Package, FileText, ShoppingBag, LogOut, Globe, BookOpen, Menu, X, ExternalLink, Settings, ChevronDown, UserPlus, Image as ImageIcon, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

const mainNavItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/products', icon: Package, label: 'Productos' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Pedidos' },
  { to: '/admin/quotations', icon: FileText, label: 'Cotizaciones' },
  { to: '/admin/media', icon: ImageIcon, label: 'Librería' },
];

const bottomNavItems = [
  { to: '/admin/users', icon: UserPlus, label: 'Usuarios' },
  { to: '/admin/profile', icon: Shield, label: 'Seguridad' },
  { to: '/admin/blog', icon: BookOpen, label: 'Blog' },
  { to: '/admin/settings', icon: Settings, label: 'Configuración' },
];

const pageLabels: Record<string, string> = {
  index: 'Inicio',
  nosotros: 'Nosotros',
  menu: 'Menú',
  sedes: 'Sedes',
  institucional: 'Empresas',
  blog: 'Blog',
  faq: 'FAQ',
};

const slugToSectionSlug: Record<string, string> = {
  inicio: 'index',
  menu: 'menu',
  institucional: 'institucional',
  sedes: 'sedes',
  nosotros: 'nosotros',
  blog: 'blog',
  faq: 'faq',
  'preguntas-frecuentes': 'faq',
};

const AdminLayout = () => {
  const { user, isAdmin, loading, signOut } = useAuth();
  const { settings } = useSiteSettingsMap();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);

  const brandName = settings.brand_name || 'DC Delicias Colombianas - Arbey Cabrera';
  const brandSlogan = settings.brand_slogan || 'Originales desde 1985';
  const logoUrl = settings.logo_url || '';

  // Fetch pages for the dropdown
  const { data: pages } = useQuery({
    queryKey: ['admin-pages-nav'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Auto-expand pages dropdown when on pages/sections routes
  const isOnPagesRoute = location.pathname.startsWith('/admin/pages') || location.pathname.startsWith('/admin/sections');
  useEffect(() => {
    if (isOnPagesRoute) setPagesOpen(true);
  }, [isOnPagesRoute]);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/admin/login" replace />;
  }

  const currentPageFilter = searchParams.get('page');
  const isActiveNav = (item: { to: string; exact?: boolean }) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const isActivePageSub = (slug: string) => {
    return location.pathname === '/admin/sections' && currentPageFilter === slug;
  };

  const NavItem = ({ item }: { item: { to: string; icon: any; label: string; exact?: boolean } }) => {
    const active = isActiveNav(item);
    return (
      <Link
        to={item.to}
        className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
          active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
        }`}
      >
        {active && (
          <motion.div
            layoutId="adminNav"
            className="absolute inset-0 bg-gradient-gold rounded-xl"
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
        <item.icon className="w-4 h-4 relative z-10" />
        <span className="relative z-10">{item.label}</span>
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      <div className="p-5 border-b">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl || logoImg} alt="Logo" className="w-10 h-10 object-contain" />
          <div>
            <span className="font-display text-sm font-bold text-foreground leading-none block">
              {brandName}
            </span>
            <span className="text-[9px] text-muted-foreground font-semibold tracking-[0.1em] uppercase">
              {brandSlogan}
            </span>
          </div>
        </div>
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-center">
          <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Panel Administrativo</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {mainNavItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}

        {/* Páginas dropdown */}
        <div>
          <button
            onClick={() => setPagesOpen(!pagesOpen)}
            className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isOnPagesRoute && !pagesOpen
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {isOnPagesRoute && !pagesOpen && (
              <motion.div
                layoutId="adminNav"
                className="absolute inset-0 bg-gradient-gold rounded-xl"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <Globe className="w-4 h-4 relative z-10" />
            <span className="relative z-10 flex-1 text-left">Páginas</span>
            <ChevronDown className={`w-3.5 h-3.5 relative z-10 transition-transform ${pagesOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {pagesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="ml-4 pl-3 border-l border-border space-y-0.5 py-1">
                  <Link
                    to="/admin/pages"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      location.pathname === '/admin/pages'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    Gestionar páginas
                  </Link>
                  {pages?.map((page) => {
                    const sectionSlug = slugToSectionSlug[page.slug] || page.slug;
                    const active = isActivePageSub(sectionSlug);
                    return (
                      <Link
                        key={page.id}
                        to={`/admin/sections?page=${sectionSlug}`}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${page.active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                        {page.title}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {bottomNavItems.map((item) => (
          <NavItem key={item.to} item={item} />
        ))}
      </nav>

      <div className="p-3 border-t space-y-1">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Ver sitio web
        </Link>
        <button
          onClick={signOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img src={logoUrl || logoImg} alt="Logo" className="w-8 h-8 object-contain" />
          <div>
            <span className="font-display text-xs font-bold">{brandName}</span>
            <span className="block text-[8px] text-muted-foreground font-semibold tracking-wider">{brandSlogan}</span>
          </div>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg hover:bg-secondary">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-card border-r z-50 flex flex-col shadow-elevated"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:max-h-screen">
        <div className="p-4 pt-20 md:p-8 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;