import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Upload, Image as ImageIcon, Loader2, Search, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { Switch } from '@/components/ui/switch';
import { MediaSelectorModal } from '@/components/admin/MediaSelectorModal';
import { compressImage } from '@/lib/imageCompression';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type Category = Database['public']['Enums']['product_category'];

const categories: { id: Category; label: string }[] = [
  { id: 'pasteleria', label: 'Pasteles' },
  { id: 'pies', label: 'Pies' },
  { id: 'delicias', label: 'Delicias de Panadería' },
  { id: 'bebidas', label: 'Bebidas Frías' },
  { id: 'cafeteria', label: 'Cafetería' },
  { id: 'combos', label: 'Combos' },
];

const formatPrice = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

const AdminProducts = () => {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (product: ProductInsert & { id?: string }) => {
      if (product.id) {
        const { error } = await supabase.from('products').update(product).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(product);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      setEditing(null);
      setCreating(false);
      toast.success('Producto guardado');
    },
    onError: (e) => {
      console.error('SUPABASE_PRODUCTS_ERROR:', e);
      toast.error(`Error de Supabase: ${e.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success('Producto eliminado');
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: Product[]) => {
      const updates = reordered.map((p, i) => ({ id: p.id, sort_order: i }));
      for (const u of updates) {
        const { error } = await supabase.from('products').update({ sort_order: u.sort_order }).eq('id', u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-products'] });
      qc.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (e) => toast.error('Error al reordenar: ' + e.message),
  });

  const handleReorder = useCallback((newOrder: Product[]) => {
    qc.setQueryData(['admin-products'], newOrder);
  }, [qc]);

  const handleReorderEnd = useCallback(() => {
    const current = qc.getQueryData<Product[]>(['admin-products']);
    if (current) reorderMutation.mutate(current);
  }, [qc, reorderMutation]);

  const showForm = creating || editing;

  const filtered = products?.filter((p) => {
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    return matchSearch && matchCat;
  }) || [];

  const activeCount = products?.filter(p => p.active).length || 0;
  const featuredCount = products?.filter(p => p.featured).length || 0;

  const inputClass = "px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl">Productos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {products?.length || 0} productos · {activeCount} activos · {featuredCount} destacados
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCreating(true); setEditing(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-gold font-semibold text-primary-foreground text-sm shadow-gold"
          >
            <Plus className="w-4 h-4" /> Nuevo Producto
          </motion.button>
        </div>
      </FadeInWhenVisible>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className={`${inputClass} pl-10 w-full`}
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={inputClass}>
          <option value="all">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <AnimatePresence>
        {showForm && (
          <ProductForm
            product={editing}
            onSave={(p) => upsertMutation.mutate(p)}
            onClose={() => { setEditing(null); setCreating(false); }}
            saving={upsertMutation.isPending}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : (
        <>
          {catFilter === 'all' && search === '' ? (
            <Reorder.Group
              axis="y"
              values={filtered}
              onReorder={handleReorder}
              className="space-y-2"
            >
              {filtered.map((p) => (
                <Reorder.Item
                  key={p.id}
                  value={p}
                  onDragEnd={handleReorderEnd}
                  className="flex items-center gap-3 p-4 bg-card border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-grab active:cursor-grabbing group"
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => { setEditing(p); setCreating(false); }}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                      {!p.active && <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive font-semibold">Inactivo</span>}
                      {p.featured && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-semibold">Destacado</span>}
                      {p.requires_advance_notice && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 font-semibold">24h Aviso</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.category} · {formatPrice(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setEditing(p); setCreating(false); }}
                      className="p-2 rounded-lg text-muted-foreground group-hover:text-primary transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar producto?')) deleteMutation.mutate(p.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive/60" />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          ) : (
            <div className="space-y-2">
              {filtered.map((p) => (
                <div
                  key={p.id}
                  onClick={() => { setEditing(p); setCreating(false); }}
                  className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                      {!p.active && <span className="px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive font-semibold">Inactivo</span>}
                      {p.featured && <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary/10 text-primary font-semibold">Destacado</span>}
                      {p.requires_advance_notice && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 font-semibold">24h Aviso</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{p.category} · {formatPrice(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="p-2 rounded-lg text-muted-foreground group-hover:text-primary transition-colors">
                      <Pencil className="w-4 h-4" />
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('¿Eliminar producto?')) deleteMutation.mutate(p.id); }}
                      className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-destructive/60" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">
              {search || catFilter !== 'all' ? 'No se encontraron productos.' : 'No hay productos. Crea el primero.'}
            </p>
          )}
        </>
      )}
    </div>
  );
};

const ProductForm = ({
  product,
  onSave,
  onClose,
  saving,
}: {
  product: Product | null;
  onSave: (p: ProductInsert & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) => {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [longDescription, setLongDescription] = useState(product?.long_description ?? '');
  const [price, setPrice] = useState(product?.price?.toString() ?? '');
  const [category, setCategory] = useState<Category>(product?.category ?? 'pasteleria');
  const [imageUrl, setImageUrl] = useState(product?.image_url ?? '');
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [active, setActive] = useState(product?.active ?? true);
  const [requiresAdvanceNotice, setRequiresAdvanceNotice] = useState(product?.requires_advance_notice ?? false);
  const [sortOrder, setSortOrder] = useState(product?.sort_order?.toString() ?? '0');
  const [uploading, setUploading] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass = "w-full px-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('La imagen no debe superar 5MB'); return; }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `product-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, compressedFile);
      if (error) throw error;
      
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      setImageUrl(urlData.publicUrl);
      toast.success('Imagen subida correctamente');
    } catch (err: any) {
      toast.error(`Error al subir imagen: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price) { toast.error('Nombre y precio son requeridos'); return; }
    onSave({
      ...(product?.id ? { id: product.id } : {}),
      name: name.trim(),
      description: description.trim(),
      long_description: longDescription.trim() || null,
      price: parseInt(price),
      category,
      image_url: imageUrl.trim() || null,
      featured,
      active,
      requires_advance_notice: requiresAdvanceNotice,
      sort_order: parseInt(sortOrder) || 0,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden"
    >
      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 shadow-medium space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">{product ? 'Editar Producto' : 'Nuevo Producto'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre *" className={inputClass} />
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} placeholder="Precio (COP) *" className={inputClass} />
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className={inputClass}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value.replace(/\D/g, ''))} placeholder="Orden de aparición" className={inputClass} />
          <div className="sm:col-span-2 flex gap-2">
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL de imagen" className={`${inputClass} flex-1`} />
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
            <button
              type="button"
              onClick={() => setMediaSelectorOpen(true)}
              className="px-3 rounded-xl border bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1.5 text-sm font-medium shrink-0"
              title="Seleccionar de la Librería"
            >
              <ImageIcon className="w-4 h-4" /> Librería
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="px-3 rounded-xl border bg-secondary hover:bg-secondary/80 transition-colors flex items-center gap-1.5 text-sm font-medium disabled:opacity-50 shrink-0"
              title="Subir archivo nuevo"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? '' : 'Subir'}
            </button>
          </div>
        </div>

        <MediaSelectorModal 
          isOpen={mediaSelectorOpen} 
          onClose={() => setMediaSelectorOpen(false)} 
          onSelect={setImageUrl} 
        />

        {imageUrl && (
          <div className="flex items-center gap-3">
            <img src={imageUrl} alt="Preview" className="w-20 h-20 rounded-xl object-cover border" />
            <button type="button" onClick={() => setImageUrl('')} className="text-xs text-destructive hover:underline">Quitar imagen</button>
          </div>
        )}

        <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción corta" className={inputClass} />
        <textarea value={longDescription} onChange={(e) => setLongDescription(e.target.value)} placeholder="Descripción larga (página de detalle)" rows={3} className={`${inputClass} resize-none`} />

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="product-featured" checked={featured} onCheckedChange={setFeatured} />
            <label htmlFor="product-featured" className="text-sm font-medium cursor-pointer">Destacado en home</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="product-active" checked={active} onCheckedChange={setActive} />
            <label htmlFor="product-active" className="text-sm font-medium cursor-pointer">Visible en menú</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="product-notice" checked={requiresAdvanceNotice} onCheckedChange={setRequiresAdvanceNotice} />
            <label htmlFor="product-notice" className="text-sm font-medium cursor-pointer text-amber-500">Aviso reservación (24h)</label>
          </div>
        </div>

        <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar Producto'}
        </motion.button>
      </form>
    </motion.div>
  );
};

export default AdminProducts;