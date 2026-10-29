# Comandas del salón — estado y cómo se opera

Última actualización: 2026-10-29.

Este archivo existe porque varias decisiones de este módulo no se deducen leyendo
el código, y porque la forma de aplicar migraciones en este proyecto **no es la
estándar**. Si vas a tocar comandas o la base, leé esto antes.

---

## 1. Qué hay

Cuatro pantallas, no tres:

| Pantalla | Ruta | Acceso |
|---|---|---|
| Mesera | `/comandas` | Link directo, **sin login** |
| Cocina | `/comandas/cocina` | Link directo, **sin login** |
| Caja | `/comandas/caja` | Link directo, **sin login** |
| Panel | `/admin/comandas` | Sesión de administrador |

Las tres del salón entran sin usuario ni contraseña: es una decisión del dueño, y
las políticas RLS la reflejan (el rol anónimo puede leer y escribir comandas, y
nada más). El panel administra el catálogo de productos, el listado de mesas, y
muestra los links para pasarle al personal.

Tablas: `comandas`, `comanda_items`, `comanda_products`, `comanda_mesas`.

## 2. Tres decisiones que parecen errores y no lo son

**La mesa no es una llave foránea.** `comandas.mesa` es TEXTO, aunque exista la
tabla `comanda_mesas`. Si fuera una llave, renombrar "Mesa 5" reescribiría lo que
decía una cuenta cobrada el mes pasado. Así el historial queda congelado.

**El catálogo de mesa es aparte del menú del sitio web.** `comanda_products` no
toca `products`: son precios de consumo en el local, no de pedidos por la web.

**Las categorías están fijas en el código** (`COMANDA_CATEGORIES` en
`src/lib/comandas.ts`). Agregar una categoría nueva es un cambio de código y un
despliegue, no algo que el dueño pueda hacer desde el panel.

## 3. Cómo se aplican las migraciones en este proyecto

**No se usa `supabase db push`.** Se pega el SQL en el SQL Editor del dashboard.

El motivo: las migraciones de marzo de 2026 no son idempotentes (27, 10 y 10
sentencias DDL sin `IF NOT EXISTS`), así que un `push` que las creyera pendientes
las re-aplicaría contra la base viva.

El 2026-10-29 se reparó el historial: las **11 versiones de `supabase/migrations/`
están registradas** en `supabase_migrations.schema_migrations`, así que un `push`
ya no las tomaría por pendientes.

> **Ojo**: la base tiene **18 versiones registradas**, no 11. Hay 7 que no existen
> como archivo en este repo — aplicadas directo, sin dejar el `.sql`. O sea que
> `supabase/migrations/` **no es el registro completo de la base**: levantar una
> base desde cero con estos archivos no reproduce producción. Pendiente:
> `supabase db pull`.

Las migraciones nuevas se escriben idempotentes (`IF NOT EXISTS`,
`DROP POLICY IF EXISTS`) para poder pegarlas más de una vez sin romper nada.

## 4. Trampas conocidas

**El service worker sirve el build viejo.** Después de un despliegue, el navegador
sigue con la versión anterior hasta una recarga dura. Si el personal no ve un
cambio recién publicado, no está roto: hay que recargar.

**Los previews de Vercel escriben en la base de PRODUCCIÓN.** Las variables
`VITE_SUPABASE_*` son las mismas en Production, Preview y Development. No hay
entorno aislado: lo que se cargue desde un preview son datos reales.

**El build falla a propósito si faltan las variables de entorno.** El plugin
`require-supabase-env` en `vite.config.ts` corta el build en vez de publicar un
bundle sin credenciales. En Vercel un build fallido deja en pie el despliegue
anterior, que es mejor que una web en blanco.

## 5. Pendiente

- `supabase db pull` para capturar las 7 migraciones que solo están en la nube.
  Requiere login del CLI en una terminal interactiva.
- **Revisar los precios de la categoría Desayunos**: se cargaron como sugerencia,
  calculados para encajar con la escala del resto del catálogo, no son precios
  confirmados por el negocio.
