import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAdminQuery } from '@/hooks/useAdminQuery';
import { usePageTitle } from '@/hooks/usePageTitle';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { ThumbImage } from '@/components/ThumbImage';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, Upload, Loader2, Image as ImageIcon, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { Switch } from '@/components/ui/switch';
import { uploadOptimizedImage, MAX_UPLOAD_BYTES } from '@/lib/storage';
import { MediaSelectorModal } from '@/components/admin/MediaSelectorModal';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image_url: string | null;
  read_time: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

const categoryOptions = [
  { id: 'historia', label: 'Historia' },
  { id: 'recetas', label: 'Recetas' },
  { id: 'tips', label: 'Tips' },
  { id: 'noticias', label: 'Noticias' },
];

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });

/** Slug URL-safe: minúsculas, sin acentos, guiones simples y sin guiones al inicio/final. */
const generateSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

/** El slug es la URL pública: dos artículos con el mismo slug se pisarían. */
const assertSlugAvailable = async (slug: string, excludeId?: string) => {
  let q = supabase.from('blog_posts').select('id').eq('slug', slug).limit(1);
  if (excludeId) q = q.neq('id', excludeId);
  const { data, error } = await q;
  if (error) throw error;
  if (data && data.length > 0) {
    throw new Error(`Ya existe un artículo con el slug "${slug}". Cambia el slug para poder guardar.`);
  }
};

