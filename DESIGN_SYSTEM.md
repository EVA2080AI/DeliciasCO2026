# Design System — DC Delicias Colombianas
**Versión:** 1.0 | **Stack:** React + TypeScript + Tailwind CSS + shadcn/ui

---

## 1. Principios de Diseño

| Principio | Descripción |
|-----------|-------------|
| **Artesanal** | El diseño evoca calidez, tradición y calidad colombiana. No minimalismo frío. |
| **Accessible-first** | WCAG 2.1 AA mínimo. Contraste, ARIA, focus visible. |
| **CMS-driven** | Todo el copy y colores son configurables desde el admin. Los valores default son fallbacks. |
| **Dark mode nativo** | Todo componente debe verse bien en ambos modos sin excepciones. |
| **Mobile-first** | Diseño base para 375px, escala hacia 1440px. |

---

## 2. Paleta de Colores (CSS Custom Properties)

Todos los valores son en formato HSL sin `hsl()`. Tailwind los consume con `hsl(var(--token))`.

### 2.1 Colores Semánticos (light / dark)

| Token | Light Mode | Dark Mode | Uso |
|-------|-----------|-----------|-----|
| `--background` | `40 20% 98%` (crema) | `24 10% 4%` (casi negro) | Fondo de página |
| `--foreground` | `20 40% 8%` (marrón oscuro) | `38 25% 95%` (crema claro) | Texto principal |
| `--primary` | `14 72% 42%` (terracota) | `14 78% 54%` (terracota claro) | Acción principal, CTAs |
| `--primary-foreground` | `0 0% 100%` | `24 10% 4%` | Texto sobre primary |
| `--secondary` | `32 25% 91%` | `24 10% 12%` | Fondos secundarios, chips |
| `--muted` | `30 12% 93%` | `20 8% 15%` | Fondos desactivados/neutros |
| `--muted-foreground` | `20 12% 40%` | `25 10% 55%` | Texto secundario, labels |
| `--card` | `0 0% 100%` | `24 8% 6%` | Tarjetas, paneles |
| `--border` | `30 18% 86%` | `24 10% 18%` | Bordes de inputs y cards |
| `--destructive` | `0 80% 48%` | `0 72% 52%` | Errores, eliminar |
| `--ring` | `14 72% 42%` | `14 78% 54%` | Focus ring (igual que primary) |

### 2.2 Paleta de Marca (brand)

| Token | Valor (Light) | Descripción |
|-------|--------------|-------------|
| `--terracotta` | `14 72% 42%` | Color principal de identidad |
| `--terracotta-light` | `16 60% 55%` | Hover states sobre terracota |
| `--terracotta-dark` | `12 75% 28%` | Pressed states, gradients |
| `--warm-brown` | `20 45% 12%` | Textos oscuros en secciones warm |
| `--cinnamon` | `18 55% 28%` | Acentos secundarios (canela) |
| `--cream` | `38 30% 96%` | Fondos muy suaves |

### 2.3 Fondos de Sección

> ⚠️ **Regla de oro:** `bg-section-dark` siempre necesita `text-white`. NUNCA `text-background`.

| Clase | CSS Var | Light | Dark | Texto recomendado |
|-------|---------|-------|------|-------------------|
| `.bg-section-warm` | `--section-warm` | `28 22% 93%` | `24 10% 7%` | `text-foreground` / `text-muted-foreground` |
| `.bg-section-dark` | `--section-dark` | `20 45% 12%` | `24 14% 3%` | **`text-white` / `text-white/60`** |
| `.bg-section-cream` | `--section-cream` | `38 30% 96%` | `24 12% 5%` | `text-foreground` / `text-muted-foreground` |
| `.bg-section-terracotta` | `--section-terracotta` | `14 72% 42%` | `14 70% 25%` | `text-primary-foreground` / `text-primary-foreground/70` |

---

## 3. Tipografía

### Familias
| Variable | Default | Uso |
|----------|---------|-----|
| `--font-display` | `'Plus Jakarta Sans', sans-serif` | Títulos (h1–h6) |
| `--font-body` | `'Plus Jakarta Sans', sans-serif` | Cuerpo, párrafos, labels |

> Las fuentes son configurables desde Admin → Settings. Se cargan dinámicamente desde Google Fonts via `DynamicTheme.tsx`.

### Escala de Tamaños (Tailwind)
| Clase | Uso |
|-------|-----|
| `text-[11px] tracking-[0.2em] uppercase font-bold` | Eyebrow / label de sección |
| `text-4xl md:text-5xl lg:text-6xl` | H1 hero |
| `text-3xl md:text-4xl` | H2 sección |
| `text-xl` | H3 tarjeta |
| `text-base leading-relaxed` | Párrafo cuerpo |
| `text-sm` | Labels, captions |
| `text-xs` | Metadatos, fechas, badges |

---

## 4. Espaciado y Layout

### Max widths
```
max-w-[1440px] mx-auto px-6 lg:px-10   ← contenedor principal
max-w-2xl mx-auto px-6                  ← formularios
max-w-4xl mx-auto px-6 lg:px-10        ← contenido editorial
max-w-lg mx-auto px-6                   ← páginas centered (checkout success, etc.)
```

### Padding de secciones
```
py-12 md:py-16    ← sección compacta
py-16 md:py-24    ← sección hero
py-20             ← sección featured / grid
```

---

## 5. Componentes Base

### 5.1 Botones (`.btn-*` en index.css)

| Clase | Uso | Background | Texto |
|-------|-----|-----------|-------|
| `.btn-primary` | CTA principal sobre fondos claros | `foreground` | `background` |
| `.btn-outline` | Secundario sobre fondos claros | transparent | `foreground` |
| `.btn-outline-light` | CTAs sobre fondos oscuros/terracota | transparent | `background` |

