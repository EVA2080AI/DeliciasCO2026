import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAllPageSections, useUpdatePageSection, PageSection } from '@/hooks/usePageSections';
import { Loader2, Eye, EyeOff, Save, ChevronDown, ChevronRight, Image as ImageIcon, Upload, ArrowLeft, Layers, Monitor, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { compressImage } from '@/lib/imageCompression';
import { MediaSelectorModal } from '@/components/admin/MediaSelectorModal';
import { motion, AnimatePresence } from 'framer-motion';

const pageLabels: Record<string, string> = {
  index: 'Inicio',
  nosotros: 'Nosotros',
  menu: 'Menú',
  sedes: 'Sedes',
  institucional: 'Empresas',
  blog: 'Blog',
  faq: 'FAQ',
};

// Visual style per page_slug/section_key — replica exacta de las páginas reales
type SectionStyle = { bg: string; text: string; subtitleColor: string; ctaBg: string; ctaText: string; layout: 'img-left' | 'img-right' | 'center' | 'stats' | 'full-center' };

const getSectionStyle = (pageSlug: string, sectionKey: string): SectionStyle => {
  const defaults: SectionStyle = { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-left' };

  const map: Record<string, SectionStyle> = {
    // INDEX
    'index/hero':       { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-right' },
    'index/productos':  { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20', ctaText: 'text-white', layout: 'img-left' },
    'index/cafeteria':  { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-right' },
    'index/delicias':   { bg: 'bg-primary', text: 'text-white', subtitleColor: 'text-white/80', ctaBg: 'bg-white/20', ctaText: 'text-white', layout: 'img-left' },
    'index/featured':   { bg: 'bg-background', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'index/empresas':   { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20', ctaText: 'text-white', layout: 'img-right' },
    'index/stats':      { bg: 'bg-amber-800', text: 'text-white', subtitleColor: 'text-amber-200', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'stats' },
    'index/visitanos':  { bg: 'bg-amber-50/50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-left' },
    'index/blog':       { bg: 'bg-background', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'index/categories': { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'index/history':    { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20', ctaText: 'text-white', layout: 'center' },
    'index/cta':        { bg: 'bg-primary', text: 'text-white', subtitleColor: 'text-white/80', ctaBg: 'bg-white', ctaText: 'text-primary', layout: 'full-center' },
    // NOSOTROS
    'nosotros/hero':       { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20 border border-white/30', ctaText: 'text-white', layout: 'img-right' },
    'nosotros/origen':     { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-left' },
    'nosotros/disciplina': { bg: 'bg-orange-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-right' },
    'nosotros/ingenieria': { bg: 'bg-background', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'img-left' },
    'nosotros/promesa':    { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20', ctaText: 'text-white', layout: 'full-center' },
    'nosotros/valores':    { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'nosotros/stats':      { bg: 'bg-amber-800', text: 'text-white', subtitleColor: 'text-amber-200', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'stats' },
    'nosotros/cta':        { bg: 'bg-neutral-900', text: 'text-white', subtitleColor: 'text-primary', ctaBg: 'bg-white/20 border border-white/30', ctaText: 'text-white', layout: 'img-right' },
    // INSTITUCIONAL
    'institucional/hero':  { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'institucional/step1': { bg: 'bg-card', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    'institucional/step2': { bg: 'bg-card', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    // SEDES
    'sedes/hero':  { bg: 'bg-orange-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    // MENU
    'menu/hero':   { bg: 'bg-amber-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    // BLOG
    'blog/hero':   { bg: 'bg-orange-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
    // FAQ
    'faq/hero':    { bg: 'bg-orange-50', text: 'text-foreground', subtitleColor: 'text-primary', ctaBg: 'bg-primary', ctaText: 'text-primary-foreground', layout: 'center' },
  };

  return map[`${pageSlug}/${sectionKey}`] || defaults;
};

// Mini preview component — réplica visual fiel del sitio público
const SectionPreview = ({ section, getVal }: { section: PageSection; getVal: (id: string, field: keyof PageSection) => unknown }) => {
  const style = getSectionStyle(section.page_slug, section.section_key);
  const title = (getVal(section.id, 'title') as string) || 'Título';
  const subtitle = (getVal(section.id, 'subtitle') as string) || '';
  const content = (getVal(section.id, 'content') as string) || '';
  const ctaText = (getVal(section.id, 'cta_text') as string) || '';
  const imageUrl = (getVal(section.id, 'image_url') as string) || '';

  if (style.layout === 'stats') {
    return (
      <div className={`${style.bg} rounded-xl p-5 h-full flex flex-col items-center justify-center min-h-[180px]`}>
        {subtitle && <p className={`text-[10px] font-bold uppercase tracking-wider ${style.subtitleColor} mb-1`}>{subtitle}</p>}
        <p className={`font-display text-sm font-bold ${style.text} text-center mb-3`}>{title}</p>
        <div className="flex gap-4">
          {['40+', '60+', '2', '10K+'].map((v, i) => (
            <div key={v} className="text-center">
              <p className={`font-display text-xl font-bold ${style.text}`}>{v}</p>
              <p className={`text-[8px] ${style.text} opacity-60`}>{['Años', 'Productos', 'Sedes', 'Clientes'][i]}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (style.layout === 'full-center') {
    return (
      <div className={`${style.bg} rounded-xl p-5 h-full flex flex-col items-center justify-center text-center min-h-[180px]`}>
        {subtitle && <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${style.subtitleColor} mb-2`}>{subtitle}</p>}
        <p className={`font-display text-base font-bold ${style.text} leading-tight max-w-[250px]`}>{title}</p>
        {content && <p className={`text-[10px] mt-2 ${style.text} opacity-50 line-clamp-3 max-w-[220px]`}>{content}</p>}
        {ctaText && (
          <span className={`mt-3 inline-block px-3 py-1 rounded-full text-[9px] font-bold ${style.ctaBg} ${style.ctaText}`}>
            {ctaText}
          </span>
        )}
      </div>
    );
  }

  if (style.layout === 'center') {
    return (
      <div className={`${style.bg} rounded-xl p-5 h-full flex flex-col items-center justify-center text-center min-h-[180px]`}>
        {subtitle && <p className={`text-[9px] font-bold uppercase tracking-[0.15em] ${style.subtitleColor} mb-2`}>{subtitle}</p>}
        <p className={`font-display text-sm font-bold ${style.text} leading-tight max-w-[250px]`}>{title}</p>
        {content && <p className={`text-[10px] mt-1.5 ${style.text} opacity-50 line-clamp-3 max-w-[220px]`}>{content}</p>}
        {ctaText && (
          <span className={`mt-3 inline-block px-3 py-1 rounded-full text-[9px] font-bold ${style.ctaBg} ${style.ctaText}`}>
            {ctaText}
          </span>
        )}
      </div>
    );
  }

  // img-left / img-right layouts
  const imgFirst = style.layout === 'img-left';

  const imgBlock = (
    <div className="bg-muted/20 overflow-hidden">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground/20 bg-muted/10">
          <ImageIcon className="w-8 h-8" />
        </div>
      )}
    </div>
  );

  const textBlock = (
    <div className="p-4 flex flex-col justify-center">
      {subtitle && <p className={`text-[8px] font-bold uppercase tracking-[0.15em] ${style.subtitleColor} mb-1 truncate`}>{subtitle}</p>}
      <p className={`font-display text-[12px] font-bold ${style.text} leading-tight line-clamp-2`}>{title}</p>
      {content && <p className={`text-[9px] mt-1.5 ${style.text} opacity-50 line-clamp-3`}>{content}</p>}
      {ctaText && (
        <span className={`mt-2 self-start inline-block px-2 py-0.5 rounded-full text-[8px] font-bold ${style.ctaBg} ${style.ctaText}`}>
          {ctaText} →
        </span>
      )}
    </div>
  );

  return (
    <div className={`${style.bg} rounded-xl overflow-hidden h-full min-h-[180px] grid grid-cols-2`}>
      {imgFirst ? <>{imgBlock}{textBlock}</> : <>{textBlock}{imgBlock}</>}
    </div>
  );
};

// Hero Slider Editor Component
const HeroSliderEditor = ({ 
  sectionId,
  metadata, 
  onChange, 
  onOpenMedia,
  onImageUpload,
  uploading
}: { 
  sectionId: string;
  metadata: any; 
  onChange: (val: any) => void; 
  onOpenMedia: (slideIndex: number, field: string) => void;
  onImageUpload: (index: number, field: string, file: File) => Promise<void>;
  uploading: string | null;
}) => {
  const slides = metadata?.slides || [];

  const updateSlide = (index: number, field: string, value: any) => {
    const newSlides = [...slides];
    const path = field.split('.');
    if (path.length === 1) {
      newSlides[index][field] = value;
    } else {
      newSlides[index][path[0]] = { ...newSlides[index][path[0]], [path[1]]: value };
    }
    onChange({ ...metadata, slides: newSlides });
  };

  const addSlide = () => {
    const newSlide = {
      tag: 'Nueva Etiqueta',
      title: 'Nuevo Título',
      desc: 'Descripción de la diapositiva...',
      img: '',
      cta: { to: '/menu', label: 'Botón 1' },
      cta2: { to: '/nosotros', label: 'Botón 2' }
    };
    onChange({ ...metadata, slides: [...slides, newSlide] });
  };

  const removeSlide = (index: number) => {
    if (slides.length <= 1) {
      toast.error("Debes tener al menos una diapositiva en el slider.");
      return;
    }
    const newSlides = slides.filter((_: any, i: number) => i !== index);
    onChange({ ...metadata, slides: newSlides });
  };

  const moveSlide = (index: number, direction: 'up' | 'down') => {
    const newSlides = [...slides];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    [newSlides[index], newSlides[target]] = [newSlides[target], newSlides[index]];
    onChange({ ...metadata, slides: newSlides });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Configuración de Diapositivas
        </h3>
        <button
          onClick={addSlide}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Añadir Diapositiva
        </button>
      </div>

      <div className="space-y-4">
        {slides.map((slide: any, index: number) => (
          <div key={index} className="p-4 border rounded-xl bg-secondary/20 relative group">
            <div className="absolute -left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => moveSlide(index, 'up')} className="p-1.5 rounded-md bg-card border shadow-sm hover:text-primary"><ArrowUp className="w-3 h-3" /></button>
              <button onClick={() => moveSlide(index, 'down')} className="p-1.5 rounded-md bg-card border shadow-sm hover:text-primary"><ArrowDown className="w-3 h-3" /></button>
            </div>
            
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-card px-2 py-0.5 rounded border">
                Slide {index + 1}
              </span>
              <button onClick={() => removeSlide(index)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Etiqueta (Tag)</label>
                  <input
                    value={slide.tag || ''}
                    onChange={e => updateSlide(index, 'tag', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs"
                    placeholder="Ej: Tradición desde 1985"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Título</label>
                  <input
                    value={slide.title || ''}
                    onChange={e => updateSlide(index, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Descripción</label>
                  <textarea
                    value={slide.desc || ''}
                    onChange={e => updateSlide(index, 'desc', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs min-h-[60px]"
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Imagen</label>
                  <div className="flex items-center gap-3">
                    {slide.img && (
                      <img src={slide.img} alt="" className="w-12 h-12 object-cover rounded-lg border" />
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        value={slide.img || ''}
                        onChange={e => updateSlide(index, 'img', e.target.value)}
                        placeholder="URL de imagen"
                        className="w-full px-3 py-1.5 rounded-lg border bg-background text-[10px]"
                      />
                      <div className="flex gap-2">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-[10px] text-muted-foreground hover:bg-card cursor-pointer transition-colors">
                          {uploading === `slide-${index}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                          {uploading === `slide-${index}` ? 'Subiendo...' : 'Subir'}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) onImageUpload(index, 'img', f);
                            }} 
                          />
                        </label>
                        <button
                          onClick={() => onOpenMedia(index, 'img')}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed text-[10px] text-muted-foreground hover:bg-card transition-colors"
                        >
                          <ImageIcon className="w-3 h-3" /> Librería
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Botón 1 (Texto)</label>
                    <input
                      value={slide.cta?.label || ''}
                      onChange={e => updateSlide(index, 'cta.label', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Botón 1 (Link)</label>
                    <input
                      value={slide.cta?.to || ''}
                      onChange={e => updateSlide(index, 'cta.to', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-[10px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Botón 2 (Texto)</label>
                    <input
                      value={slide.cta2?.label || ''}
                      onChange={e => updateSlide(index, 'cta2.label', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase text-muted-foreground mb-1 block">Botón 2 (Link)</label>
                    <input
                      value={slide.cta2?.to || ''}
                      onChange={e => updateSlide(index, 'cta2.to', e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border bg-background text-[10px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const AdminSections = () => {
  const [searchParams] = useSearchParams();
  const filterPage = searchParams.get('page');
  const { data: sections, isLoading } = useAllPageSections();
  const updateSection = useUpdatePageSection();
  const [editValues, setEditValues] = useState<Record<string, Partial<PageSection>>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (filterPage) return { [filterPage]: true };
    return {};
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<Record<string, boolean>>({});
  const [mediaSelectorTarget, setMediaSelectorTarget] = useState<string | null>(null);
  const [sliderMediaTarget, setSliderMediaTarget] = useState<{ id: string; slide: number; field: string } | null>(null);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const allSections = sections || [];
  const filteredSections = filterPage
    ? allSections.filter(s => s.page_slug === filterPage)
    : allSections;

  const grouped = filteredSections.reduce<Record<string, PageSection[]>>((acc, s) => {
    (acc[s.page_slug] = acc[s.page_slug] || []).push(s);
    return acc;
  }, {});

  const getVal = (id: string, field: keyof PageSection) =>
    editValues[id]?.[field] ?? sections?.find(s => s.id === id)?.[field];

  const setVal = (id: string, field: keyof PageSection, value: unknown) => {
    setEditValues(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const isDirty = (id: string) => !!editValues[id] && Object.keys(editValues[id]).length > 0;

  const handleSave = async (section: PageSection) => {
    const updates = { ...editValues[section.id] };
    if (!updates || Object.keys(updates).length === 0) return;
    try {
      if (typeof updates.metadata === 'string') {
        updates.metadata = JSON.parse(updates.metadata);
      }
      await updateSection.mutateAsync({ id: section.id, ...updates });
      setEditValues(prev => { const n = { ...prev }; delete n[section.id]; return n; });
      toast.success(`Sección "${section.section_key}" guardada`);
    } catch (e: any) {
      toast.error('Asegúrate de que el JSON sea válido antes de guardar.\n' + e.message);
    }
  };

  const handleToggle = async (section: PageSection) => {
    try {
      await updateSection.mutateAsync({ id: section.id, active: !section.active });
      toast.success(section.active ? 'Sección desactivada' : 'Sección activada');
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleImageUpload = async (sectionId: string, file: File) => {
    setUploading(sectionId);
    try {
      const compressedFile = await compressImage(file);
      const ext = compressedFile.name.split('.').pop();
      const path = `section-${sectionId}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, compressedFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      await updateSection.mutateAsync({ id: sectionId, image_url: urlData.publicUrl });
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          {filterPage && (
            <Link to="/admin/pages" className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold">
              {filterPage ? `Contenido: ${pageLabels[filterPage] || filterPage}` : 'Secciones del Sitio'}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {filterPage
                ? `Edita textos, imágenes y activa/desactiva cada sección de la página ${pageLabels[filterPage] || filterPage}`
                : 'Edita textos, imágenes y activa/desactiva cada sección por página'}
            </p>
          </div>
        </div>

        {/* Quick page filter pills */}
        {!filterPage && (
          <div className="flex flex-wrap gap-2 mt-4">
            {Object.entries(pageLabels).map(([slug, label]) => {
              const count = grouped[slug]?.length || 0;
              if (count === 0) return null;
              return (
                <Link
                  key={slug}
                  to={`/admin/sections?page=${slug}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Layers className="w-3 h-3" />
                  {label} ({count})
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {Object.entries(grouped).map(([slug, pageSections]) => {
        const isExpanded = filterPage ? true : expanded[slug] !== false;
        return (
          <div key={slug} className="bg-card rounded-2xl border overflow-hidden">
            {!filterPage && (
              <button
                onClick={() => setExpanded(prev => ({ ...prev, [slug]: !isExpanded }))}
                className="w-full flex items-center justify-between p-5 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-lg font-bold">{pageLabels[slug] || slug}</h2>
                  <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                    {pageSections.length} secciones
                  </span>
                </div>
                {isExpanded ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />}
              </button>
            )}

            {isExpanded && (
              <div className={`${!filterPage ? 'border-t' : ''} divide-y`}>
                {pageSections.map(section => {
                  const previewVisible = showPreview[section.id] !== false; // default true
                  return (
                    <div key={section.id} className={`p-5 space-y-4 ${!section.active ? 'opacity-60' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono bg-secondary px-2 py-1 rounded-lg">{section.section_key}</span>
                          <span className={`text-xs font-semibold ${section.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                            {section.active ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowPreview(prev => ({ ...prev, [section.id]: !previewVisible }))}
                            className={`p-2 rounded-lg transition-colors text-xs ${previewVisible ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}
                            title={previewVisible ? 'Ocultar preview' : 'Mostrar preview'}
                          >
                            <Monitor className="w-4 h-4" />
                          </button>
                          <Switch
                            checked={section.active}
                            onCheckedChange={() => handleToggle(section)}
                          />
                          {isDirty(section.id) && (
                            <button
                              onClick={() => handleSave(section)}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
                            >
                              <Save className="w-3.5 h-3.5" /> Guardar
                            </button>
                          )}
                        </div>
                      </div>

                      <div className={`grid gap-5 ${previewVisible ? 'grid-cols-1 lg:grid-cols-[1fr_280px]' : 'grid-cols-1'}`}>
                        {/* Edit fields */}
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Subtítulo / Etiqueta</label>
                              <input
                                value={getVal(section.id, 'subtitle') as string}
                                onChange={e => setVal(section.id, 'subtitle', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">Título</label>
                              <input
                                value={getVal(section.id, 'title') as string}
                                onChange={e => setVal(section.id, 'title', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Contenido</label>
                            <textarea
                              value={getVal(section.id, 'content') as string}
                              onChange={e => setVal(section.id, 'content', e.target.value)}
                              className="w-full px-3 py-2 rounded-xl border bg-background text-sm min-h-[80px]"
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Texto</label>
                              <input
                                value={(getVal(section.id, 'cta_text') as string) || ''}
                                onChange={e => setVal(section.id, 'cta_text', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">CTA Link</label>
                              <input
                                value={(getVal(section.id, 'cta_link') as string) || ''}
                                onChange={e => setVal(section.id, 'cta_link', e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Imagen</label>
                            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                              {getVal(section.id, 'image_url') && (
                                <img src={getVal(section.id, 'image_url') as string} alt="" className="w-16 h-16 object-cover rounded-lg border flex-shrink-0" />
                              )}
                              <div className="flex-1 w-full space-y-2">
                                <input
                                  value={(getVal(section.id, 'image_url') as string) || ''}
                                  onChange={e => setVal(section.id, 'image_url', e.target.value)}
                                  placeholder="https://... o sube una imagen"
                                  className="w-full px-3 py-2 rounded-xl border bg-background text-sm"
                                />
                                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed cursor-pointer hover:bg-secondary/50 transition-colors text-xs text-muted-foreground w-fit">
                                  {uploading === section.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                  {uploading === section.id ? 'Subiendo...' : 'Subir desde equipo'}
                                  <input type="file" accept="image/*" className="hidden" onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageUpload(section.id, f);
                                  }} />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setMediaSelectorTarget(section.id)}
                                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed hover:bg-secondary/50 transition-colors text-xs text-muted-foreground w-fit"
                                >
                                  <ImageIcon className="w-3.5 h-3.5" /> Librería
                                </button>
                              </div>
                            </div>
                          </div>

                          <div>
                            {section.section_key === 'hero' && section.page_slug === 'index' ? (
                              <HeroSliderEditor 
                                sectionId={section.id}
                                metadata={getVal(section.id, 'metadata')}
                                onChange={(newMeta) => setVal(section.id, 'metadata', newMeta)}
                                onOpenMedia={(slideIdx, field) => setSliderMediaTarget({ id: section.id, slide: slideIdx, field })}
                                uploading={uploading}
                                onImageUpload={async (idx, field, file) => {
                                  setUploading(`slide-${idx}`);
                                  try {
                                    const compressed = await compressImage(file);
                                    const ext = compressed.name.split('.').pop();
                                    const path = `slide-${section.id}-${idx}-${Date.now()}.${ext}`;
                                    const { error } = await supabase.storage.from('product-images').upload(path, compressed);
                                    if (error) throw error;
                                    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
                                    
                                    const currentMeta = getVal(section.id, 'metadata') as any;
                                    const newSlides = [...(currentMeta?.slides || [])];
                                    if (newSlides[idx]) {
                                      newSlides[idx][field] = urlData.publicUrl;
                                      setVal(section.id, 'metadata', { ...currentMeta, slides: newSlides });
                                    }
                                    toast.success('Imagen de diapositiva subida');
                                  } catch {
                                    toast.error('Error al subir imagen de diapositiva');
                                  } finally {
                                    setUploading(null);
                                  }
                                }}
                              />
                            ) : (
                              <>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Metadata (JSON avanzado)</label>
                                <textarea
                                  value={
                                    typeof getVal(section.id, 'metadata') === 'string'
                                      ? getVal(section.id, 'metadata') as string
                                      : JSON.stringify(getVal(section.id, 'metadata') || {}, null, 2)
                                  }
                                  onChange={e => setVal(section.id, 'metadata', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl border bg-background text-[10px] font-mono min-h-[100px]"
                                  placeholder='{"paragraph2": "Texto adicional..."}'
                                />
                              </>
                            )}
                          </div>
                        </div>

                        {/* Live preview */}
                        {previewVisible && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              <Monitor className="w-3 h-3" /> Preview
                            </div>
                            <div className="border rounded-xl overflow-hidden shadow-sm">
                              <SectionPreview section={section} getVal={getVal} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <p>No hay secciones configuradas{filterPage ? ` para ${pageLabels[filterPage] || filterPage}` : ''}.</p>
        </div>
      )}

      {mediaSelectorTarget && (
        <MediaSelectorModal 
          isOpen={!!mediaSelectorTarget} 
          onClose={() => setMediaSelectorTarget(null)} 
          onSelect={(url) => {
            setVal(mediaSelectorTarget, 'image_url', url);
            setMediaSelectorTarget(null);
          }} 
        />
      )}

      {sliderMediaTarget && (
        <MediaSelectorModal 
          isOpen={!!sliderMediaTarget} 
          onClose={() => setSliderMediaTarget(null)} 
          onSelect={(url) => {
            const currentMeta = getVal(sliderMediaTarget.id, 'metadata') as any;
            const newSlides = [...(currentMeta?.slides || [])];
            const slideIdx = sliderMediaTarget.slide;
            const field = sliderMediaTarget.field;
            
            if (newSlides[slideIdx]) {
              newSlides[slideIdx][field] = url;
              setVal(sliderMediaTarget.id, 'metadata', { ...currentMeta, slides: newSlides });
            }
            setSliderMediaTarget(null);
          }} 
        />
      )}
    </div>
  );
};

export default AdminSections;
