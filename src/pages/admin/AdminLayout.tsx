import { Outlet, Link, useLocation, Navigate, useSearchParams } from 'react-router-dom';
import logoImg from '@/assets/images/logo.webp';
import { Suspense, useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import PageFallback from '@/components/PageFallback';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  LayoutDashboard, Package, FileText, ShoppingBag, LogOut, Globe, BookOpen, Menu, X, ExternalLink,
  Settings, ChevronDown, UserPlus, Image as ImageIcon, Shield, Bell, type LucideIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type NavItemDef = { to: string; icon: LucideIcon; label: string; exact?: boolean; badgeKey?: 'orders' | 'quotations' };

const mainNavItems: NavItemDef[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/admin/products', icon: Package, label: 'Productos' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Pedidos', badgeKey: 'orders' },
  { to: '/admin/quotations', icon: FileText, label: 'Cotizaciones', badgeKey: 'quotations' },
  { to: '/admin/media', icon: ImageIcon, label: 'Librería' },
];

const bottomNavItems: NavItemDef[] = [
  { to: '/admin/users', icon: UserPlus, label: 'Usuarios' },
  { to: '/admin/profile', icon: Shield, label: 'Seguridad' },
  { to: '/admin/blog', icon: BookOpen, label: 'Blog' },
  { to: '/admin/settings', icon: Settings, label: 'Configuración' },
];

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

type PendingCounts = { orders: number; quotations: number };
type PageRow = { id: string; slug: string; title: string; active: boolean };
type NotifPermission = NotificationPermission | 'unsupported';

const getNotifPermission = (): NotifPermission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

// ─── Sidebar pieces (fuera del layout: así no se remontan en cada render) ─────

