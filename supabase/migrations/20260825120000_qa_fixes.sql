-- ============================================================================
-- QA fixes (2026-08-25)
--  1. quotations: columnas estructuradas de entrega (delivery_type, sede, address, requested_date)
--  2. Índices para los listados del admin
--  3. blog_posts: los borradores solo los ven los admins
--  4. RPCs de administración que la app llama (list_admin_users, create_admin_from_cms)
--  5. Rol admin del dueño (antes en fix_admin.sql)
--  6. Seeds de page_sections / site_settings que la app lee (antes en fix_cms_*.sql)
--
-- Idempotente: se puede aplicar con `supabase db push` o pegar en el SQL Editor varias veces.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. quotations
-- ---------------------------------------------------------------------------
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS delivery_type text,
  ADD COLUMN IF NOT EXISTS sede text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS requested_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'quotations_delivery_type_check' AND conrelid = 'public.quotations'::regclass
  ) THEN
    ALTER TABLE public.quotations
      ADD CONSTRAINT quotations_delivery_type_check
      CHECK (delivery_type IS NULL OR delivery_type IN ('pickup', 'delivery'));
  END IF;
END $$;

COMMENT ON COLUMN public.quotations.delivery_type IS 'pickup | delivery';
COMMENT ON COLUMN public.quotations.sede IS 'id de la sede (site_settings.sedes[].id) cuando delivery_type = pickup';
COMMENT ON COLUMN public.quotations.address IS 'Dirección completa cuando delivery_type = delivery';
COMMENT ON COLUMN public.quotations.requested_date IS 'Fecha deseada de entrega/recogida';

-- ---------------------------------------------------------------------------
-- 2. Índices (page_sections ya tiene UNIQUE(page_slug, section_key), que cubre el filtro por página)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS quotations_status_created_at_idx ON public.quotations (status, created_at DESC);
CREATE INDEX IF NOT EXISTS quotations_sede_idx ON public.quotations (sede);
CREATE INDEX IF NOT EXISTS orders_status_created_at_idx ON public.orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_sede_idx ON public.orders (sede);
CREATE INDEX IF NOT EXISTS products_active_sort_order_idx ON public.products (active, sort_order);
CREATE INDEX IF NOT EXISTS blog_posts_published_published_at_idx ON public.blog_posts (published, published_at DESC);

