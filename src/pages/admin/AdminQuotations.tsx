import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageCircle, ChevronDown, ChevronUp, Phone, Mail, AlertCircle, Download, Trash2, Loader2, Store, MapPin, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import type { Database } from '@/integrations/supabase/types';
import { useSedes } from '@/hooks/useSedes';
import { buildWaUrl } from '@/lib/whatsapp';
import { DELIVERY_LABELS, csvCell, formatRequestedDate, type DeliveryType } from '@/lib/quotation';

type Quotation = Database['public']['Tables']['quotations']['Row'];
type QuoteStatus = Database['public']['Enums']['quote_status'];

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusLabels: Record<QuoteStatus, string> = {
  pending: 'Pendiente',
  contacted: 'Contactada',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const statusColors: Record<QuoteStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  contacted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
};

/** Cotizaciones antiguas no tienen delivery_type: la info quedó solo en `notes`. */
const deliveryLabel = (t: string | null | undefined) =>
  t && t in DELIVERY_LABELS ? DELIVERY_LABELS[t as DeliveryType] : 'Sin especificar';

// El dashboard consulta ['admin-quotations-stats', sede] y ['admin-recent-quotations', sede]: el prefijo basta.
const QUOTATION_KEYS = [['admin-pending-counts'], ['admin-quotations'], ['admin-quotations-stats'], ['admin-recent-quotations']];