> ⚠️ **Nunca usar `.btn-primary` sobre `.bg-section-dark`** — el `background` se vuelve oscuro en dark mode. Usar `.btn-outline-light`.

```tsx
// ✅ Correcto
<section className="bg-section-dark">
  <Link className="btn-outline-light">Ver más</Link>
</section>

// ✅ Correcto
<section className="bg-section-warm">
  <Link className="btn-primary">Pedir ahora</Link>
</section>
```

### 5.2 Inputs

```tsx
// Clase base estándar para todos los inputs
const inputClass = "w-full px-4 py-3.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"

// Input con ícono a la izquierda
<div className="relative">
  <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
  <input className={`${inputClass} pl-11`} />
</div>

// Input de fecha — usar siempre DateInput.tsx
<DateInput value={date} onChange={setDate} placeholder="Fecha de entrega" min={today} />
```

> **Regla de copy:** Los placeholders NO llevan la palabra "opcional". Si un campo no es requerido, simplemente no pongas `*` al final del label.

### 5.3 Cards

```tsx
// Card estándar
<div className="bg-card border rounded-2xl p-7 shadow-soft">

// Card con hover
<div className="rounded-2xl overflow-hidden bg-section-cream h-full flex flex-col transition-all duration-300 hover:shadow-elevated">
```

### 5.4 Chips / Badges de sección

```tsx
// Eyebrow label de sección
<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
  Categoría
</p>

// Chip de categoría (.chip en index.css)
<span className="chip">Pastelería</span>
```

### 5.5 Sombras

| Clase | Variable | Uso |
|-------|---------|-----|
| `shadow-soft` | `--shadow-soft` | Cards en reposo |
| `shadow-medium` | `--shadow-medium` | Hover states |
| `shadow-gold` | `--shadow-warm` | CTAs terracota |
| `shadow-elevated` | `--shadow-elevated` | Modales, popovers |

---

## 6. Animaciones (ScrollAnimations.tsx)

| Componente | Uso |
|-----------|-----|
| `<FadeInWhenVisible>` | Elementos individuales que aparecen al hacer scroll |
| `<FadeInWhenVisible direction="left">` | Entrada desde la izquierda |
| `<StaggerContainer staggerDelay={0.1}>` | Wrapper para grids con animación staggered |
| `<StaggerItem>` | Hijo de StaggerContainer |
| `<CountUp end={40} suffix="+">` | Números animados con locale es-CO |
| `<ParallaxSection>` | Sección con efecto parallax suave |

---

## 7. Componentes Reutilizables

| Componente | Path | Descripción |
|-----------|------|-------------|
| `ProductCard` | `@/components/ProductCard` | Tarjeta de producto con add-to-cart |
| `DateInput` | `@/components/DateInput` | Input de fecha sin doble ícono nativo |
| `ErrorBoundary` | `@/components/ErrorBoundary` | Catch de errores React con UI de recuperación |
| `FloatingWhatsApp` | `@/components/FloatingWhatsApp` | Botón flotante multi-sede |
| `DynamicTheme` | `@/components/DynamicTheme` | Aplica colores/fuentes del CMS + dark mode |
| `Layout` | `@/components/Layout` | Shell: Header + main + Footer + Cart + WhatsApp |

---

## 8. Hooks de Datos

| Hook | Descripción |
|------|-------------|
| `useProducts()` | Lista de productos activos (TanStack Query, stale 5min) |
| `useProduct(id)` | Producto individual por ID |
| `useSedes()` | Sedes desde site_settings, fallback a datos locales |
| `useSiteSettingsMap()` | Map de todos los site_settings |
| `usePageSectionsMap(page)` | Map de secciones CMS por página |
| `useAuth()` | Usuario autenticado y rol |
| `usePageTitle(title?)` | Actualiza el `<title>` de la página |

---

## 9. Patrones de Página

### Página con Hero split (2 columnas imagen + texto)
```tsx
<section className="w-full bg-section-{warm|dark|cream}">
  <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2 min-h-[500px]">
    <div className="relative min-h-[350px] md:min-h-0 overflow-hidden">
      <img className="w-full h-full object-cover" />
    </div>
    <FadeInWhenVisible className="flex flex-col justify-center px-8 py-16 md:px-16 lg:px-24">
      {/* Eyebrow → H2 → p → CTA */}
    </FadeInWhenVisible>
  </div>
</section>
```

### Grid de tarjetas
```tsx
<StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8" staggerDelay={0.1}>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <ProductCard product={item} />
    </StaggerItem>
  ))}
</StaggerContainer>
```

---

## 10. Reglas de Dark Mode

1. **Secciones con `bg-section-dark`:** siempre `text-white` / `text-white/60`
2. **Secciones con `bg-section-warm/cream`:** usar `text-foreground` (se adapta solo)
3. **Footer (`bg-foreground`):** `text-background` es correcto aquí (el foreground se invierte)
4. **Header (`bg-background`):** `text-foreground` siempre
5. **DynamicTheme** aplica el color primario con boost de luminosidad en dark mode
6. **No usar colores hex directos** — usar siempre los tokens CSS para que respondan al modo

---

## 11. Versionado y Convenciones

- **Commits:** `feat:`, `fix:`, `refactor:`, `style:`, `docs:`
- **Componentes:** PascalCase. Hooks: camelCase con prefijo `use`
- **Clases Tailwind:** orden: layout → spacing → colors → typography → effects
- **No usar `@apply`** en componentes individuales (solo en `index.css` para las clases globales)
- **Imports:** siempre usar alias `@/` sobre rutas relativas
