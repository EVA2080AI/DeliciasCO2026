# Auditoría previa a la migración a Neon

Fecha: 2026-10-25. Rama: `feat/neon-migration`.
Hecha **sin tocar producción**: todo sale de leer el repositorio.

Esto es el inventario exacto de lo que hay que reescribir, archivo por archivo.
Sustituye a cualquier estimación del plan general.

---

## ⚠️ Advertencia que condiciona todo lo demás

**El esquema vivo puede no coincidir con las migraciones del repositorio.**

Hay constancia de SQL aplicado a mano fuera del control de versiones: los
archivos `fix_admin.sql`, `fix_cms_complete.sql` y `fix_cms_phase11.sql` que
quedaron en la copia vieja del proyecto (hoy en `01-CLIENTES/OmniHub`) se
ejecutaron contra esta misma base. La migración `20260825120000_qa_fixes.sql`
los recoge, pero no hay garantía de que sea todo.

**Consecuencia:** el origen de verdad para migrar el esquema es un `pg_dump` de
la base viva, **nunca** una reconstrucción a partir de los archivos de
`supabase/migrations/`. No se debe saltar este paso.

---

## Fase 3 — Autenticación

### Archivos a reescribir

| Archivo | Llamadas | Qué hace |
|---|---|---|
| `src/pages/admin/AdminResetPassword.tsx` | 6 | El flujo más enredado: `verifyOtp`, `exchangeCodeForSession`, `setSession`, `updateUser` |
| `src/hooks/useAuth.tsx` | 3 | `getSession`, `onAuthStateChange`, `signOut`. Es el proveedor de sesión de toda la app |
| `src/pages/admin/AdminLogin.tsx` | 1 | `signInWithPassword` |
| `src/pages/admin/AdminProfile.tsx` | 1 | `updateUser` (cambio de clave) |
| `src/pages/admin/AdminUsers.tsx` | 1 | `resetPasswordForEmail` |

### Las dos RPC

Se llaman a través de un envoltorio local en `AdminUsers.tsx:24` que castea
`supabase.rpc`, por eso no aparecen en una búsqueda ingenua de `supabase.rpc(`.

| RPC | Dificultad |
|---|---|
| `list_admin_users` | Media. Hace `LEFT JOIN auth.users`. Se rehace contra la tabla de usuarios nueva |
| `create_admin_from_cms` | **La peor de la migración.** Hace `INSERT INTO auth.users (...)` directo. No hay equivalente: se reescribe entero contra la API del proveedor de auth |

### Dependencia estructural

`user_roles.user_id` tiene `REFERENCES auth.users(id) ON DELETE CASCADE`.
En Neon no existe `auth.users`, así que esa clave foránea **no puede viajar tal
cual**. Hay que decidir a qué tabla apunta en el destino antes de restaurar los
datos, o el `pg_restore` falla.

---

## Fase 4 — RLS

**20 apariciones de `auth.uid()`** en las políticas, repartidas así:

| Tabla | Políticas con `auth.uid()` |
|---|---|
| `blog_posts` | 4 |
| `user_roles` | 2 |
| `pages` | 2 |
| `site_settings` | 1 |
| `quotations` | 1 |
| `products` | 1 |
| `page_sections` | 1 |
| `orders` | 1 |

A eso se suman **9 políticas más** en la migración de comandas
(`20261025190000_comandas_panaderia.sql`), que usan el mismo patrón
`has_role(auth.uid(), 'admin'::app_role)`.

Todas pasan por la función `public.has_role()`, lo cual es una suerte: **si se
reescribe `has_role()` para que lea el claim del JWT nuevo en vez de
`auth.uid()`, las 29 políticas siguen valiendo sin tocarlas una por una.**
Ese es el atajo de esta fase.

⚠️ Neon advierte que con el Data API la seguridad depende enteramente de los
GRANT y las políticas: una tabla sin política queda expuesta a quien tenga la
URL. Revisar las 11 tablas una por una antes del corte, no solo las 8 de arriba.

---

## Fase 5 — Almacenamiento

- **Bucket único**: `product-images`, público. Se crea en
  `20260308150248_*.sql:125` junto con 4 políticas sobre `storage.objects`.
- **Punto de estrangulamiento**: `src/lib/imageUrls.ts`. Es el único archivo que
  conoce la forma de las URLs (`/storage/v1/object/public/product-images/`).
  Buena noticia: cambiar de proveedor toca sobre todo **este archivo**, más
  `src/lib/storage.ts` (subir y borrar).
- **Edge Function**: `supabase/functions/upload-product-image/index.ts`,
  61 líneas, usa el bucket directamente. Pasa a Vercel Function.
- **URLs guardadas en la base**: `products.image_url` es la columna evidente.
  Falta auditar el contenido HTML de `pages.content`, `page_sections` y
  `blog_posts.content`, que pueden incrustar `<img src>` apuntando al dominio de
  Supabase. **Esto requiere consultar la base y está pendiente** (ver bloqueos).

---

## Lo que NO hay que migrar (verificado)

- **Realtime**: cero uso en el código.
- **`functions.invoke()`**: cero llamadas. La Edge Function existe pero la app no
  la invoca por ese camino.
- **Extensiones de Postgres**: ninguna declarada en las migraciones.
- **Código de servidor**: no hay `api/` ni `server/`. Nada que portar.

---

## Bloqueos actuales

No se puede avanzar más sin esto:

| Bloqueo | Para qué hace falta |
|---|---|
| Cadena de conexión de Postgres de Supabase | `pg_dump` del esquema y los datos (Fase 1) |
| CLI de Supabase o cliente `psql`/`pg_dump` instalado | Lo mismo. Hoy no hay ninguno en la máquina |
| Proyecto Neon creado y Data API habilitado | Fases 1, 2 y 4 |
| Decisión del proveedor de auth | Fase 3 |
| Decisión del destino de storage | Fase 5 |

La consulta pendiente de la Fase 5 (buscar URLs de Supabase dentro del HTML del
CMS) **sí se puede hacer solo leyendo**, en cuanto haya acceso a la base:

```sql
SELECT 'pages' AS tabla, id, 'content' AS columna FROM public.pages
  WHERE content LIKE '%supabase.co/storage%'
UNION ALL
SELECT 'blog_posts', id, 'content' FROM public.blog_posts
  WHERE content LIKE '%supabase.co/storage%'
UNION ALL
SELECT 'page_sections', id, 'content' FROM public.page_sections
  WHERE content::text LIKE '%supabase.co/storage%';
```

---

## Siguiente paso recomendado

Antes de mover un solo dato: ejecutar esa consulta de solo lectura y crear el
proyecto Neon con una branch de desarrollo. Las dos cosas son reversibles y no
afectan a producción.
