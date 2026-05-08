import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, Clock, ChevronDown, ChevronUp, Filter, Download, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import type { Database } from '@/integrations/supabase/types';
import { useSedes } from '@/hooks/useSedes';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = Database['public']['Enums']['order_status'];

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const statusColors: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-orange-100 text-orange-700',
  ready: 'bg-emerald-100 text-emerald-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

// WhatsApp lookup now driven by useSedes hook at component level

const AdminOrders = () => {
  const qc = useQueryClient();
  const { sedes } = useSedes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from('orders').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Estado actualizado');
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds(prev => prev.filter(selected => !selected)); // Reset if needed
      toast.success('Pedido eliminado permanentemente');
    },
    onError: () => {
      toast.error('Error al eliminar el pedido');
    }
  });

  const deleteOrders = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('orders').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds([]);
      toast.success('Pedidos eliminados correctamente');
    },
    onError: (error: any) => {
      console.error('Error deleting orders:', error);
      toast.error('Error al eliminar los pedidos');
    }
  });

  const deleteAllOrders = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      setSelectedIds([]);
      toast.success('Todos los pedidos han sido eliminados');
    },
    onError: () => {
      toast.error('Error al vaciar la lista de pedidos');
    }
  });

  const filtered = orders?.filter((o) => {
    const matchSearch = search === '' ||
      o.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_phone.includes(search);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchSede = sedeFilter === 'all' || o.sede === sedeFilter;
    return matchSearch && matchStatus && matchSede;
  }) || [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map(o => o.id));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`¿Estás seguro de que deseas eliminar ${selectedIds.length} pedidos seleccionados?`)) {
      deleteOrders.mutate(selectedIds);
    }
  };

  const handleClearAll = () => {
    const confirm1 = confirm('¡ADVERTENCIA! ¿Estás seguro de que deseas eliminar ABSOLUTAMENTE TODOS los pedidos? Esta acción no se puede deshacer.');
    if (confirm1) {
      const confirm2 = confirm('Confirmación final: ¿Realmente quieres vaciar toda la base de datos de pedidos?');
      if (confirm2) {
        deleteAllOrders.mutate();
      }
    }
  };

  const pendingCount = orders?.filter(o => o.status === 'pending').length || 0;
  const totalRevenue = filtered.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);

  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('No hay pedidos para exportar');
      return;
    }
    
    // Crear cabeceras
    const headers = ['ID', 'Cliente', 'Teléfono', 'Sede', 'Estado', 'Total', 'Fecha', 'Notas'];
    const rows = filtered.map(o => [
      o.id,
      `"${o.customer_name}"`, // Escapar comillas si contiene comas
      `"${o.customer_phone}"`,
      o.sede,
      o.status,
      o.total,
      `"${formatDate(o.created_at)}"`,
      `"${(o.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Forzar decodificación UTF-8 para Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pedidos_delicias_colombianas_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Archivo CSV descargado correctamente');
  };

  const inputClass = "px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl">Pedidos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {orders?.length || 0} pedidos · {pendingCount > 0 && <span className="text-amber-600 font-semibold">{pendingCount} pendientes</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-xl font-medium text-sm transition-colors"
                disabled={deleteOrders.isPending}
              >
                {deleteOrders.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Borrar ({selectedIds.length})
              </button>
            )}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-secondary text-foreground hover:bg-secondary/80 border rounded-xl font-medium text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
            <div className="bg-primary/5 border border-primary/10 rounded-xl px-5 py-3 text-sm hidden sm:block">
              <span className="text-muted-foreground">Ingresos: </span>
              <span className="font-display font-bold text-primary">{formatPrice(totalRevenue)}</span>
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Bulk Global Action & Filters */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o teléfono..."
                className={`${inputClass} pl-10 w-full`}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
              <option value="all">Todos los estados</option>
              {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)} className={inputClass}>
              <option value="all">Todas las sedes</option>
              <option value="quirinal">Quirinal</option>
              <option value="sprint">Sprint Norte</option>
            </select>
          </div>
          <button
            onClick={handleClearAll}
            className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-4 transition-colors px-2 py-1"
            disabled={deleteAllOrders.isPending}
          >
            {deleteAllOrders.isPending ? 'Vaciando...' : 'Vaciar lista completa'}
          </button>
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-secondary/30 rounded-lg">
            <input
              type="checkbox"
              checked={selectedIds.length === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-muted text-primary focus:ring-primary/20"
            />
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIds.length > 0 
                ? `${selectedIds.length} pedidos seleccionados` 
                : 'Seleccionar todos los pedidos visibles'}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {search || statusFilter !== 'all' || sedeFilter !== 'all' ? 'No se encontraron pedidos con esos filtros.' : 'No hay pedidos aún.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isExpanded = expandedId === o.id;
            const isSelected = selectedIds.includes(o.id);
            return (
              <div key={o.id} className={`bg-card border rounded-2xl shadow-soft overflow-hidden transition-all ${isSelected ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelect(o.id)}
                      className="w-4 h-4 rounded border-muted text-primary focus:ring-primary/20"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{o.customer_name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[o.status]}`}>
                          {statusLabels[o.status]}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full capitalize">{o.sede}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> {formatDate(o.created_at)} · {o.customer_phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-primary">{formatPrice(o.total)}</span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-0 border-t">
                        {/* Items */}
                        <div className="mt-4 mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Productos</p>
                          <div className="space-y-1.5">
                            {Array.isArray(o.items) && (o.items as Array<{ name: string; quantity: number; price?: number }>).map((item, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span>{item.quantity}x {item.name}</span>
                                {item.price && <span className="text-muted-foreground">{formatPrice(item.price * item.quantity)}</span>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {o.notes && (
                          <div className="mb-4 p-3 bg-secondary/50 rounded-xl">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notas</p>
                            <p className="text-sm">{o.notes}</p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                            <select
                              value={o.status}
                              onChange={(e) => { e.stopPropagation(); updateStatus.mutate({ id: o.id, status: e.target.value as OrderStatus }); }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer ${statusColors[o.status]}`}
                            >
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <a
                            href={(() => {
                              const phone = o.customer_phone.replace(/\D/g, '');
                              const fullPhone = phone.startsWith('57') ? phone : `57${phone}`;
                              const items = Array.isArray(o.items)
                                ? (o.items as Array<{ name: string; quantity: number; price?: number }>)
                                    .map(i => `• ${i.quantity}x ${i.name}${i.price ? ` (${formatPrice(i.price * i.quantity)})` : ''}`)
                                    .join('\n')
                                : '';
                              const msg = [
                                `Hola ${o.customer_name} 👋, te escribimos de *Delicias Colombianas*.`,
                                ``,
                                `Te contactamos sobre tu pedido:`,
                                items,
                                ``,
                                `*Total: ${formatPrice(o.total)}*`,
                                `Estado actual: *${statusLabels[o.status]}*`,
                                o.notes ? `\nNotas: ${o.notes}` : '',
                              ].filter(s => s !== undefined && s !== null).join('\n');
                              return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
                            })()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> Contactar cliente
                          </a>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Estás seguro de que deseas eliminar este pedido permanentemente? Esta acción no se puede deshacer.')) {
                                deleteOrder.mutate(o.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors ml-auto"
                            disabled={deleteOrder.isPending}
                          >
                            {deleteOrder.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            Borrar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default AdminOrders;