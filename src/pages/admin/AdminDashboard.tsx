import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Package, ShoppingBag, FileText, TrendingUp, BookOpen, Clock, ArrowRight, AlertCircle, Users, Layers, MapPin } from 'lucide-react';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { Link } from 'react-router-dom';

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const SEDES = [
  { id: 'all', label: 'Todas las sedes' },
  { id: 'quirinal', label: 'Quirinal' },
  { id: 'sprint', label: 'Sprint Norte' }
];

const AdminDashboard = () => {
  const [selectedSede, setSelectedSede] = useState<string>('all');

  const { data: productsCount } = useQuery({
    queryKey: ['admin-products-count'],
    queryFn: async () => {
      const { count } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true);
      return count || 0;
    },
  });

  const { data: ordersData } = useQuery({
    queryKey: ['admin-orders-stats', selectedSede],
    queryFn: async () => {
      let query = supabase.from('orders').select('total, status, created_at, sede');
      if (selectedSede !== 'all') {
        query = query.eq('sede', selectedSede);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      const total = data?.length || 0;
      const pending = data?.filter(o => o.status === 'pending').length || 0;
      const revenue = data?.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0) || 0;
      
      const today = new Date().toDateString();
      const todayOrders = data?.filter(o => new Date(o.created_at).toDateString() === today).length || 0;
      const todayRevenue = data?.filter(o => new Date(o.created_at).toDateString() === today && o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0) || 0;
      
      return { total, pending, revenue, todayOrders, todayRevenue };
    },
  });

  const { data: quotationsData } = useQuery({
    queryKey: ['admin-quotations-stats', selectedSede],
    queryFn: async () => {
      let query = supabase.from('quotations').select('status, notes');
      if (selectedSede !== 'all') {
        query = query.ilike('notes', `%${selectedSede}%`);
      }
      const { data } = await query;
      const total = data?.length || 0;
      const pending = data?.filter(q => q.status === 'pending').length || 0;
      return { total, pending };
    },
  });

  const { data: blogCount } = useQuery({
    queryKey: ['admin-blog-count'],
    queryFn: async () => {
      const { count } = await supabase.from('blog_posts').select('*', { count: 'exact', head: true });
      return count || 0;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ['admin-recent-orders', selectedSede],
    queryFn: async () => {
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(8);
      if (selectedSede !== 'all') {
        query = query.eq('sede', selectedSede);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const { data: recentQuotations } = useQuery({
    queryKey: ['admin-recent-quotations', selectedSede],
    queryFn: async () => {
      let query = supabase.from('quotations').select('*').order('created_at', { ascending: false }).limit(5);
      if (selectedSede !== 'all') {
        query = query.ilike('notes', `%${selectedSede}%`);
      }
      const { data } = await query;
      return data || [];
    },
  });

  const stats = [
    { label: 'Ingresos totales', value: formatPrice(ordersData?.revenue ?? 0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Pedidos', value: ordersData?.total ?? 0, icon: ShoppingBag, color: 'text-primary', bg: 'bg-primary/5', badge: ordersData?.pending ? `${ordersData.pending} pendientes` : undefined },
    { label: 'Productos activos', value: productsCount ?? 0, icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Cotizaciones B2B', value: quotationsData?.total ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', badge: quotationsData?.pending ? `${quotationsData.pending} pendientes` : undefined },
    { label: 'Artículos blog', value: blogCount ?? 0, icon: BookOpen, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              DC DELICIAS COLOMBIANAS - ARBEY CABRERA · Originales desde 1985
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
            <select 
              value={selectedSede} 
              onChange={(e) => setSelectedSede(e.target.value)}
              className="px-4 py-3 rounded-xl border bg-card text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm w-full sm:w-48"
            >
              {SEDES.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            
            {/* Today summary */}
            <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-2 flex flex-col justify-center shrink-0 w-full sm:w-auto">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1">
                Hoy {selectedSede !== 'all' ? `(${SEDES.find(s => s.id === selectedSede)?.label})` : ''}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <span className="font-display font-medium">{ordersData?.todayOrders ?? 0} pedidos</span>
                <span className="text-primary font-bold">{formatPrice(ordersData?.todayRevenue ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      <StaggerContainer className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10" staggerDelay={0.06}>
        {stats.map((s) => (
          <StaggerItem key={s.label}>
            <div className="bg-card border rounded-2xl p-5 shadow-soft hover:shadow-medium transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
              </div>
              <p className="font-display text-2xl">{s.value}</p>
              {s.badge && (
                <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  <AlertCircle className="w-3 h-3" /> {s.badge}
                </span>
              )}
            </div>
          </StaggerItem>
        ))}
      </StaggerContainer>

      {/* Quick actions */}
      <FadeInWhenVisible delay={0.15}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {[
            { to: '/admin/products', label: 'Nuevo Producto', icon: Package },
            { to: '/admin/orders', label: 'Ver Pedidos', icon: ShoppingBag },
            { to: '/admin/blog', label: 'Nuevo Artículo', icon: BookOpen },
            { to: '/admin/quotations', label: 'Cotizaciones', icon: FileText },
            { to: '/admin/sections', label: 'Secciones', icon: Layers },
            { to: '/admin/users', label: 'Usuarios', icon: Users },
          ].map((a) => (
            <Link key={a.to} to={a.to} className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:border-primary/20 hover:shadow-soft transition-all group">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <a.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium">{a.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </FadeInWhenVisible>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <FadeInWhenVisible delay={0.2} className="lg:col-span-2">
          <div className="bg-card border rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl">Pedidos Recientes</h2>
              <Link to="/admin/orders" className="text-xs font-semibold text-primary hover:underline">Ver todos →</Link>
            </div>
            {(!recentOrders || recentOrders.length === 0) ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No hay pedidos aún.</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 text-sm">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{o.customer_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[o.status] || 'bg-muted text-muted-foreground'}`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(o.created_at)} · {o.sede}
                      </p>
                    </div>
                    <span className="font-display font-bold text-primary shrink-0 ml-3">{formatPrice(o.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeInWhenVisible>

        {/* Recent Quotations */}
        <FadeInWhenVisible delay={0.3}>
          <div className="bg-card border rounded-2xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-lg">Cotizaciones B2B</h2>
              <Link to="/admin/quotations" className="text-xs font-semibold text-primary hover:underline">Ver todas →</Link>
            </div>
            {(!recentQuotations || recentQuotations.length === 0) ? (
              <p className="text-muted-foreground text-sm py-8 text-center">Sin cotizaciones.</p>
            ) : (
              <div className="space-y-2">
                {recentQuotations.map((q) => (
                  <div key={q.id} className="p-3 rounded-xl bg-secondary/50 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{q.company_name}</p>
                      <span className="font-display font-bold text-primary text-xs">{formatPrice(q.total)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{q.contact_name} · {q.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeInWhenVisible>
      </div>
    </div>
  );
};

export default AdminDashboard;