const AdminQuotations = () => {
  const qc = useQueryClient();
  const { sedes } = useSedes();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sedeFilter, setSedeFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const sedeName = (id: string | null | undefined) => (id ? sedes.find((s) => s.id === id)?.name ?? id : '');
  const invalidateQuotations = () => QUOTATION_KEYS.forEach((queryKey) => qc.invalidateQueries({ queryKey }));

  const { data: quotations, isLoading, isError, refetch } = useAdminQuery({
    queryKey: ['admin-quotations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('quotations').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Quotation[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: QuoteStatus }) => {
      const { error } = await supabase.from('quotations').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateQuotations();
      toast.success('Estado actualizado');
    },
    onError: (error: Error) => {
      console.error('Error updating quotation status:', error);
      toast.error('No se pudo actualizar el estado. Intenta de nuevo.');
    },
  });

  const deleteQuotation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: (id) => setDeletingId(id),
    onSettled: () => setDeletingId(null),
    onSuccess: () => {
      invalidateQuotations();
      toast.success('Cotización eliminada');
    },
    onError: () => toast.error('Error al eliminar cotización'),
  });

  const filtered = quotations?.filter((q) => {
    const term = search.toLowerCase();
    const matchSearch = search === '' ||
      q.company_name.toLowerCase().includes(term) ||
      q.contact_name.toLowerCase().includes(term) ||
      q.phone.includes(search);
    const matchStatus = statusFilter === 'all' || q.status === statusFilter;
    const matchSede = sedeFilter === 'all' || q.sede === sedeFilter;
    return matchSearch && matchStatus && matchSede;
  }) || [];

  const pendingCount = quotations?.filter(q => q.status === 'pending').length || 0;
  const totalValue = filtered.reduce((sum, q) => sum + q.total, 0);
  const hasFilters = search !== '' || statusFilter !== 'all' || sedeFilter !== 'all';

  const exportToCSV = () => {
    if (filtered.length === 0) { toast.error('No hay cotizaciones para exportar'); return; }
    const headers = ['ID', 'Empresa', 'NIT', 'Contacto', 'Teléfono', 'Email', 'Estado', 'Total', 'Fecha', 'Entrega', 'Sede', 'Dirección', 'Fecha deseada', 'Notas'];
    const rows = filtered.map(q => [
      q.id, q.company_name, q.nit || '', q.contact_name, q.phone, q.email || '', statusLabels[q.status] ?? q.status, q.total,
      formatDate(q.created_at), q.delivery_type ? deliveryLabel(q.delivery_type) : '', sedeName(q.sede), q.address || '', q.requested_date || '', q.notes || '',
    ].map(csvCell));
    const csv = ['\uFEFF' + headers.map(csvCell).join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `cotizaciones_delicias_${Date.now()}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    toast.success('CSV descargado');
  };

  const waMessage = (q: Quotation) =>
    `Hola ${q.contact_name}, te contactamos de Delicias Colombianas sobre tu cotización por ${formatPrice(q.total)} para ${q.company_name}.`;

  const inputClass = "px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl">Cotizaciones B2B</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {quotations?.length || 0} cotizaciones · {pendingCount > 0 && <span className="text-amber-600 font-semibold">{pendingCount} pendientes</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-secondary/80 border rounded-xl text-sm font-medium transition-colors">
              <Download className="w-4 h-4" /> Exportar CSV
            </button>
            <div className="bg-primary/5 border border-primary/10 rounded-xl px-5 py-3 text-sm">
              <span className="text-muted-foreground">Valor filtrado: </span>
              <span className="font-display font-bold text-primary">{formatPrice(totalValue)}</span>
            </div>
          </div>
        </div>
      </FadeInWhenVisible>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, contacto o teléfono..."
            className={`${inputClass} pl-10 w-full`}
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputClass}>
          <option value="all">Todos los estados</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={sedeFilter} onChange={(e) => setSedeFilter(e.target.value)} className={inputClass} aria-label="Filtrar por sede de recogida">
          <option value="all">Todas las sedes</option>
          {sedes.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : isError ? (
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="flex items-center justify-center gap-2"><AlertCircle className="w-4 h-4" /> No se pudieron cargar las cotizaciones.</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">Reintentar</button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">
          {hasFilters ? 'No se encontraron cotizaciones.' : 'No hay cotizaciones aún.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => {
            const isExpanded = expandedId === q.id;
            const isDeleting = deletingId === q.id;
            return (
              <div key={q.id} className="bg-card border rounded-2xl shadow-soft overflow-hidden">
                <div
                  className="flex flex-wrap items-center justify-between gap-3 p-5 cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : q.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{q.company_name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColors[q.status]}`}>
                        {statusLabels[q.status]}
                      </span>
                      {q.delivery_type && (
                        <span className="text-[10px] font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          {q.delivery_type === 'pickup' ? <Store className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                          {q.delivery_type === 'pickup' ? sedeName(q.sede) || DELIVERY_LABELS.pickup : DELIVERY_LABELS.delivery}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {q.contact_name} · {q.phone} · {formatDate(q.created_at)}
                      {q.requested_date && <> · Entrega: {q.requested_date}</>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-primary">{formatPrice(q.total)}</span>
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
                        {/* Company info */}
                        <div className="mt-4 mb-4 p-3 bg-secondary/50 rounded-xl text-sm space-y-1">
                          <p><strong>Empresa:</strong> {q.company_name}</p>
                          {q.nit && <p><strong>NIT:</strong> {q.nit}</p>}
                          <p><strong>Contacto:</strong> {q.contact_name}</p>
                          <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {q.phone}</p>
                          {q.email && <p className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {q.email}</p>}
                        </div>

                        {/* Fulfillment */}
                        <div className="mb-4 p-3 bg-secondary/50 rounded-xl text-sm space-y-1">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Entrega</p>
                          <p className="flex items-center gap-1.5">
                            {q.delivery_type === 'delivery' ? <MapPin className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                            <strong>{deliveryLabel(q.delivery_type)}</strong>
                          </p>
                          {q.sede && <p><strong>Sede:</strong> {sedeName(q.sede)}</p>}
                          {q.address && <p><strong>Dirección:</strong> {q.address}</p>}
                          {q.requested_date && (
                            <p className="flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5" />
                              <strong>Fecha deseada:</strong> {formatRequestedDate(q.requested_date)}
                            </p>
                          )}
                          {!q.delivery_type && !q.notes && <p className="text-muted-foreground">Sin datos de entrega.</p>}
                        </div>

                        {q.notes && (
                          <div className="mb-4 p-3 bg-secondary/50 rounded-xl">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Notas</p>
                            <p className="text-sm whitespace-pre-wrap">{q.notes}</p>
                          </div>
                        )}

                        {/* Items */}
                        <div className="mb-4">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Productos cotizados</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-left text-muted-foreground border-b">
                                <th className="py-2 font-medium">Producto</th>
                                <th className="py-2 font-medium text-center">Cant.</th>
                                <th className="py-2 font-medium text-right">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(q.items) && (q.items as Array<{ name: string; quantity: number; subtotal: number }>).map((item, i) => (
                                <tr key={i} className="border-b border-border/30">
                                  <td className="py-2">{item.name}</td>
                                  <td className="py-2 text-center">{item.quantity}</td>
                                  <td className="py-2 text-right">{formatPrice(item.subtotal)}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr>
                                <td colSpan={2} className="py-2 text-right font-semibold">Total:</td>
                                <td className="py-2 text-right font-display font-bold text-primary">{formatPrice(q.total)}</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Estado:</span>
                            <select
                              value={q.status}
                              disabled={updateStatus.isPending && updateStatus.variables?.id === q.id}
                              onChange={(e) => { e.stopPropagation(); updateStatus.mutate({ id: q.id, status: e.target.value as QuoteStatus }); }}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border-0 outline-none cursor-pointer disabled:opacity-60 ${statusColors[q.status]}`}
                            >
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                              ))}
                            </select>
                          </div>
                          <a
                            href={buildWaUrl(q.phone, waMessage(q))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                          {q.email && (
                            <a
                              href={`mailto:${q.email}?subject=${encodeURIComponent('Cotización Delicias Colombianas')}&body=${encodeURIComponent(`Hola ${q.contact_name},\n\nLe escribimos de Delicias Colombianas sobre su cotización.`)}`}
                              className="text-xs text-primary font-semibold hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Email
                            </a>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('¿Eliminar esta cotización permanentemente?')) {
                                deleteQuotation.mutate(q.id);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors ml-auto disabled:opacity-60"
                            disabled={isDeleting}
                          >
                            {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
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

export default AdminQuotations;
