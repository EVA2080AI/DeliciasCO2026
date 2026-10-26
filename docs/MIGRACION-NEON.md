# Plan de migración: Supabase → Neon

Estado: propuesta, sin empezar. Fecha: 2026-10-25.
Proyecto: `delicias-co-2026` (Vercel) · `EVA2080AI/DeliciasCO2026` (GitHub).

---

## 1. Veredicto corto

Se puede hacer, y es más barato de lo que parece, **pero Neon no reemplaza a
Supabase entero**. Supabase aquí hace cuatro trabajos distintos y Neon cubre tres.

| Lo que hace Supabase hoy | ¿Lo cubre Neon? |
|---|---|
| Postgres | Sí, es lo suyo |
| API REST desde el navegador (PostgREST) | Sí, con el **Data API** |
| Autenticación | Sí, con **Neon Auth**, o un proveedor externo |
| **Almacenamiento de imágenes** | **No. No existe en Neon.** |

El punto 4 es el único sin camino directo: hay que mover el bucket a otro
servicio (Vercel Blob encaja, ya que el despliegue vive en Vercel).

Lo que hace que esta migración sea **viable y no un rewrite**: la app no usa
Realtime y solo tiene 2 usuarios administradores.

Lo que la complica más de lo que parecía al escribir la primera versión de este
plan: la RPC `create_admin_from_cms` **inserta filas directamente en
`auth.users`**, el esquema interno de Supabase. Eso no tiene equivalente en Neon
y hay que rehacerlo entero contra el proveedor de auth nuevo. Ver
[auditoría](./neon/01-auditoria.md).

---

## 2. Inventario: qué usa la app hoy

Medido sobre el código, no estimado.

| Superficie | Cantidad | Dificultad de migrar |
|---|---|---|
| `supabase.from()` | **57 llamadas** en 20 archivos | Baja: el Data API habla PostgREST |
| `supabase.auth.*` | **12 llamadas**, 9 métodos | **Alta: es la pieza grande** |
| `supabase.storage.*` | **8 llamadas**, bucket `products` | **Alta: no hay equivalente** |
| `supabase.rpc()` | **2** (`list_admin_users`, `create_admin_from_cms`) | **Alta: una escribe en `auth.users`** |
| `functions.invoke()` | **0** | Ninguna |
| Edge Functions | 1 (`upload-product-image`, 61 líneas) | Media: pasa a Vercel Function |
| Tablas | 11 | Baja: `pg_dump` / `pg_restore` |
| Archivos que importan `supabase` | 31 | Baja si se mantiene el shim |

Métodos de auth en uso: `signInWithPassword`, `signOut`, `getSession`,
`setSession`, `onAuthStateChange`, `resetPasswordForEmail`, `updateUser`,
`verifyOtp`, `exchangeCodeForSession`.

Tablas por uso: `blog_posts` (11), `products` (9), `orders` (9), `quotations` (8),
`page_sections` (8), `site_settings` (6), `pages` (5), `comanda_products` (5),
`comandas` (4), `comanda_items` (4), `user_roles` (2).

**Arquitectura actual**: SPA 100% cliente. No hay carpeta `api/` ni `server/`.
El navegador habla directo con Supabase. Esto importa: a Neon **no se puede
conectar desde el navegador por TCP**, por eso el Data API es obligatorio y no
opcional.

---

## 3. Las fases

El orden está pensado para que Supabase siga en pie hasta el último momento y
cada fase se pueda probar en un preview de Vercel antes de seguir.

### Fase 0 — Preparación (≈1 día)

- Crear el proyecto Neon desde el Marketplace de Vercel (integración
  Vercel-Managed: inyecta `DATABASE_URL` sola y factura en la de Vercel) o
  Neon-Managed si se prefiere facturar aparte.
- Habilitar el **Data API** y anotar su endpoint (`.../<db>/rest/v1`).
- Decidir el proveedor de auth (ver §5).
- Crear una **branch de Neon** para desarrollo: así se prueba sin tocar la de
  producción. Es la ventaja grande de Neon sobre Supabase para este flujo.
- Rama de git: `feat/neon-migration`.

### Fase 1 — Esquema y datos (≈1 día)

- `pg_dump` del Postgres de Supabase (schema + datos) y `pg_restore` en Neon.
- Excluir los esquemas propios de Supabase: `auth`, `storage`, `realtime`,
  `supabase_functions`. Solo viaja `public`.
- Recrear a mano lo que vive fuera de `public` y sí hace falta:
  `update_updated_at_column()`, el tipo `app_role`, y la función `has_role()`.
- Verificar conteos por tabla contra Supabase antes de seguir.

### Fase 2 — Capa de datos (≈2-3 días)

Esta es la fase que parecía cara y no lo es.

- Quitar `@supabase/supabase-js`, instalar `@supabase/postgrest-js`
  (la guía de Neon lo fija en **1.19.4**).
- Reescribir **solo** `src/integrations/supabase/client.ts` para exportar un
  `PostgrestClient` apuntando al Data API, con el token inyectado por un `fetch`
  envolvente.
- **Las 57 llamadas `.from()` no se tocan**: la sintaxis
  `.select()/.insert()/.update()/.eq()` es la misma.
- Alternativa a evaluar: `@neondatabase/neon-js`, que trae un
  `SupabaseAuthAdapter` con API compatible y ahorraría aún más cambios.
- Renombrar la carpeta `src/integrations/supabase/` → `src/integrations/db/`
  al final, no al principio (un rename temprano ensucia el diff de todo lo demás).

### Fase 3 — Autenticación (≈3-5 días) ← la fase cara

