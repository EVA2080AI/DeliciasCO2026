import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatCOP } from '@/lib/quotation';
import { comandaTotal, fetchComandas } from '@/lib/comandas';
import { ComandasNav } from '@/components/comandas/ComandasNav';

const ComandasCaja = () => {
  usePageTitle('Comandas · Caja');
  const qc = useQueryClient();

  const { data: comandas, isPending, error } = useQuery({
    queryKey: ['comandas', 'sin-pagar'],
    queryFn: () => fetchComandas('sin-pagar'),
    refetchInterval: 10_000,
  });

  const markPaid = useMutation({
    // Solo cobra si la mesa sigue sin pagar: si otra caja la cobró primero, no cambia
    // ninguna fila y avisamos en vez de cobrar dos veces.
    mutationFn: async (comandaId: string) => {
      const { data, error: updateError } = await supabase
        .from('comandas')
        .update({ paid: true, paid_at: new Date().toISOString(), status: 'cerrada' })
        .eq('id', comandaId)
        .eq('paid', false)
        .select('id');
      if (updateError) throw updateError;
      if (!data || data.length === 0) throw new Error('Esa mesa ya figura como pagada.');
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comandas'] });
      toast.success('Mesa cobrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const porCobrar = comandas?.reduce((sum, c) => sum + comandaTotal(c.comanda_items), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <ComandasNav title="Caja" subtitle={`Por cobrar: ${formatCOP(porCobrar)}`} />

      <section className="p-4 space-y-3">
        {isPending && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {error && <p className="text-sm text-destructive">No se pudieron cargar las comandas: {error.message}</p>}
        {comandas?.length === 0 && !isPending && (
          <p className="text-sm text-muted-foreground py-12 text-center">No hay mesas por cobrar.</p>
        )}

        <AnimatePresence initial={false}>
          {comandas?.map((c) => {
            const total = comandaTotal(c.comanda_items);
            const enviada = c.status === 'cerrada';
            return (
              <motion.article
                key={c.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-xl border overflow-hidden ${enviada ? 'border-primary' : ''}`}
              >
                <header className="px-4 py-2.5 bg-muted/50 flex items-baseline justify-between gap-3">
                  <h2 className="font-display font-bold truncate">{c.mesa}</h2>
                  <span className="text-xs text-muted-foreground truncate">
                    {c.mesera} · {enviada ? 'lista para cobrar' : 'sigue pidiendo'}
                  </span>
                </header>

                <ul className="divide-y">
                  {c.comanda_items.map((item) => (
                    <li key={item.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                      <span className="w-6 text-muted-foreground">{item.quantity}×</span>
                      <span className="flex-1 min-w-0 truncate">{item.name}</span>
                      <span className="font-medium">{formatCOP(item.unit_price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                <div className="px-4 py-3 border-t flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-display font-bold text-primary">{formatCOP(total)}</p>
                  </div>
                  <button
                    onClick={() => markPaid.mutate(c.id)}
                    disabled={c.comanda_items.length === 0 || markPaid.isPending}
                    className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40"
                  >
                    {markPaid.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
                    Marcar pagada
                  </button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default ComandasCaja;
