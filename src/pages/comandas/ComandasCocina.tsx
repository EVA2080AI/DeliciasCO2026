import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { fetchComandas } from '@/lib/comandas';
import { ComandasNav } from '@/components/comandas/ComandasNav';

const ComandasCocina = () => {
  usePageTitle('Comandas · Cocina');
  const qc = useQueryClient();

  const { data: comandas, isPending, error } = useQuery({
    queryKey: ['comandas', 'sin-pagar'],
    queryFn: () => fetchComandas('sin-pagar'),
    refetchInterval: 10_000,
  });

  const markReady = useMutation({
    mutationFn: async (itemId: string) => {
      const { error: updateError } = await supabase.from('comanda_items').update({ ready: true }).eq('id', itemId);
      if (updateError) throw updateError;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comandas'] }),
    onError: (e: Error) => toast.error(`No se pudo marcar: ${e.message}`),
  });

  // Solo las mesas que tienen algo sin entregar.
  const pending = comandas
    ?.map((c) => ({ ...c, comanda_items: c.comanda_items.filter((i) => !i.ready) }))
    .filter((c) => c.comanda_items.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <ComandasNav title="Cocina" subtitle="Lo que falta por preparar" />

      <section className="p-4 space-y-3">
        {isPending && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {error && <p className="text-sm text-destructive">No se pudieron cargar las comandas: {error.message}</p>}
        {pending?.length === 0 && !isPending && (
          <p className="text-sm text-muted-foreground py-12 text-center">Todo al día. No hay nada pendiente.</p>
        )}

        <AnimatePresence initial={false}>
          {pending?.map((c) => (
            <motion.article
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border overflow-hidden"
            >
              <header className="px-4 py-2.5 bg-muted/50 flex items-baseline justify-between gap-3">
                <h2 className="font-display font-bold truncate">{c.mesa}</h2>
                <span className="text-xs text-muted-foreground truncate">{c.mesera}</span>
              </header>
              <ul className="divide-y">
                {c.comanda_items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 text-primary font-bold text-sm flex items-center justify-center">
                      {item.quantity}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.name}</p>
                      {item.notes !== '' && item.notes !== null && (
                        <p className="text-xs text-muted-foreground truncate">{item.notes}</p>
                      )}
                    </div>
                    <button
                      onClick={() => markReady.mutate(item.id)}
                      disabled={markReady.isPending}
                      className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Check className="w-4 h-4" />
                      Listo
                    </button>
                  </li>
                ))}
              </ul>
            </motion.article>
          ))}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default ComandasCocina;