- Reimplementar los 9 métodos contra el proveedor elegido. El grueso está en
  `src/hooks/useAuth.tsx`, `AdminLogin.tsx`, `AdminResetPassword.tsx` y
  `AdminProfile.tsx`.
- Flujos que deben seguir funcionando: login, logout, sesión persistente,
  recuperar contraseña por correo, cambiar contraseña.
- **Ventaja de este proyecto: son 2 usuarios admin.** Si los hashes de contraseña
  no migran (ver §5), se resuelve con dos correos de "restablece tu clave".

### Fase 4 — RLS (≈1-2 días)

- Las políticas son Postgres puro y sobreviven, **pero `auth.uid()` es de
  Supabase** y hay que reescribirlo al claim que entregue el JWT nuevo.
- Afecta a todas las políticas que usan `has_role(auth.uid(), 'admin'::app_role)`,
  incluidas las 9 de la migración de comandas.
- ⚠️ Neon advierte que con el Data API **la seguridad depende enteramente de los
  GRANT y las políticas**: una tabla sin política queda expuesta a quien tenga la
  URL del endpoint. Revisar tabla por tabla antes del corte.

### Fase 5 — Almacenamiento (≈2-3 días) ← el hueco real

- Neon no tiene storage. Destino propuesto: **Vercel Blob**.
- Portar `src/lib/storage.ts` (subida y borrado) y la Edge Function
  `upload-product-image` a una Vercel Function.
- Copiar los archivos existentes del bucket `products` al destino nuevo.
- **Reescribir las URLs guardadas en la base**: `products.image_url` y todo lo que
  apunte al dominio de Supabase Storage. Es un `UPDATE` con `replace()`, pero hay
  que encontrarlo todo primero (también dentro de `page_sections` y `blog_posts`,
  que guardan HTML con imágenes).

### Fase 6 — Corte y vuelta atrás (≈1 día)

- Congelar escrituras en Supabase (avisar, es una panadería: hacerlo de noche).
- `pg_dump` final de los datos que cambiaron.
- Merge a `main` → despliegue.
- **Plan de reversa**: no borrar nada de Supabase durante al menos 2 semanas.
  Volver atrás = revertir el merge y redeplegar. Por eso el corte debe ser un
  solo commit limpio.

---

## 4. Estimación

**2 a 3 semanas de trabajo efectivo**, repartidas así:

```
Fase 0  Preparación      ▓                   1 día
Fase 1  Datos            ▓                   1 día
Fase 2  Capa de datos    ▓▓▓               2-3 días
Fase 3  Auth             ▓▓▓▓▓             3-5 días
Fase 4  RLS              ▓▓                1-2 días
Fase 5  Storage          ▓▓▓               2-3 días
Fase 6  Corte            ▓                   1 día
```

El 60% del esfuerzo está en Auth y Storage. La base de datos en sí es lo barato.

---

## 5. Riesgos y cosas a verificar antes de empezar

1. **Hashes de contraseña (sin resolver).** La guía de Neon dice que se pueden
   exportar los bcrypt de Supabase; dos migraciones reales publicadas dicen lo
   contrario. **Hay que verificarlo.** Con 2 usuarios, el plan B (resetear ambas
   claves) es aceptable, así que esto no bloquea.
2. **Antigüedad de la documentación.** La guía oficial de migración de Neon tiene
   ~418 días y describe "legacy Neon Auth"; la del Data API ~220 días. Contrastar
   con la doc viva antes de ejecutar cada fase.
3. **Exposición por RLS mal puesta** en el Data API. Ver Fase 4.
4. **URLs de imágenes incrustadas** en contenido HTML del CMS. Ver Fase 5.
5. **Claves de respaldo hardcodeadas** en `src/integrations/supabase/client.ts`
   (líneas 6-8): hay que quitarlas en la Fase 2, no dejarlas de recuerdo.
6. **Rol NOLOGIN en previews**: hay un reporte en el foro de Vercel de builds
   rotos porque la integración apuntaba las URLs de preview a un rol NOLOGIN
   creado para RLS. Vigilarlo al crear roles.

---

## 6. Lo que hay que decidir antes de la Fase 0

1. **Proveedor de auth**: Neon Auth gestionado (Better Auth) vs. externo
   (Clerk, Auth0). Externo es más trabajo de integración pero menos acoplamiento.
2. **Integración Vercel-Managed o Neon-Managed**: cambia quién factura.
3. **Destino del storage**: Vercel Blob u otro (S3, Cloudinary).
4. **Ventana de corte**: qué noche.

---

## 7. ¿Conviene hacerlo?

Argumentos a favor que aplican a este proyecto: una sola factura y un solo panel
(todo en Vercel), branches de base de datos para previews reales, y salir del
plan Free de Supabase que hoy obliga a optimizar imágenes en el navegador porque
no hay transformaciones.

Argumento en contra: lo que hoy funciona, funciona. Son 2-3 semanas y el riesgo
se concentra en auth y storage, que es justo lo que el dueño nota si se rompe.

Camino intermedio que vale la pena considerar: **migrar solo la base de datos a
Neon y dejar auth y storage en Supabase**. Se queda con dos proveedores, pero
recorta la migración a las fases 0, 1, 2 y 4 — una semana en vez de tres, y sin
tocar lo que más duele si falla.

---

## Fuentes

- [Neon Data API (PostgREST-compatible)](https://neon.com/docs/data-api/overview)
- [Guía oficial: migrar de Supabase a Neon](https://neon.com/guides/complete-supabase-migration)
- [Integración Vercel-Managed](https://neon.com/docs/guides/vercel-managed-integration)
- [Neon RLS / Authorize](https://neon.com/blog/introducing-neon-authorize)
- [`@neondatabase/neon-js`](https://www.npmjs.com/package/@neondatabase/neon-js)