const AdminBlog = () => {
  usePageTitle('Blog');
  const qc = useQueryClient();
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [pubFilter, setPubFilter] = useState<string>('all');

  const { data: posts, isLoading } = useAdminQuery({
    queryKey: ['admin-blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as BlogPost[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (post: Partial<BlogPost> & { id?: string }) => {
      if (!post.slug || !post.title) throw new Error('Título y slug son requeridos');
      await assertSlugAvailable(post.slug, post.id);
      if (post.id) {
        const { error } = await supabase.from('blog_posts').update(post).eq('id', post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_posts').insert({ ...post, slug: post.slug, title: post.title });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.blog);
      setEditing(null);
      setCreating(false);
      toast.success('Artículo guardado');
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('blog_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.blog);
      toast.success('Artículo eliminado');
    },
    onError: (e) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published, publishedAt }: { id: string; published: boolean; publishedAt: string | null }) => {
      // La fecha de publicación original se conserva: solo se fija la primera vez que se publica.
      const patch: { published: boolean; published_at?: string } = { published };
      if (published && !publishedAt) patch.published_at = new Date().toISOString();
      const { error } = await supabase.from('blog_posts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCms(qc, CMS_KEYS.blog);
      toast.success('Estado actualizado');
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = posts?.filter((p) => {
    const matchSearch = search === '' || p.title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === 'all' || p.category === catFilter;
    const matchPub = pubFilter === 'all' || (pubFilter === 'published' ? p.published : !p.published);
    return matchSearch && matchCat && matchPub;
  }) || [];

  const publishedCount = posts?.filter(p => p.published).length || 0;
  const draftCount = posts?.filter(p => !p.published).length || 0;

  const showForm = creating || editing;
  const inputClass = "px-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl">Blog</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {posts?.length || 0} artículos · {publishedCount} publicados · {draftCount} borradores
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCreating(true); setEditing(null); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-gold font-semibold text-primary-foreground text-sm shadow-gold"
          >
            <Plus className="w-4 h-4" /> Nuevo Artículo
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
            placeholder="Buscar artículo..."
            className={`${inputClass} pl-10 w-full`}
          />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={inputClass}>
          <option value="all">Todas las categorías</option>
          {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={pubFilter} onChange={(e) => setPubFilter(e.target.value)} className={inputClass}>
          <option value="all">Todos</option>
          <option value="published">Publicados</option>
          <option value="draft">Borradores</option>
        </select>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            key="blog-form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <BlogPostForm
              // Remonta el formulario al cambiar de artículo: sin esto, editar B tras A guardaba A sobre B.
              key={editing?.id ?? 'new'}
              post={editing}
              onSave={(p) => upsertMutation.mutate(p)}
              onClose={() => { setEditing(null); setCreating(false); }}
              saving={upsertMutation.isPending}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((post) => (
            <div
              key={post.id}
              onClick={() => { setEditing(post); setCreating(false); }}
              className="flex items-center gap-4 p-4 bg-card border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
            >
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                {post.image_url ? (
                  <ThumbImage src={post.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{post.title}</h3>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    post.published ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'
                  }`}>
                    {post.published ? 'Publicado' : 'Borrador'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{[post.category, post.read_time, formatDate(post.created_at)].filter(Boolean).join(' · ')}</p>
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                {post.published ? (
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-secondary transition-colors"
                    title="Ver artículo en el sitio"
                  >
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </a>
                ) : (
                  <span className="p-2 rounded-lg opacity-40 cursor-not-allowed" title="Los borradores no se ven en el sitio: publica el artículo para verlo">
                    <ExternalLink className="w-4 h-4 text-muted-foreground" />
                  </span>
                )}
                <button
                  onClick={() => togglePublish.mutate({ id: post.id, published: !post.published, publishedAt: post.published_at })}
                  disabled={togglePublish.isPending && togglePublish.variables?.id === post.id}
                  className="p-2 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                  title={post.published ? 'Despublicar' : 'Publicar'}
                >
                  {post.published ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => { setEditing(post); setCreating(false); }} className="p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Pencil className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => { if (confirm('¿Eliminar artículo?')) deleteMutation.mutate(post.id); }} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-4 h-4 text-destructive/60" />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center py-12 text-muted-foreground">
              {search || catFilter !== 'all' || pubFilter !== 'all' ? 'No se encontraron artículos.' : 'No hay artículos. Crea el primero.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const BlogPostForm = ({
  post,
  onSave,
  onClose,
  saving,
}: {
  post: BlogPost | null;
  onSave: (p: Partial<BlogPost> & { id?: string }) => void;
  onClose: () => void;
  saving: boolean;
}) => {
  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [category, setCategory] = useState(post?.category ?? 'historia');
  const [readTime, setReadTime] = useState(post?.read_time ?? '5 min');
  const [imageUrl, setImageUrl] = useState(post?.image_url ?? '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [uploading, setUploading] = useState(false);
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass = "w-full px-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!post) setSlug(generateSlug(value));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Solo imágenes'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast.error('Máximo 12MB'); return; }
    setUploading(true);
    try {
      const { url } = await uploadOptimizedImage({ file, preset: 'blog', prefix: 'blog' });
      setImageUrl(url);
      toast.success('Imagen subida correctamente');
    } catch (err: unknown) { toast.error(`Error: ${err instanceof Error ? err.message : 'inténtalo de nuevo'}`); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = generateSlug(slug);
    if (!title.trim() || !cleanSlug) { toast.error('Título y slug son requeridos'); return; }
    if (cleanSlug !== slug) setSlug(cleanSlug);
    onSave({
      ...(post?.id ? { id: post.id } : {}),
      title: title.trim(),
      slug: cleanSlug,
      excerpt: excerpt.trim(),
      content: content.trim(),
      category,
      read_time: readTime,
      image_url: imageUrl.trim() || null,
      published,
      published_at: published ? (post?.published_at || new Date().toISOString()) : null,
    });
  };

  return (
    <div className="mb-6">
      <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-6 shadow-medium space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">{post ? 'Editar Artículo' : 'Nuevo Artículo'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Título *" className={inputClass} />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug (URL) *" className={inputClass} />
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <input value={readTime} onChange={(e) => setReadTime(e.target.value)} placeholder="Tiempo de lectura" className={inputClass} />
        </div>

        <div className="flex gap-2">
          <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="URL de imagen de portada" className={`${inputClass} flex-1`} />
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
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? '' : 'Subir'}
          </button>
        </div>

        <MediaSelectorModal 
          isOpen={mediaSelectorOpen} 
          onClose={() => setMediaSelectorOpen(false)} 
          onSelect={setImageUrl} 
        />

        {imageUrl && (
          <div className="flex items-center gap-3">
            <ThumbImage src={imageUrl} alt="Preview" className="w-24 h-16 rounded-xl object-cover border" />
            <button type="button" onClick={() => setImageUrl('')} className="text-xs text-destructive hover:underline">Quitar</button>
          </div>
        )}

        <input value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Extracto / Resumen (aparece en listados)" className={inputClass} />

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Contenido del artículo</label>
            <span className="text-[11px] text-muted-foreground">{wordCount} palabras</span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe el contenido del artículo aquí... Separa los párrafos con una línea en blanco."
            rows={14}
            className={`${inputClass} resize-y min-h-[250px] font-mono text-[13px] leading-relaxed`}
          />
          <p className="text-[11px] text-muted-foreground mt-1">Separa los párrafos con una línea en blanco. Usa **texto** para negritas.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch id="blog-published" checked={published} onCheckedChange={setPublished} />
            <label htmlFor="blog-published" className="text-sm font-medium cursor-pointer">Publicado</label>
          </div>
          {post?.slug && post.published ? (
            <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary font-semibold flex items-center gap-1 hover:underline">
              <ExternalLink className="w-3.5 h-3.5" /> Ver en el sitio
            </a>
          ) : post?.slug ? (
            <span className="text-xs text-muted-foreground flex items-center gap-1" title="Los borradores no se muestran en el sitio público">
              <EyeOff className="w-3.5 h-3.5" /> Vista previa disponible al publicar
            </span>
          ) : null}
        </div>

        <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving} className="w-full py-3 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold disabled:opacity-50">
          {saving ? 'Guardando...' : 'Guardar Artículo'}
        </motion.button>
      </form>
    </div>
  );
};

export default AdminBlog;