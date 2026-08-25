import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SafeImage } from '@/components/ThumbImage';
import { useSiteSettings, useUpdateSiteSetting, SiteSetting } from '@/hooks/useSiteSettings';
import { usePageTitle } from '@/hooks/usePageTitle';
import { supabase } from '@/integrations/supabase/client';
import { CMS_KEYS, invalidateCms } from '@/lib/cmsSync';
import { SECTION_COLOR_VARS } from '@/lib/cmsGuards';
import { Settings, Palette, Share2, MapPin, Search as SearchIcon, Save, Loader2, Image as ImageIcon, Plus, Trash2, ChevronDown, Bell, AlertTriangle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { uploadOptimizedImage, removeByUrl, isImageFile, MAX_UPLOAD_BYTES } from '@/lib/storage';
import type { ImagePreset } from '@/lib/imageCompression';

const categoryMeta: Record<string, { label: string; icon: typeof Settings; description: string }> = {
  brand: { label: 'Identidad Visual (Colores, Logos, Tipografía)', icon: Palette, description: 'ATENCIÓN: Color Primario es para Botones y Acentos. Fondo principal se ajusta solo.' },
  social: { label: 'Redes Sociales', icon: Share2, description: 'Links a tus perfiles sociales (con o sin https://)' },
  sedes: { label: 'Sedes', icon: MapPin, description: 'Administra Puntos de Venta (Nombre, Tel, Email, Maps)' },
  seo: { label: 'SEO', icon: SearchIcon, description: 'Título, descripción e imagen para buscadores' },
  notifications: { label: 'Notificaciones', icon: Bell, description: 'Correo que recibe los avisos de nuevas cotizaciones y pedidos' },
};

/** Categoría "sections" se administra en el panel "Colores de Secciones" (no en el listado genérico). */
const HANDLED_ELSEWHERE = new Set(['sections']);

const FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'Inter',
  'Poppins',
  'Montserrat',
  'Lato',
  'Roboto',
  'Open Sans',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'DM Sans',
  'Nunito',
  'Work Sans',
  'Outfit',
  'Space Grotesk',
  'Bitter',
  'Lora',
  'Cormorant Garamond',
  'Josefin Sans',
  'Quicksand',
];

type SedeType = 'tienda' | 'administrativa';
type Sede = { id: string; name: string; type: SedeType; phone: string; whatsapp: string; email: string; hours: string; address: string; mapEmbed: string };

const SECTION_COLORS: { key: string; cssVar: string; label: string; hint: string }[] = [
  { key: 'section_color_warm', cssVar: SECTION_COLOR_VARS.section_color_warm, label: 'Sección Cálida', hint: 'Heros, formularios, FAQs' },
  { key: 'section_color_dark', cssVar: SECTION_COLOR_VARS.section_color_dark, label: 'Sección Oscura', hint: 'CTAs, promo, contraste' },
  { key: 'section_color_cream', cssVar: SECTION_COLOR_VARS.section_color_cream, label: 'Sección Crema', hint: 'Valores, nosotros' },
  { key: 'section_color_terracotta', cssVar: SECTION_COLOR_VARS.section_color_terracotta, label: 'Sección Terracota', hint: 'Stats, destacados' },
];

// ── Color helpers (puros) ─────────────────────────────────────────────────────
const HSL_RE = /^\s*\d{1,3}(\.\d+)?\s+\d{1,3}(\.\d+)?%\s+\d{1,3}(\.\d+)?%\s*$/;
const HEX_RE = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i;
const isValidColor = (v: string) => HSL_RE.test(v) || HEX_RE.test(v.trim());

/** "H S% L%" → "#rrggbb" para el <input type="color"> (hex pasa tal cual). */
const hslToHex = (hslStr: string): string => {
  const trimmed = (hslStr || '').trim();
  if (HEX_RE.test(trimmed)) return trimmed.startsWith('#') ? trimmed.toLowerCase() : `#${trimmed.toLowerCase()}`;
  try {
    const parts = trimmed.split(/\s+/);
    const h = parseFloat(parts[0]) || 0;
    const sVal = parseFloat(parts[1]) || 0;
    const l = parseFloat(parts[2]) || 0;
    const s2 = sVal / 100;
    const l2 = l / 100;
    const a2 = s2 * Math.min(l2, 1 - l2);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l2 - a2 * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  } catch {
    return '#c0623a';
  }
};

