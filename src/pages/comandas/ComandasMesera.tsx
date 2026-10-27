import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, Loader2, Minus, Plus, Trash2, UtensilsCrossed } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import { formatCOP } from '@/lib/quotation';
import {
  COMANDA_CATEGORIES,
  comandaTotal,
  fetchComandaProducts,
  fetchComandas,
  readMesera,
  saveMesera,
  type ComandaWithItems,
} from '@/lib/comandas';
import { ComandasNav } from '@/components/comandas/ComandasNav';

const ComandasMesera = () => {
  usePageTitle('Comandas · Mesera');
  const qc = useQueryClient();
  const [mesera, setMesera] = useState(readMesera);
  const [nameDraft, setNameDraft] = useState('');
  const [mesaDraft, setMesaDraft] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [category, setCategory] = useState(COMANDA_CATEGORIES[0].id);

  const { data: comandas, isPending: loadingComandas, error: comandasError } = useQuery({
    queryKey: ['comandas', 'abiertas'],
    queryFn: () => fetchComandas('abiertas'),
    refetchInterval: 10_000,
    enabled: mesera !== '',
  });

  const { data: products, isPending: loadingProducts } = useQuery({
    queryKey: ['comanda-products', 'activos'],
    queryFn: () => fetchComandaProducts(true),
    enabled: mesera !== '',
  });

  const openComanda = useMutation({
    mutationFn: async (mesa: string) => {
      const { data, error } = await supabase
        .from('comandas')
        .insert({ mesa, mesera })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: ['comandas'] });
      setMesaDraft('');
      setOpenId(created.id);
    },
    onError: (e: Error) => toast.error(`No se pudo abrir la mesa: ${e.message}`),
  });

  const addItem = useMutation({
    // La RPC suma dentro de la sentencia y lee el precio del catálogo en el servidor:
    // un doble toque no pierde unidades y el cliente no decide cuánto cuesta nada.
    mutationFn: async ({ comandaId, productId }: { comandaId: string; productId: string }) => {
      const { error } = await supabase.rpc('add_comanda_item', {
        p_comanda_id: comandaId,
        p_product_id: productId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comandas'] }),
    onError: (e: Error) => toast.error(`No se pudo agregar: ${e.message}`),
  });

  const setQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from('comanda_items').delete().eq('id', itemId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from('comanda_items').update({ quantity }).eq('id', itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['comandas'] }),
    onError: (e: Error) => toast.error(`No se pudo actualizar: ${e.message}`),
  });

  const closeComanda = useMutation({
    mutationFn: async (comandaId: string) => {
      const { error } = await supabase.from('comandas').update({ status: 'cerrada' }).eq('id', comandaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comandas'] });
      setOpenId(null);
      toast.success('Mesa enviada a caja');
    },
    onError: (e: Error) => toast.error(`No se pudo cerrar: ${e.message}`),
  });

  // ─── Sin nombre todavía: el turno empieza aquí ────────────────────────────
  if (mesera === '') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const clean = nameDraft.trim();
            if (clean === '') return;
            saveMesera(clean);
            setMesera(clean);
          }}
          className="w-full max-w-sm space-y-5 text-center"
        >
          <UtensilsCrossed className="w-12 h-12 mx-auto text-primary" />
          <div>
            <h1 className="text-2xl font-display font-bold">Comandas Panadería</h1>
            <p className="text-sm text-muted-foreground mt-1">Escribe tu nombre para empezar el turno.</p>
          </div>
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Tu nombre"
            autoFocus
            className="w-full px-4 py-3 rounded-xl border bg-background text-center outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          <button
            type="submit"
            disabled={nameDraft.trim() === ''}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const active: ComandaWithItems | undefined = comandas?.find((c) => c.id === openId);

  // ─── Detalle de una mesa ──────────────────────────────────────────────────
  if (active) {
    const items = active.comanda_items;
    const total = comandaTotal(items);
    const visible = products?.filter((p) => p.category === category) ?? [];

    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => setOpenId(null)} className="p-2 -ml-2 rounded-lg hover:bg-muted" aria-label="Volver">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-bold truncate">{active.mesa}</h1>
            <p className="text-xs text-muted-foreground truncate">Mesera: {active.mesera}</p>
          </div>
        </header>

        <section className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">En la cuenta</h2>
          {items.length === 0 && <p className="text-sm text-muted-foreground py-4">Todavía no hay nada pedido.</p>}
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCOP(item.unit_price)} c/u · {item.ready ? 'listo en cocina' : 'en preparación'}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setQuantity.mutate({ itemId: item.id, quantity: item.quantity - 1 })}
                  className="p-1.5 rounded-lg border hover:bg-muted"
                  aria-label={item.quantity === 1 ? `Quitar ${item.name}` : `Menos ${item.name}`}
                >
                  {item.quantity === 1 ? <Trash2 className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </button>
                <span className="w-7 text-center font-semibold text-sm">{item.quantity}</span>
                <button
                  onClick={() => setQuantity.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                  className="p-1.5 rounded-lg border hover:bg-muted"
                  aria-label={`Más ${item.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <span className="w-20 text-right font-semibold text-sm">{formatCOP(item.unit_price * item.quantity)}</span>
            </div>
          ))}
        </section>

        <section className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Agregar</h2>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {COMANDA_CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap border transition-colors ${
                  category === c.id ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {loadingProducts && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          <div className="grid grid-cols-2 gap-2">
            {visible.map((p) => (
              <button
                key={p.id}
                onClick={() => addItem.mutate({ comandaId: active.id, productId: p.id })}
                className="p-3 rounded-xl border text-left hover:border-primary hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-primary font-semibold mt-1">{formatCOP(p.price)}</p>
              </button>
            ))}
          </div>
        </section>

        <div className="fixed bottom-0 inset-x-0 bg-background/95 backdrop-blur border-t p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-2xl font-display font-bold text-primary">{formatCOP(total)}</span>
          </div>
          <button
            onClick={() => closeComanda.mutate(active.id)}
            disabled={items.length === 0 || closeComanda.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {closeComanda.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Enviar a caja
          </button>
        </div>
      </div>
    );
  }

  // ─── Lista de mesas abiertas ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <ComandasNav title="Comandas" subtitle={`Mesera: ${mesera}`} />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const clean = mesaDraft.trim();
          if (clean === '') return;
          openComanda.mutate(clean);
        }}
        className="p-4 flex gap-2"
      >
        <input
          value={mesaDraft}
          onChange={(e) => setMesaDraft(e.target.value)}
          placeholder="Mesa 5, Barra, Para llevar…"
          className="flex-1 px-4 py-2.5 rounded-xl border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
        <button
          type="submit"
          disabled={mesaDraft.trim() === '' || openComanda.isPending}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center gap-1.5"
        >
          {openComanda.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Abrir
        </button>
      </form>

      <section className="px-4 pb-8 space-y-2">
        {loadingComandas && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
        {comandasError && (
          <p className="text-sm text-destructive py-8 text-center">
            No se pudieron cargar las mesas: {comandasError.message}
          </p>
        )}
        {comandas?.length === 0 && !loadingComandas && (
          <p className="text-sm text-muted-foreground py-8 text-center">No hay mesas abiertas.</p>
        )}
        <AnimatePresence initial={false}>
          {comandas?.map((c) => (
            <motion.button
              key={c.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpenId(c.id)}
              className="w-full p-4 rounded-xl border text-left hover:border-primary transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">{c.mesa}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {c.mesera} · {c.comanda_items.length} producto{c.comanda_items.length === 1 ? '' : 's'}
                </p>
              </div>
              <span className="font-display font-bold text-primary whitespace-nowrap">
                {formatCOP(comandaTotal(c.comanda_items))}
              </span>
            </motion.button>
          ))}
        </AnimatePresence>
      </section>
    </div>
  );
};

export default ComandasMesera;
