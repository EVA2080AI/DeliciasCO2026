import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { formatCOP } from '@/lib/quotation';
import { COMANDA_CATEGORIES, fetchComandaProducts, type ComandaProduct } from '@/lib/comandas';
import type { Database } from '@/integrations/supabase/types';

type ComandaProductInsert = Database['public']['Tables']['comanda_products']['Insert'];

const emptyDraft: ComandaProductInsert = { name: '', category: COMANDA_CATEGORIES[0].id, price: 0, active: true };

const AdminComandas = () => {
  usePageTitle('Comandas');
  const qc = useQueryClient();
  const [draft, setDraft] = useState<(ComandaProductInsert & { id?: string }) | null>(null);

  const { data: products, isPending } = useAdminQuery({
    queryKey: ['admin-comanda-products'],
    queryFn: () => fetchComandaProducts(false),
  });

  const upsert = useMutation({
    mutationFn: async (product: ComandaProductInsert & { id?: string }) => {
      if (product.id) {
        const { error } = await supabase.from('comanda_products').update(product).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('comanda_products').insert(product);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.comandas);
      setDraft(null);
      toast.success('Producto guardado');
    },
    onError: (e: Error) => toast.error(`Error de Supabase: ${e.message}`),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comanda_products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.comandas);
      toast.success('Producto eliminado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (product: ComandaProduct) => {
      const { error } = await supabase
        .from('comanda_products')
        .update({ active: !product.active })
        .eq('id', product.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCms(qc, CMS_KEYS.comandas),
    onError: (e: Error) => toast.error(e.message),
  });

  const inputClass =
    'px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all';

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold">Comandas Panadería</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de consumo en mesa. Es aparte del menú de pedidos del sitio web.
          </p>
        </div>
        <button
          onClick={() => setDraft({ ...emptyDraft })}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </header>

      <AnimatePresence>
        {draft && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.name.trim() === '') return;
              upsert.mutate({ ...draft, name: draft.name.trim() });
            }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl border space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">{draft.id ? 'Editar producto' : 'Nuevo producto'}</h2>
                <button type="button" onClick={() => setDraft(null)} className="p-1.5 rounded-lg hover:bg-muted" aria-label="Cerrar">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="Nombre"
                  autoFocus
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={draft.price ?? 0}
                  onChange={(e) => setDraft({ ...draft, price: Math.max(0, Number(e.target.value)) })}
                  placeholder="Precio"
                  className={inputClass}
                />
                <select
                  value={draft.category ?? COMANDA_CATEGORIES[0].id}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  className={inputClass}
                >
                  {COMANDA_CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={draft.sort_order ?? 0}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                  placeholder="Orden"
                  className={inputClass}
                />
                <button
                  type="submit"
                  disabled={upsert.isPending || draft.name.trim() === ''}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {upsert.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Guardar
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {isPending && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}

      <div className="space-y-5">
        {COMANDA_CATEGORIES.map((cat) => {
          const rows = products?.filter((p) => p.category === cat.id) ?? [];
          if (rows.length === 0) return null;
          return (
            <section key={cat.id} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{cat.label}</h2>
              {rows.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border">
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm truncate ${p.active ? '' : 'text-muted-foreground line-through'}`}>
                      {p.name}
                    </p>
                    <p className="text-xs text-primary font-semibold">{formatCOP(p.price)}</p>
                  </div>
                  <button
                    onClick={() => toggleActive.mutate(p)}
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted"
                  >
                    {p.active ? 'Activo' : 'Oculto'}
                  </button>
                  <button onClick={() => setDraft(p)} className="p-2 rounded-lg hover:bg-muted" aria-label={`Editar ${p.name}`}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove.mutate(p.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                    aria-label={`Eliminar ${p.name}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
};

export default AdminComandas;