/** "#rrggbb" → "H S% L%"; devuelve `fallback` si el hex no es válido. */
const hexToHsl = (hex: string, fallback = ''): string => {
  const result = HEX_RE.exec(hex);
  if (!result) return fallback;
  const r = parseInt(result[1], 16) / 255;
  const g = parseInt(result[2], 16) / 255;
  const b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s2 = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s2 = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return `${Math.round(h)} ${Math.round(s2 * 100)}% ${Math.round(l * 100)}%`;
};

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

const AdminSettings = () => {
  usePageTitle('Configuración');
  const qc = useQueryClient();
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);
  const [savingColors, setSavingColors] = useState(false);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const grouped = (settings || []).reduce<Record<string, SiteSetting[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const storedValue = (key: string) => settings?.find(s => s.key === key)?.value;
  const getValue = (key: string) => editValues[key] ?? storedValue(key) ?? '';
  const isDirty = (key: string) => editValues[key] !== undefined;
  const clearEdit = (key: string) => setEditValues(prev => { const n = { ...prev }; delete n[key]; return n; });

  const handleSave = async (key: string) => {
    const val = editValues[key];
    if (val === undefined) return;
    try {
      await updateSetting.mutateAsync({ key, value: val });
      clearEdit(key);
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const presetForSettingKey = (key: string): ImagePreset => {
    if (key === 'brand_logo') return 'logo';
    if (key === 'seo_og_image') return 'og';
    if (key === 'login_cover_image') return 'cover';
    return 'section';
  };

  const handleImageUpload = async (key: string, file: File) => {
    if (!isImageFile(file)) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast.error('La imagen no debe superar 12MB'); return; }
    setUploading(key);
    const previousUrl = getValue(key);
    try {
      // Nombre único por subida: nunca se reescribe una ruta existente (el CDN la cachea un año).
      const { url } = await uploadOptimizedImage({ file, preset: presetForSettingKey(key), prefix: key, folder: 'site' });
      await updateSetting.mutateAsync({ key, value: url });
      toast.success('Imagen subida y guardada ✓');
      // La versión anterior deja de usarse: liberar espacio en el bucket.
      if (previousUrl && previousUrl !== url) removeByUrl(previousUrl).catch(() => {});
    } catch (err) {
      console.error('Error al subir imagen:', err);
      toast.error('Error al subir imagen. Intenta de nuevo.');
    } finally {
      setUploading(null);
    }
  };

  // ── Colores de secciones (persisten en site_settings.section_color_*) ──
  const sectionColorsDirty = SECTION_COLORS.filter(c => isDirty(c.key));
  const computedCss = (cssVar: string) => {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  };
  const sectionColorValue = (c: { key: string; cssVar: string }) =>
    editValues[c.key] ?? storedValue(c.key) ?? computedCss(c.cssVar);

  const previewSectionColor = (cssVar: string, value: string) => {
    const v = value.trim();
    if (!isValidColor(v)) return;
    document.documentElement.style.setProperty(cssVar, v.startsWith('#') ? hexToHsl(v) : v);
  };

  const setSectionColor = (c: { key: string; cssVar: string }, value: string) => {
    setEditValues(prev => ({ ...prev, [c.key]: value }));
    previewSectionColor(c.cssVar, value);
  };

  const discardSectionColors = () => {
    SECTION_COLORS.forEach(c => {
      const stored = storedValue(c.key)?.trim();
      if (stored) previewSectionColor(c.cssVar, stored);
      else document.documentElement.style.removeProperty(c.cssVar);
    });
    setEditValues(prev => {
      const n = { ...prev };
      SECTION_COLORS.forEach(c => { delete n[c.key]; });
      return n;
    });
  };

  const handleSaveSectionColors = async () => {
    if (sectionColorsDirty.length === 0) return;
    setSavingColors(true);
    const failed = new Set<string>();
    for (const [idx, c] of sectionColorsDirty.entries()) {
      const value = (editValues[c.key] ?? '').trim();
      if (!isValidColor(value)) {
        failed.add(c.key);
        toast.error(`${c.label}: usa el formato "H S% L%" o #rrggbb`);
        continue;
      }
      try {
        if (storedValue(c.key) !== undefined) {
          await updateSetting.mutateAsync({ key: c.key, value });
        } else {
          // La clave aún no existe en site_settings (migración pendiente): crearla para que persista igual.
          const { error } = await supabase.from('site_settings').insert({
            key: c.key, value, type: 'color', category: 'sections', label: c.label, sort_order: idx,
          });
          if (error) throw error;
          invalidateCms(qc, CMS_KEYS.settings);
        }
      } catch (err) {
        failed.add(c.key);
        toast.error(`${c.label}: no se pudo guardar (${err instanceof Error ? err.message : 'error desconocido'})`);
      }
    }
    setEditValues(prev => {
      const n = { ...prev };
      sectionColorsDirty.forEach(c => { if (!failed.has(c.key)) delete n[c.key]; });
      return n;
    });
    setSavingColors(false);
    if (failed.size === 0) toast.success('Colores de secciones guardados');
  };

  // ── Color picker with visual picker + HSL input ──
  const renderColorField = (s: SiteSetting) => {
    const val = getValue(s.key);
    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl border-2 border-border overflow-hidden cursor-pointer shadow-sm" style={{ background: `hsl(${val})` }}>
            <input
              type="color"
              value={hslToHex(val)}
              onChange={e => setEditValues(prev => ({ ...prev, [s.key]: hexToHsl(e.target.value, val) }))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
        <div className="flex-1 flex items-center gap-2">
          <input
            value={val}
            onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
            className="flex-1 px-3 py-2.5 rounded-xl border bg-background text-sm font-mono"
            placeholder="H S% L%"
          />
          <div className="px-3 py-2 rounded-lg text-xs font-mono text-muted-foreground bg-muted">
            {hslToHex(val)}
          </div>
        </div>
        {isDirty(s.key) && (
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity" title="Guardar">
            <Save className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ── Font selector dropdown ──
  const renderFontField = (s: SiteSetting) => {
    const val = getValue(s.key);
    return (
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <select
            value={val}
            onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
            className="w-full appearance-none px-4 py-2.5 pr-10 rounded-xl border bg-background text-sm cursor-pointer"
            style={{ fontFamily: `'${val}', sans-serif` }}
          >
            {FONT_OPTIONS.map(font => (
              <option key={font} value={font} style={{ fontFamily: `'${font}', sans-serif` }}>
                {font}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-muted text-sm min-w-[140px] text-center" style={{ fontFamily: `'${val}', sans-serif` }}>
          Aa Bb Cc 123
        </div>
        {isDirty(s.key) && (
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity" title="Guardar">
            <Save className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ── Sedes editor ──
  const parseSedesJson = (raw: string): { list: Sede[] | null; error: string } => {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return { list: null, error: 'El valor guardado no es una lista ([ ... ]).' };
      const list = parsed.map((r, i): Sede => {
        const o = (r && typeof r === 'object' ? r : {}) as Record<string, unknown>;
        return {
          ...o,
          id: str(o.id) || `sede-${i + 1}`,
          name: str(o.name),
          type: str(o.type).toLowerCase() === 'administrativa' ? 'administrativa' : 'tienda',
          phone: str(o.phone),
          whatsapp: str(o.whatsapp),
          email: str(o.email),
          hours: str(o.hours),
          address: str(o.address),
          mapEmbed: str(o.mapEmbed),
        };
      });
      return { list, error: '' };
    } catch (e) {
      return { list: null, error: e instanceof Error ? e.message : 'JSON inválido' };
    }
  };

  /** Guardar sedes: nunca se escribe JSON inválido ni una sede sin nombre/teléfono. */
  const handleSaveSedes = async (key: string) => {
    const raw = editValues[key];
    if (raw === undefined) return;
    const { list, error } = parseSedesJson(raw);
    if (!list) { toast.error(`JSON inválido: ${error}`); return; }
    const incomplete = list.findIndex(s => !s.name.trim() || !s.phone.trim());
    if (incomplete >= 0) {
      toast.error(`La sede ${incomplete + 1} necesita nombre y teléfono antes de guardar.`);
      return;
    }
    try {
      await updateSetting.mutateAsync({ key, value: JSON.stringify(list, null, 2) });
      clearEdit(key);
      toast.success('Sedes guardadas');
    } catch {
      toast.error('Error al guardar las sedes');
    }
  };

  const renderSedesField = (s: SiteSetting) => {
    const raw = getValue(s.key);
    const { list: sedesArr, error: parseError } = parseSedesJson(raw);

    // Modo reparación: el JSON guardado no se puede interpretar. Se muestra tal cual para corregirlo;
    // NUNCA se sustituye por [] (un guardado accidental borraría las sedes).
    if (sedesArr === null) {
      return (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-destructive">JSON inválido — modo reparación</p>
              <p className="text-xs text-destructive/80 mt-1">{parseError}. Corrige el texto y guarda. Mientras tanto el sitio muestra las sedes por defecto.</p>
            </div>
          </div>
          <textarea
            value={raw}
            onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
            spellCheck={false}
            className="w-full px-3 py-2 rounded-xl border bg-background text-xs font-mono min-h-[220px]"
            placeholder='[{"id":"sede-1","name":"Sede Principal","type":"tienda","phone":"+57 300 000 0000","whatsapp":"573000000000","email":"","hours":"Lun-Sáb 6AM-8PM","address":"","mapEmbed":""}]'
          />
          <div className="flex flex-wrap items-center gap-2">
            {isDirty(s.key) && (
              <>
                <button onClick={() => handleSaveSedes(s.key)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                  <Save className="w-4 h-4" /> Guardar
                </button>
                <button onClick={() => clearEdit(s.key)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-secondary transition-colors">
                  <RotateCcw className="w-4 h-4" /> Descartar cambios
                </button>
              </>
            )}
            <span className="text-[11px] text-muted-foreground">Escribe <code>[]</code> si quieres empezar desde cero.</span>
          </div>
        </div>
      );
    }

    const updateSedes = (newArr: Sede[]) => {
      setEditValues(prev => ({ ...prev, [s.key]: JSON.stringify(newArr, null, 2) }));
    };

    const updateSede = (idx: number, field: keyof Sede, value: string) => {
      const updated = [...sedesArr];
      updated[idx] = { ...updated[idx], [field]: value };
      updateSedes(updated);
    };

    const addSede = () => {
      const newId = `sede-${Date.now()}`;
      updateSedes([...sedesArr, { id: newId, name: '', type: 'tienda', phone: '', whatsapp: '', email: '', hours: 'Lun-Sáb 6AM-8PM', address: '', mapEmbed: '' }]);
    };

    const removeSede = (idx: number) => {
      updateSedes(sedesArr.filter((_, i) => i !== idx));
    };

    const inputClass = 'w-full px-3 py-2.5 rounded-xl border bg-background text-sm';
    const missing = (v: string) => (isDirty(s.key) && !v.trim() ? ' border-destructive/60' : '');

    return (
      <div className="space-y-4">
        {sedesArr.map((sede, idx) => (
          <div key={sede.id || idx} className="bg-muted/50 rounded-2xl p-5 border space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Sede {idx + 1}{sede.type === 'administrativa' ? ' · administrativa (no se muestra como punto de venta)' : ''}
              </span>
              {sedesArr.length > 1 && (
                <button
                  onClick={() => removeSede(idx)}
                  className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                  title="Eliminar sede"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nombre *</label>
                <input
                  value={sede.name}
                  onChange={e => updateSede(idx, 'name', e.target.value)}
                  className={inputClass + missing(sede.name)}
                  placeholder="Sede Principal"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <select
                  value={sede.type || 'tienda'}
                  onChange={e => updateSede(idx, 'type', e.target.value)}
                  className={inputClass}
                >
                  <option value="tienda">Punto de venta</option>
                  <option value="administrativa">Oficina administrativa</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Teléfono *</label>
                <input
                  type="tel"
                  value={sede.phone}
                  onChange={e => updateSede(idx, 'phone', e.target.value)}
                  className={inputClass + missing(sede.phone)}
                  placeholder="+57 300 000 0000"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">WhatsApp (sin +)</label>
                <input
                  value={sede.whatsapp || ''}
                  onChange={e => updateSede(idx, 'whatsapp', e.target.value)}
                  className={inputClass}
                  placeholder="573001234567 (si se deja vacío se usa el teléfono)"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={sede.email || ''}
                  onChange={e => updateSede(idx, 'email', e.target.value)}
                  className={inputClass}
                  placeholder="contacto@sede.com"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                <input
                  value={sede.address}
                  onChange={e => updateSede(idx, 'address', e.target.value)}
                  className={inputClass}
                  placeholder="Calle 00 #00-00"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horario</label>
                <input
                  value={sede.hours}
                  onChange={e => updateSede(idx, 'hours', e.target.value)}
                  className={inputClass}
                  placeholder="Lun-Sáb 6AM-8PM"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Enlace del mapa (Google Maps Embed)</label>
                <p className="text-[10px] text-muted-foreground mb-1.5">Ve a Google Maps → busca tu local → Compartir → Insertar un mapa → copia la URL del atributo <code>src</code> del iframe.</p>
                <input
                  value={sede.mapEmbed || ''}
                  onChange={e => updateSede(idx, 'mapEmbed', e.target.value)}
                  className={`${inputClass} font-mono`}
                  placeholder="https://www.google.com/maps/embed?pb=..."
                />
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={addSede}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
        >
          <Plus className="w-4 h-4" /> Agregar sede
        </button>

        {isDirty(s.key) && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSaveSedes(s.key)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" /> Guardar sedes
            </button>
            <button onClick={() => clearEdit(s.key)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-secondary transition-colors">
              <RotateCcw className="w-4 h-4" /> Descartar
            </button>
            <span className="text-[11px] text-muted-foreground">Cada sede necesita nombre y teléfono.</span>
          </div>
        )}
      </div>
    );
  };

  const renderField = (s: SiteSetting) => {
    // Font fields
    if (s.key === 'brand_font_display' || s.key === 'brand_font_body') {
      return renderFontField(s);
    }

    if (s.type === 'image') {
      const currentVal = getValue(s.key);
      return (
        <div className="space-y-2">
          {currentVal && <SafeImage src={currentVal} alt={s.label} className="w-24 h-24 object-contain rounded-lg border" />}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer hover:bg-secondary/50 transition-colors text-sm text-muted-foreground">
            {uploading === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            {uploading === s.key ? 'Subiendo...' : 'Subir imagen'}
            <input type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(s.key, f);
            }} />
          </label>
        </div>
      );
    }

    if (s.type === 'color') return renderColorField(s);

    // Sedes special JSON
    if (s.key === 'sedes') return renderSedesField(s);

    if (s.type === 'json') {
      return (
        <div className="space-y-2">
          <textarea
            value={getValue(s.key)}
            onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
            className="w-full px-3 py-2 rounded-xl border bg-background text-sm font-mono min-h-[120px]"
          />
          {isDirty(s.key) && (
            <button onClick={() => handleSave(s.key)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              <Save className="w-4 h-4" /> Guardar
            </button>
          )}
        </div>
      );
    }

    // text
    const inputType = s.type === 'email' || /email/i.test(s.key) ? 'email' : 'text';
    return (
      <div className="flex items-center gap-2">
        <input
          type={inputType}
          value={getValue(s.key)}
          onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
          className="flex-1 px-3 py-2.5 rounded-xl border bg-background text-sm"
        />
        {isDirty(s.key) && (
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity" title="Guardar">
            <Save className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  const knownCategories = Object.keys(categoryMeta);
  const otherCategories = Object.keys(grouped).filter(c => !knownCategories.includes(c) && !HANDLED_ELSEWHERE.has(c));

  const renderCategory = (cat: string, meta: { label: string; icon: typeof Settings; description: string }) => {
    const items = grouped[cat];
    if (!items?.length) return null;
    return (
      <div key={cat} className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <meta.icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">{meta.label}</h2>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <div className="mt-5 space-y-5">
          {items.map(s => (
            <div key={s.key}>
              <label className="text-sm font-medium text-foreground mb-1.5 block">{s.label}</label>
              {renderField(s)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Configuración del Sitio</h1>
        <p className="text-muted-foreground text-sm mt-1">Logo, colores, tipografía, contacto, redes sociales y SEO</p>
      </div>

      {/* Live color preview */}
      <div className="bg-card rounded-2xl border p-5">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Vista previa de colores activos</p>
        <div className="flex flex-wrap gap-3">
          {[
            { label: 'Primario', css: 'primary' },
            { label: 'Fondo', css: 'background' },
            { label: 'Texto', css: 'foreground' },
            { label: 'Rojo marca', css: 'brand-red' },
          ].map(c => (
            <div key={c.css} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg border shadow-sm" style={{ background: `hsl(var(--${c.css}))` }} />
              <span className="text-xs text-muted-foreground">{c.label}</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          ✓ Los colores se aplican en tiempo real a todo el sitio. Guarda un color y el cambio es inmediato.
        </p>
      </div>

      {/* ── Colores de Secciones ── */}
      <div className="bg-card rounded-2xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Palette className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">Colores de Secciones</h2>
            <p className="text-xs text-muted-foreground">Personaliza el fondo de cada bloque del sitio público (modo claro)</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {SECTION_COLORS.map((c) => {
            const displayHsl = sectionColorValue(c);
            const invalid = isDirty(c.key) && !isValidColor(displayHsl);
            return (
              <div key={c.key} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="text-[11px] text-muted-foreground">{c.hint}</p>
                  </div>
                  <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{c.cssVar}</code>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="relative w-12 h-10 rounded-xl border-2 border-border overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
                    style={{ background: displayHsl.trim().startsWith('#') ? displayHsl : `hsl(${displayHsl})` }}
                  >
                    <input
                      type="color"
                      value={hslToHex(displayHsl)}
                      onChange={e => setSectionColor(c, hexToHsl(e.target.value, displayHsl))}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      aria-label={`Elegir color: ${c.label}`}
                    />
                  </div>
                  <input
                    value={displayHsl}
                    onChange={e => setSectionColor(c, e.target.value)}
                    className={`flex-1 px-3 py-2 rounded-xl border bg-background text-xs font-mono ${invalid ? 'border-destructive/60' : ''}`}
                    placeholder="H S% L%"
                    aria-label={`Valor HSL: ${c.label}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-5 pt-4 border-t">
          <button
            onClick={handleSaveSectionColors}
            disabled={sectionColorsDirty.length === 0 || savingColors}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {savingColors ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Guardar colores
          </button>
          {sectionColorsDirty.length > 0 && (
            <button onClick={discardSectionColors} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-secondary transition-colors">
              <RotateCcw className="w-4 h-4" /> Descartar
            </button>
          )}
          <p className="text-[11px] text-muted-foreground">
            Los cambios se ven al instante como vista previa; pulsa <strong>Guardar colores</strong> para hacerlos permanentes en todo el sitio.
            El color primario (botones y acentos) se edita en "Identidad Visual". En modo oscuro se usan los tonos oscuros del tema.
          </p>
        </div>
      </div>

      {Object.entries(categoryMeta).map(([cat, meta]) => renderCategory(cat, meta))}

      {otherCategories.map(cat =>
        renderCategory(cat, {
          label: cat.charAt(0).toUpperCase() + cat.slice(1),
          icon: Settings,
          description: 'Ajustes adicionales',
        }),
      )}
    </div>
  );
};

export default AdminSettings;
