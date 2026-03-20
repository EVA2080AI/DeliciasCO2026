import { useState, useCallback } from 'react';
import { useSiteSettings, useUpdateSiteSetting, SiteSetting } from '@/hooks/useSiteSettings';
import { Settings, Palette, Phone, Share2, MapPin, Search as SearchIcon, Save, Loader2, Image, Plus, Trash2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const categoryMeta: Record<string, { label: string; icon: typeof Settings; description: string }> = {
  brand: { label: 'Identidad Visual (Colores, Logos, Tipografía)', icon: Palette, description: 'ATENCIÓN: Color Primario es para Botones y Acentos. Fondo principal se ajusta solo.' },
  social: { label: 'Redes Sociales', icon: Share2, description: 'Links a tus perfiles sociales' },
  sedes: { label: 'Sedes', icon: MapPin, description: 'Administra Puntos de Venta (Nombre, Tel, Email, Maps)' },
  seo: { label: 'SEO', icon: SearchIcon, description: 'Título, descripción e imagen para buscadores' },
  sections: { label: 'Colores de Secciones', icon: Palette, description: 'Personaliza el color de fondo de cada sección del sitio' },
};

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

type Sede = { id: string; name: string; type: 'tienda'; phone: string; whatsapp: string; email: string; hours: string; address: string; mapEmbed: string };

const AdminSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSiteSetting();
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const grouped = (settings || []).reduce<Record<string, SiteSetting[]>>((acc, s) => {
    (acc[s.category] = acc[s.category] || []).push(s);
    return acc;
  }, {});

  const getValue = (key: string) => editValues[key] ?? settings?.find(s => s.key === key)?.value ?? '';
  const isDirty = (key: string) => editValues[key] !== undefined;

  const handleSave = async (key: string) => {
    const val = editValues[key];
    if (val === undefined) return;
    try {
      await updateSetting.mutateAsync({ key, value: val });
      setEditValues(prev => { const n = { ...prev }; delete n[key]; return n; });
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    }
  };

  const handleImageUpload = async (key: string, file: File) => {
    setUploading(key);
    try {
      const ext = file.name.split('.').pop();
      const path = `site/${key}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(path);
      await updateSetting.mutateAsync({ key, value: urlData.publicUrl });
      toast.success('Imagen subida');
    } catch {
      toast.error('Error al subir imagen');
    } finally {
      setUploading(null);
    }
  };

  // ── Color picker with visual picker + HSL input ──
  const renderColorField = (s: SiteSetting) => {
    const val = getValue(s.key);
    // Convert HSL string to hex for the color picker
    const hslToHex = (hslStr: string) => {
      try {
        const parts = hslStr.trim().split(/\s+/);
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

    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return val;
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
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

    return (
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl border-2 border-border overflow-hidden cursor-pointer shadow-sm" style={{ background: `hsl(${val})` }}>
            <input
              type="color"
              value={hslToHex(val)}
              onChange={e => setEditValues(prev => ({ ...prev, [s.key]: hexToHsl(e.target.value) }))}
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
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
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
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  };

  // ── Sedes editor ──
  const renderSedesField = (s: SiteSetting) => {
    const raw = getValue(s.key);
    let sedesArr: Sede[] = [];
    try {
      sedesArr = JSON.parse(raw);
      if (!Array.isArray(sedesArr)) sedesArr = [];
    } catch {
      sedesArr = [];
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
      updateSedes([...sedesArr, { id: newId, name: '', type: 'tienda' as const, phone: '', whatsapp: '', email: '', hours: 'Lun-Sáb 6AM-8PM', address: '', mapEmbed: '' }]);
    };

    const removeSede = (idx: number) => {
      updateSedes(sedesArr.filter((_, i) => i !== idx));
    };

    return (
      <div className="space-y-4">
        {sedesArr.map((sede, idx) => (
          <div key={idx} className="bg-muted/50 rounded-2xl p-5 border space-y-3 relative group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sede {idx + 1}</span>
              {sedesArr.length > 1 && (
                <button
                  onClick={() => removeSede(idx)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-all"
                  title="Eliminar sede"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nombre</label>
                <input
                  value={sede.name}
                  onChange={e => updateSede(idx, 'name', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="Sede Principal"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                <select
                  value={sede.type || 'tienda'}
                  onChange={e => updateSede(idx, 'type', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                >
                  <option value="tienda">Punto de venta</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
                <input
                  value={sede.phone}
                  onChange={e => updateSede(idx, 'phone', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="+57 300 000 0000"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">WhatsApp (sin +)</label>
                <input
                  value={sede.whatsapp || ''}
                  onChange={e => updateSede(idx, 'whatsapp', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="573001234567"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email"
                  value={sede.email || ''}
                  onChange={e => updateSede(idx, 'email', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="contacto@sede.com"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Dirección</label>
                <input
                  value={sede.address}
                  onChange={e => updateSede(idx, 'address', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="Calle 00 #00-00"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Horario</label>
                <input
                  value={sede.hours}
                  onChange={e => updateSede(idx, 'hours', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm"
                  placeholder="Lun-Sáb 6AM-8PM"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground mb-1 block">Enlace del mapa (Google Maps Embed)</label>
                <p className="text-[10px] text-muted-foreground mb-1.5">Ve a Google Maps → busca tu local → Compartir → Insertar un mapa → copia la URL del atributo <code>src</code> del iframe.</p>
                <input
                  value={sede.mapEmbed || ''}
                  onChange={e => updateSede(idx, 'mapEmbed', e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border bg-background text-sm font-mono"
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
          <button
            onClick={() => handleSave(s.key)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Save className="w-4 h-4" /> Guardar sedes
          </button>
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
          {currentVal && <img src={currentVal} alt={s.label} className="w-24 h-24 object-contain rounded-lg border" />}
          <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed cursor-pointer hover:bg-secondary/50 transition-colors text-sm text-muted-foreground">
            {uploading === s.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
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
    return (
      <div className="flex items-center gap-2">
        <input
          value={getValue(s.key)}
          onChange={e => setEditValues(prev => ({ ...prev, [s.key]: e.target.value }))}
          className="flex-1 px-3 py-2.5 rounded-xl border bg-background text-sm"
        />
        {isDirty(s.key) && (
          <button onClick={() => handleSave(s.key)} className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
            <Save className="w-4 h-4" />
          </button>
        )}
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
            <p className="text-xs text-muted-foreground">Personaliza el fondo visual de cada bloque del sitio pública</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          {([
            { cssVar: '--section-warm', label: 'Sección Cálida', hint: 'Heros, formularios, FAQs' },
            { cssVar: '--section-dark', label: 'Sección Oscura', hint: 'CTAs, promo, contraste' },
            { cssVar: '--section-cream', label: 'Sección Crema', hint: 'Valores, nosotros' },
            { cssVar: '--section-terracotta', label: 'Sección Terracota', hint: 'Stats, destacados' },
            { cssVar: '--primary', label: 'Color Primario', hint: 'Botones y acentos' },
            { cssVar: '--background', label: 'Fondo del Sitio', hint: 'Color base de páginas' },
          ] as const).map(({ cssVar, label, hint }) => {
            const stateKey = `__section_${cssVar}`;
            const currentHsl = editValues[stateKey] ?? '';

            const getComputedHsl = () => {
              const v = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
              return v || '';
            };

            const hslToHex = (hslStr: string) => {
              try {
                const parts = hslStr.trim().split(/\s+/);
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
              } catch { return '#c0623a'; }
            };

            const hexToPartialHsl = (hex: string) => {
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
              if (!result) return '';
              let r = parseInt(result[1], 16) / 255;
              let g = parseInt(result[2], 16) / 255;
              let b = parseInt(result[3], 16) / 255;
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

            const displayHsl = currentHsl || getComputedHsl();

            return (
              <div key={cssVar} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-[11px] text-muted-foreground">{hint}</p>
                  </div>
                  <code className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">{cssVar}</code>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-12 h-10 rounded-xl border-2 border-border overflow-hidden cursor-pointer shadow-sm flex-shrink-0"
                    style={{ background: `hsl(${displayHsl})` }}>
                    <input
                      type="color"
                      value={hslToHex(displayHsl)}
                      onChange={e => {
                        const newHsl = hexToPartialHsl(e.target.value);
                        setEditValues(prev => ({ ...prev, [stateKey]: newHsl }));
                        document.documentElement.style.setProperty(cssVar, newHsl);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <input
                    value={displayHsl}
                    onChange={e => {
                      setEditValues(prev => ({ ...prev, [stateKey]: e.target.value }));
                      document.documentElement.style.setProperty(cssVar, e.target.value);
                    }}
                    className="flex-1 px-3 py-2 rounded-xl border bg-background text-xs font-mono"
                    placeholder="H S% L%"
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t">
          ⚠️ Los cambios de sección aplican en tiempo real pero se reinician al recargar. Para hacerlos permanentes guarda el color en la seción “Identidad Visual” de arriba.
        </p>
      </div>


      {Object.entries(categoryMeta).map(([cat, meta]) => {
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
      })}
    </div>
  );
};

export default AdminSettings;