-- ---------------------------------------------------------------------------
-- 3. blog_posts: borradores visibles solo para admins
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Published posts viewable by everyone" ON public.blog_posts;
CREATE POLICY "Published posts viewable by everyone" ON public.blog_posts
  FOR SELECT USING (published = true OR public.has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------------
-- 4. RPCs de administración (SECURITY DEFINER, solo para admins autenticados)
-- ---------------------------------------------------------------------------

-- Lista los administradores con su correo (AdminUsers.tsx → supabase.rpc('list_admin_users')).
-- user_roles no tiene created_at: se usa la fecha de creación del usuario en auth.users.
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (id uuid, user_id uuid, role app_role, created_at timestamptz, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.id, ur.user_id, ur.role, au.created_at, au.email::text
  FROM public.user_roles ur
  LEFT JOIN auth.users au ON au.id = ur.user_id
  WHERE ur.role = 'admin'::app_role
    AND public.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY au.created_at NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_admin_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated;

-- Crea un usuario en Supabase Auth y le asigna rol admin (AdminUsers.tsx → rpc('create_admin_from_cms')).
-- Devuelve 'SUCCESS' o 'ERROR: ...' (la app comprueba el prefijo "ERROR:").
CREATE OR REPLACE FUNCTION public.create_admin_from_cms(
  admin_email text,
  admin_password text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_user_id uuid;
  clean_email text := lower(trim(admin_email));
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN 'ERROR: Solo un administrador puede crear otros administradores.';
  END IF;

  IF clean_email IS NULL OR clean_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RETURN 'ERROR: El correo electrónico no es válido.';
  END IF;

  IF admin_password IS NULL OR length(admin_password) < 6 THEN
    RETURN 'ERROR: La contraseña debe tener al menos 6 caracteres.';
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = clean_email) THEN
    RETURN 'ERROR: El correo electrónico ya está en uso.';
  END IF;

  new_user_id := gen_random_uuid();

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    clean_email,
    extensions.crypt(admin_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '', '', '', ''
  );

  INSERT INTO auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    format('{"sub":"%s","email":"%s"}', new_user_id::text, clean_email)::jsonb,
    'email',
    now(),
    now(),
    now()
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'admin'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN 'SUCCESS';
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_from_cms(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_admin_from_cms(text, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Rol admin del dueño (el bypass por email en useAuth NO da permisos RLS; hace falta esta fila)
-- ---------------------------------------------------------------------------
-- Incluye los correos con bypass en src/hooks/useAuth.tsx: sin fila en user_roles pueden entrar
-- al panel pero RLS rechaza cada escritura ("entro pero nada guarda").
DO $$
DECLARE
  u_id uuid;
  admin_email text;
BEGIN
  FOREACH admin_email IN ARRAY ARRAY['sebastian689@gmail.com', 'admin@delicias.com', 'deliciascolombianas1985@gmail.com'] LOOP
    SELECT id INTO u_id FROM auth.users WHERE lower(email) = admin_email LIMIT 1;
    IF u_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (u_id, 'admin'::app_role)
      ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 6. Seeds que la app lee (no pisan ediciones del dueño: ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------

-- Página Institucional (InstitucionalPage → usePageSectionsMap('institucional'))
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, active, sort_order)
VALUES
  ('institucional', 'hero', 'Cotización Corporativa', 'Servicio B2B', 'Arma tu paquete para eventos, desayunos corporativos o catering.', true, 1),
  ('institucional', 'step1', '1. Selecciona productos y cantidades', '', 'Elige los productos favoritos para tu evento corporativo.', true, 2),
  ('institucional', 'step2', '2. Datos de la empresa', '', 'Indícanos los datos de facturación y entrega para procesar tu solicitud.', true, 3)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- Preguntas frecuentes (FaqPage → usePageSectionsMap('faq'))
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, sort_order, active, metadata)
VALUES
  ('faq', 'pedidos', 'Pedidos y Envíos', 'Pedidos y Envíos', '', 1, true,
   '{"items":[{"q":"¿Hacen domicilios en Bogotá?","a":"Sí, realizamos envíos en Bogotá a través de nuestras sedes de Quirinal y Sprint Norte. El valor del domicilio se calcula según la distancia."},{"q":"¿Cuál es el tiempo de entrega?","a":"Los pedidos regulares se entregan en 1 a 2 horas dentro de nuestra zona de cobertura. Para pedidos institucionales, coordinamos con anticipación."},{"q":"¿Puedo hacer pedidos por anticipado?","a":"Para pedidos grandes te recomendamos hacerlo con al menos 24 horas de anticipación para garantizar disponibilidad y frescura."},{"q":"¿Cuáles son los medios de pago?","a":"Aceptamos efectivo, tarjeta débito/crédito, Nequi, Daviplata y transferencia bancaria."}]}'::jsonb),
  ('faq', 'productos', 'Productos', 'Productos', '', 2, true,
   '{"items":[{"q":"¿Los productos son frescos?","a":"Todo se prepara diariamente con ingredientes frescos. No usamos conservantes, colorantes artificiales ni productos pre-fabricados."},{"q":"¿Tienen opciones vegetarianas?","a":"Sí, ofrecemos almojábanas, pan de bono, pan de yuca y jugos naturales aptos para vegetarianos."},{"q":"¿Cuál es el producto más vendido?","a":"Nuestro legendario Pastel de Pollo es el favorito. Más de 40 años perfeccionando la receta."},{"q":"¿Manejan productos sin gluten?","a":"El pan de bono (hecho con almidón de yuca) es naturalmente libre de gluten. Consulta para más opciones."}]}'::jsonb),
  ('faq', 'institucional', 'Servicio Institucional', 'Servicio Institucional', '', 3, true,
   '{"items":[{"q":"¿Cuál es el pedido mínimo para empresas?","a":"No hay pedido mínimo, pero los mejores precios se obtienen a partir de 20 unidades por producto."},{"q":"¿Ofrecen desayunos corporativos?","a":"Sí, armamos combos de desayuno que incluyen pasteles, bebidas calientes y jugos."},{"q":"¿Hacen catering para eventos?","a":"Ofrecemos catering para eventos empresariales, reuniones y celebraciones."}]}'::jsonb),
  ('faq', 'sedes_horarios', 'Sedes y Horarios', 'Sedes y Horarios', '', 4, true,
   '{"items":[{"q":"¿Cuáles son los horarios?","a":"Lunes a sábado de 6:00 AM a 8:00 PM. Domingos y festivos de 7:00 AM a 3:00 PM."},{"q":"¿Puedo visitar sin reservar?","a":"Sí, nuestras sedes están abiertas al público sin necesidad de reserva."},{"q":"¿Tienen parqueadero?","a":"Sede Quirinal cuenta con parqueadero. En Sprint Norte hay zonas de parqueo público cercanas."},{"q":"¿Van a abrir más sedes?","a":"Estamos evaluando opciones de expansión en Bogotá. ¡Síguenos en redes!"}]}'::jsonb)
ON CONFLICT (page_slug, section_key) DO NOTHING;

-- site_settings: banner del footer (Footer.tsx), correo de avisos (Fase 6) y colores de secciones
-- (AdminSettings "Colores de Secciones" + DynamicTheme). Valores = defaults claros de src/index.css.
INSERT INTO public.site_settings (key, value, type, category, label, sort_order)
VALUES
  ('footer_cta_title', '¿Antojo de algo delicioso?', 'text', 'brand', 'Título Banner Footer', 20),
  ('footer_cta_subtitle', 'Haz tu pedido en línea y recógelo en tu sede favorita', 'text', 'brand', 'Subtítulo Banner Footer', 21),
  ('notification_email', '', 'text', 'contact', 'Correo para avisos de pedidos/cotizaciones', 10),
  ('section_color_warm', '28 22% 93%', 'color', 'sections', 'Fondo cálido (bg-section-warm)', 1),
  ('section_color_dark', '20 45% 12%', 'color', 'sections', 'Fondo oscuro (bg-section-dark)', 2),
  ('section_color_cream', '38 30% 96%', 'color', 'sections', 'Fondo crema (bg-section-cream)', 3),
  ('section_color_terracotta', '14 72% 42%', 'color', 'sections', 'Fondo terracota (bg-section-terracotta)', 4)
ON CONFLICT (key) DO NOTHING;
