import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { formatCOP } from '@/lib/quotation';
import {
  COMANDA_CATEGORIES,
  fetchComandaMesas,
  fetchComandaProducts,
  type ComandaMesa,
  type ComandaProduct,
} from '@/lib/comandas';
import type { Database } from '@/integrations/supabase/types';

type ComandaProductInsert = Database['public']['Tables']['comanda_products']['Insert'];

const emptyDraft: ComandaProductInsert = { name: '', category: COMANDA_CATEGORIES[0].id, price: 0, active: true };

// Las tres pantallas del salón viven fuera del panel y se entra por link directo. Sin esto, el
// dueño no tiene de dónde sacarlas para pasárselas al personal.
const SALON_LINKS = [
  { path: '/comandas', label: 'Mesera', hint: 'Este es el que se comparte con las meseras' },
  { path: '/comandas/cocina', label: 'Cocina', hint: 'Lo que falta preparar' },
  { path: '/comandas/caja', label: 'Caja', hint: 'Cada mesa con su total y si ya pagó' },
];

const AdminComandas = () => {
  usePageTitle('Comandas');
  const qc = useQueryClient();
  const [draft, setDraft] = useState<(ComandaProductInsert & { id?: string }) | null>(null);
  const [mesaDraft, setMesaDraft] = useState('');

  const { data: products, isPending } = useAdminQuery({
    queryKey: ['admin-comanda-products'],
    queryFn: () => fetchComandaProducts(false),
  });

  // El admin ve también las ocultas: son las que la mesera no puede tocar hoy.
  const { data: mesas, isPending: loadingMesas } = useAdminQuery({
    queryKey: ['admin-comanda-mesas'],
    queryFn: () => fetchComandaMesas(false),
  });

  // El nombre es único en la base: sin eso volvemos a "Mesa 5" y "mesa 5" como dos cuentas.
  const duplicada = (error: { code?: string; message: string }, name: string) =>
    new Error(error.code === '23505' ? `Ya hay una mesa llamada "${name}".` : error.message);

  const addMesa = useMutation({
    mutationFn: async (name: string) => {
      // El orden siguiente se pregunta a la base, no a la lista en caché: cargando
      // varias mesas seguidas, react-query todavía no había refrescado y dos altas
      // calculaban el mismo sort_order.
      const { data: ultima, error: errorOrden } = await supabase
        .from('comanda_mesas')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (errorOrden) throw errorOrden;
      const { error } = await supabase
        .from('comanda_mesas')
        .insert({ name, sort_order: (ultima?.sort_order ?? -1) + 1 });
      if (error) throw duplicada(error, name);
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.comandas);
      setMesaDraft('');
      toast.success('Mesa agregada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMesa = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('comanda_mesas').update({ name }).eq('id', id);
      if (error) throw duplicada(error, name);
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.comandas);
      toast.success('Mesa renombrada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMesa = useMutation({
    mutationFn: async (mesa: ComandaMesa) => {
      const { error } = await supabase
        .from('comanda_mesas')
        .update({ active: !mesa.active })
        .eq('id', mesa.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCms(qc, CMS_KEYS.comandas),
    onError: (e: Error) => toast.error(e.message),
  });

  const moveMesa = useMutation({
    mutationFn: async ({ mesa, delta }: { mesa: ComandaMesa; delta: -1 | 1 }) => {
      const lista = [...(mesas ?? [])];
      const desde = lista.findIndex((m) => m.id === mesa.id);
      const hasta = desde + delta;
      if (desde < 0 || hasta < 0 || hasta >= lista.length) return;
      [lista[desde], lista[hasta]] = [lista[hasta], lista[desde]];
      // Renumera la lista entera en vez de intercambiar dos valores: el salón tiene
      // pocas mesas, y así se arreglan solos los empates de sort_order que deja
      // cualquier carga hecha por fuera del panel (con un empate, intercambiar no
      // movería nada y la flecha parecería rota).
      const results = await Promise.all(
        lista.map((m, idx) => supabase.from('comanda_mesas').update({ sort_order: idx }).eq('id', m.id)),
      );
      const fallo = results.find((r) => r.error);
      if (fallo?.error) throw fallo.error;
    },
    onSuccess: () => invalidateCms(qc, CMS_KEYS.comandas),
    onError: (e: Error) => toast.error(e.message),
  });

  const removeMesa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('comanda_mesas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.comandas);
      toast.success('Mesa eliminada');
    },
    onError: (e: Error) => toast.error(e.message),
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

  // El dominio cambia entre el preview y producción: se lee del navegador en vez de fijarlo.
  const origin = typeof window === 'undefined' ? '' : window.location.origin;

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar. Mantén pulsado el link para copiarlo a mano.');
    }
  };

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

      <section className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Pantallas del salón</h2>
          <p className="text-xs text-muted-foreground">
            Se entra por link, sin usuario ni contraseña. La mesera escribe su nombre al empezar el turno.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SALON_LINKS.map(({ path, label, hint }) => {
            const url = `${origin}${path}`;
            return (
              <div key={path} className="rounded-lg border p-3 space-y-2">
                <div>
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground break-all">{url}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => copyLink(url)}
                    className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted flex items-center justify-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copiar
                  </button>
                  <a
                    href={path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Abrir
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border p-4 space-y-3">
        <div>
          <h2 className="font-semibold text-sm">Mesas del salón</h2>
          <p className="text-xs text-muted-foreground">
            La mesera toca una de estas en vez de escribir el nombre. Renombrar o quitar una mesa no
            cambia las cuentas que ya se cobraron.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = mesaDraft.trim();
            if (clean === '') return;
            addMesa.mutate(clean);
          }}
          className="flex gap-2"
        >
          <input
            value={mesaDraft}
            onChange={(e) => setMesaDraft(e.target.value)}
            placeholder="Mesa 5, Barra, Para llevar…"
            className={`${inputClass} flex-1 min-w-0`}
          />
          <button
            type="submit"
            disabled={mesaDraft.trim() === '' || addMesa.isPending}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center gap-1.5 shrink-0"
          >
            {addMesa.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar
          </button>
        </form>

        {loadingMesas && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}

        {!loadingMesas && mesas?.length === 0 && (
          <p className="text-xs text-muted-foreground">
            Todavía no hay mesas cargadas. Mientras la lista esté vacía, la mesera sigue escribiendo
            el nombre a mano, como hasta ahora.
          </p>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {mesas?.map((m, i) => (
            <div key={`${m.id}-${m.name}`} className="flex items-center gap-2 p-2 rounded-lg border">
              <div className="flex flex-col shrink-0">
                <button
                  onClick={() => moveMesa.mutate({ mesa: m, delta: -1 })}
                  disabled={i === 0 || moveMesa.isPending}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  aria-label={`Subir ${m.name}`}
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => moveMesa.mutate({ mesa: m, delta: 1 })}
                  disabled={i === (mesas?.length ?? 0) - 1 || moveMesa.isPending}
                  className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                  aria-label={`Bajar ${m.name}`}
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                defaultValue={m.name}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') e.currentTarget.blur();
                }}
                onBlur={(e) => {
                  const clean = e.target.value.trim();
                  if (clean === '' || clean === m.name) {
                    e.target.value = m.name;
                    return;
                  }
                  renameMesa.mutate({ id: m.id, name: clean });
                }}
                aria-label={`Nombre de ${m.name}`}
                className={`flex-1 min-w-0 bg-transparent px-2 py-1 rounded-md text-sm outline-none focus:ring-2 focus:ring-primary/20 ${
                  m.active ? '' : 'text-muted-foreground line-through'
                }`}
              />
              <button
                onClick={() => toggleMesa.mutate(m)}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-muted shrink-0"
              >
                {m.active ? 'Activa' : 'Oculta'}
              </button>
              <button
                onClick={() => removeMesa.mutate(m.id)}
                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive shrink-0"
                aria-label={`Eliminar ${m.name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

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
