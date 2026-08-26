# DC Delicias Colombianas — sitio web + panel

Sitio público (menú, pedidos por WhatsApp, cotizaciones empresariales, blog) y panel de administración (CMS) para **elmejorpasteldepollodc.com**.

- **Stack:** Vite 5 · React 18 · TypeScript · Tailwind · Supabase (Postgres + Auth + Storage) · TanStack Query · Zustand · framer-motion · PWA.
- **Deploy:** Vercel (proyecto `delicias-co-2026`, integración con GitHub → cada push a `main` despliega).
- **Backend:** Supabase proyecto `sqshrqbopwmxkfkvmmtd` (plan Free: sin transformaciones de imagen, por eso todo se optimiza en el navegador al subir).

## Desarrollo

```sh
npm install
cp .env.example .env        # y pon las claves públicas (VITE_SUPABASE_URL / ANON_KEY)
npm run dev                 # http://localhost:8080
npm run typecheck           # tsc
npm run lint                # eslint
npm test                    # vitest
npm run build && npm run preview
```

`.env` no se versiona. Solo contiene claves **públicas** (anon key); nunca pongas la service-role key ni contraseñas en el repo.

## Base de datos

Las migraciones viven en `supabase/migrations/`. Para aplicarlas:

```sh
supabase login
supabase link --project-ref sqshrqbopwmxkfkvmmtd
supabase db push
```

o pega el contenido del archivo nuevo en el **SQL Editor** del dashboard (las migraciones son idempotentes).

Regenerar tipos tras cambiar el esquema: `supabase gen types typescript --linked > src/integrations/supabase/types.ts`.

## Imágenes

- Toda subida desde el panel pasa por `src/lib/storage.ts` → `uploadOptimizedImage()`: convierte a **WebP**, redimensiona según el uso (`IMAGE_PRESETS` en `src/lib/imageCompression.ts`), genera una miniatura `-thumb.webp` y sube a una ruta **única** con caché de un año. Nunca se reescribe una ruta existente (el CDN la cachea).
- Las listas (carrito, cotización, admin) usan `<ThumbImage>`; las imágenes grandes `<SafeImage>` (`src/components/ThumbImage.tsx`), con fallback a `/placeholder.svg`.
- **Admin → Medios → "Optimizar imágenes"** re-procesa las imágenes ya existentes en el bucket (analiza → ejecuta → verifica) y actualiza las referencias en la base de datos. Ejecutarlo en Chrome de escritorio con un usuario que tenga rol `admin` en `user_roles`. Recomendado: primera pasada sin borrar, revisar el sitio, segunda pasada con "Eliminar huérfanas".
- Assets locales (`src/assets/images/*.webp`, iconos PWA, `og-image.jpg`) se generan con `node scripts/optimize-static.mjs` (usa `sharp`); solo hace falta volver a correrlo si cambia el logo.

## Notificaciones de pedidos / cotizaciones

Sin dependencias externas: el panel (barra lateral) muestra cada minuto un contador de cotizaciones
y pedidos pendientes (`admin-pending-counts`), y si el dueño activa "Activar avisos" en el pie de la
barra lateral, el navegador dispara una notificación del sistema cuando ese contador sube.
`site_settings.notification_email` queda disponible por si más adelante se conecta un proveedor de
correo (Resend u otro) a un Database Webhook — hoy no hay ninguno configurado.

## Estructura

```
src/
  pages/            páginas públicas y admin (cargadas bajo demanda)
  components/       Layout persistente, Header/Footer, ThumbImage, admin/*
  hooks/            useSiteSettings, usePageSections, useSedes, useAuth, useAdminQuery
  lib/              whatsapp, storage, imageCompression, mediaOptimizer, cmsSync, dates
  store/cartStore   carrito (persistido, versionado)
supabase/           migraciones y Edge Functions
scripts/            optimize-static.mjs
```

## Convenciones

- Enlaces de WhatsApp: siempre `buildWaUrl()` (`src/lib/whatsapp.ts`); para abrir WhatsApp después de guardar en la base de datos usar `openWhatsAppAfter()` (evita el bloqueo de popups en Safari/iOS).
- Consultas del panel: `useAdminQuery` (siempre frescas). Mutaciones: `invalidateCms(qc, CMS_KEYS.x)` para refrescar también la pestaña pública abierta.
- Fechas de entrega: `localISODate()` (hora local, no UTC).