const NavItem = ({ item, active, layoutId, badge }: { item: NavItemDef; active: boolean; layoutId: string; badge?: number }) => (
  <Link
    to={item.to}
    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
      active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
    }`}
  >
    {active && (
      <motion.div
        layoutId={layoutId}
        className="absolute inset-0 bg-gradient-gold rounded-xl"
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      />
    )}
    <item.icon className="w-4 h-4 relative z-10" />
    <span className="relative z-10 flex-1">{item.label}</span>
    {!!badge && badge > 0 && (
      <span
        className={`relative z-10 min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center ${
          active ? 'bg-white/25 text-primary-foreground' : 'bg-primary text-primary-foreground'
        }`}
        title={`${badge} pendientes`}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    )}
  </Link>
);

type SidebarProps = {
  layoutId: string;
  logoUrl: string | null;
  brandName: string;
  brandSlogan: string;
  pages: PageRow[] | undefined;
  pagesOpen: boolean;
  setPagesOpen: Dispatch<SetStateAction<boolean>>;
  isOnPagesRoute: boolean;
  pathname: string;
  currentPageFilter: string | null;
  pending: PendingCounts | undefined;
  notifPermission: NotifPermission;
  onEnableNotifications: () => void;
  onSignOut: () => void;
};

const SidebarContent = ({
  layoutId, logoUrl, brandName, brandSlogan, pages, pagesOpen, setPagesOpen, isOnPagesRoute, pathname,
  currentPageFilter, pending, notifPermission, onEnableNotifications, onSignOut,
}: SidebarProps) => {
  const isActiveNav = (item: NavItemDef) => (item.exact ? pathname === item.to : pathname.startsWith(item.to));
  const badgeFor = (item: NavItemDef) => (item.badgeKey && pending ? pending[item.badgeKey] : undefined);

  return (
    <>
      <div className="p-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10">{logoUrl && <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />}</div>
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
          <NavItem key={item.to} item={item} active={isActiveNav(item)} layoutId={layoutId} badge={badgeFor(item)} />
        ))}

        {/* Páginas dropdown */}
        <div>
          <button
            onClick={() => setPagesOpen((v) => !v)}
            aria-expanded={pagesOpen}
            className={`w-full relative flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              isOnPagesRoute && !pagesOpen
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            {isOnPagesRoute && !pagesOpen && (
              <motion.div
                layoutId={layoutId}
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
                      pathname === '/admin/pages'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    Gestionar páginas
                  </Link>
                  {pages?.map((page) => {
                    const sectionSlug = slugToSectionSlug[page.slug] || page.slug;
                    const active = pathname === '/admin/sections' && currentPageFilter === sectionSlug;
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
          <NavItem key={item.to} item={item} active={isActiveNav(item)} layoutId={layoutId} badge={badgeFor(item)} />
        ))}
      </nav>

      <div className="p-3 border-t space-y-1">
        {notifPermission === 'default' && (
          <button
            onClick={onEnableNotifications}
            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Recibe un aviso del navegador cuando entre una cotización o pedido nuevo"
          >
            <Bell className="w-4 h-4" /> Activar avisos
          </button>
        )}
        {notifPermission === 'denied' && (
          <p className="px-4 py-1 text-[10px] text-muted-foreground">Avisos bloqueados en el navegador.</p>
        )}
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <ExternalLink className="w-4 h-4" /> Ver sitio web
        </Link>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar Sesión
        </button>
      </div>
    </>
  );
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const AdminLayout = () => {
  usePageTitle('Panel');
  const { user, isAdmin, loading, signOut } = useAuth();
  const { settings, isLoading: settingsLoading } = useSiteSettingsMap();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotifPermission>(getNotifPermission);
  const prevPendingRef = useRef<number | null>(null);

  const brandName = settings.brand_name || 'DC Delicias Colombianas - Arbey Cabrera';
  const brandSlogan = settings.brand_slogan || 'Originales desde 1985';
  const logoUrl = settingsLoading ? null : (settings.brand_logo || logoImg);
  const authed = !!user && isAdmin;

  // Fetch pages for the dropdown
  const { data: pages } = useAdminQuery({
    queryKey: ['admin-pages-nav'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('id, slug, title, active').order('sort_order');
      if (error) throw error;
      return (data ?? []) as PageRow[];
    },
    enabled: authed,
  });

  // Leads pendientes (badge en "Pedidos" / "Cotizaciones"), refrescado cada minuto.
  const { data: pending } = useAdminQuery({
    queryKey: ['admin-pending-counts'],
    queryFn: async (): Promise<PendingCounts> => {
      const [q, o] = await Promise.all([
        supabase.from('quotations').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);
      if (q.error) throw q.error;
      if (o.error) throw o.error;
      return { quotations: q.count ?? 0, orders: o.count ?? 0 };
    },
    enabled: authed,
    refetchInterval: 60_000,
  });

  // Aviso del navegador cuando el total de pendientes sube con la pestaña abierta.
  useEffect(() => {
    if (!pending) return;
    const total = pending.quotations + pending.orders;
    const prev = prevPendingRef.current;
    prevPendingRef.current = total;
    if (prev === null || total <= prev) return;
    if (getNotifPermission() !== 'granted') return;
    try {
      new Notification('Nuevo lead en Delicias Colombianas', {
        body: `${pending.quotations} cotizaciones y ${pending.orders} pedidos pendientes`,
        tag: 'dc-admin-leads',
        icon: '/pwa-192.png',
      });
    } catch {
      /* algunos navegadores solo permiten notificaciones desde un service worker */
    }
  }, [pending]);

  const enableNotifications = () => {
    if (getNotifPermission() === 'unsupported') return;
    Notification.requestPermission()
      .then((p) => {
        setNotifPermission(p);
        if (p === 'granted') toast.success('Avisos activados: te avisaremos cuando entre una cotización o pedido.');
      })
      .catch(() => setNotifPermission(getNotifPermission()));
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) toast.error(`No se pudo cerrar la sesión: ${error.message}`);
  };

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

  if (!authed) {
    return <Navigate to="/admin/login" replace />;
  }

  const sidebarProps = {
    logoUrl,
    brandName,
    brandSlogan,
    pages,
    pagesOpen,
    setPagesOpen,
    isOnPagesRoute,
    pathname: location.pathname,
    currentPageFilter: searchParams.get('page'),
    pending,
    notifPermission,
    onEnableNotifications: enableNotifications,
    onSignOut: handleSignOut,
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-card border-r flex-col shrink-0">
        <SidebarContent {...sidebarProps} layoutId="adminNav" />
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-card border-b h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8">{logoUrl && <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />}</div>
          <div>
            <span className="font-display text-xs font-bold">{brandName}</span>
            <span className="block text-[8px] text-muted-foreground font-semibold tracking-wider">{brandSlogan}</span>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-expanded={sidebarOpen}
          aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
          className="p-2 rounded-lg hover:bg-secondary"
        >
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
              <SidebarContent {...sidebarProps} layoutId="adminNavMobile" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto md:max-h-screen">
        <div className="p-4 pt-20 md:p-8 md:pt-8">
          <ErrorBoundary key={location.pathname}><Suspense fallback={<PageFallback />}><Outlet /></Suspense></ErrorBoundary>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
