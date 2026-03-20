import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, GlobeLock, Pencil, Check, X, Layers, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { Switch } from '@/components/ui/switch';

interface Page {
  id: string;
  slug: string;
  title: string;
  description: string;
  active: boolean;
  sort_order: number;
}

const AdminPages = () => {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['admin-pages'],
    queryFn: async () => {
      const { data, error } = await supabase.from('pages').select('*').order('sort_order');
      if (error) throw error;
      return data as Page[];
    },
  });

  // Count sections per page
  const { data: sectionCounts } = useQuery({
    queryKey: ['section-counts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('page_sections').select('page_slug');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach(s => { counts[s.page_slug] = (counts[s.page_slug] || 0) + 1; });
      return counts;
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('pages').update({ active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      qc.invalidateQueries({ queryKey: ['active-pages'] });
      toast.success('Página actualizada');
    },
    onError: (e) => toast.error(e.message),
  });

  const updateDescMutation = useMutation({
    mutationFn: async ({ id, description }: { id: string; description: string }) => {
      const { error } = await supabase.from('pages').update({ description }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-pages'] });
      setEditingId(null);
      toast.success('Descripción actualizada');
    },
    onError: (e) => toast.error(e.message),
  });

  const activeCount = pages?.filter(p => p.active).length || 0;

  const slugToSectionSlug: Record<string, string> = {
    inicio: 'index',
    menu: 'menu',
    institucional: 'institucional',
    sedes: 'sedes',
    nosotros: 'nosotros',
    blog: 'blog',
    faq: 'faq',
    'preguntas-frecuentes': 'faq',
  };

  return (
    <div>
      <FadeInWhenVisible>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl">Páginas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pages?.length || 0} páginas · {activeCount} activas · Gestiona la navegación y contenido del sitio
            </p>
          </div>
        </div>
      </FadeInWhenVisible>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando...</div>
      ) : (
        <div className="space-y-2">
          {pages?.map((page) => {
            const sectionSlug = slugToSectionSlug[page.slug] || page.slug;
            const numSections = sectionCounts?.[sectionSlug] || 0;

            return (
              <Link
                key={page.id}
                to={numSections > 0 ? `/admin/sections?page=${sectionSlug}` : '#'}
                className="block"
              >
                <motion.div
                  layout
                  className="bg-card border rounded-xl hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group overflow-hidden"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${page.active ? 'bg-emerald-50 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                      {page.active ? <Globe className="w-5 h-5" /> : <GlobeLock className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm group-hover:text-primary transition-colors">{page.title}</h3>
                        {numSections > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                            <Layers className="w-3 h-3" />
                            {numSections} secciones
                          </span>
                        )}
                      </div>
                      {editingId === page.id ? (
                        <div className="flex items-center gap-2 mt-1" onClick={(e) => e.preventDefault()}>
                          <input
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg border bg-background text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                            autoFocus
                          />
                          <button
                            onClick={(e) => { e.preventDefault(); updateDescMutation.mutate({ id: page.id, description: editDesc }); }}
                            className="p-1 rounded-md hover:bg-emerald-50 text-emerald-600"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button onClick={(e) => { e.preventDefault(); setEditingId(null); }} className="p-1 rounded-md hover:bg-secondary">
                            <X className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">/{page.slug} · {page.description || 'Sin descripción'}</p>
                          <button
                            onClick={(e) => { e.preventDefault(); setEditingId(page.id); setEditDesc(page.description || ''); }}
                            className="p-0.5 rounded hover:bg-secondary"
                          >
                            <Pencil className="w-3 h-3 text-muted-foreground" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${page.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {page.active ? 'Activa' : 'Inactiva'}
                      </span>
                      <Switch
                        checked={page.active}
                        onCheckedChange={() => toggleMutation.mutate({ id: page.id, active: !page.active })}
                        disabled={page.slug === 'inicio'}
                      />
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-6 p-4 bg-section-warm rounded-xl">
        <p className="text-xs text-muted-foreground">
          <strong>Nota:</strong> La página de Inicio no se puede desactivar. Haz clic en "Editar contenido" para modificar los textos, imágenes y secciones de cada página.
        </p>
      </div>
    </div>
  );
};

export default AdminPages;
