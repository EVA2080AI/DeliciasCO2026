-- ============================================================================
-- Comandas Panadería (2026-10-25)
--  Servicio en mesa dentro del local: la mesera toma la comanda desde su teléfono,
--  cocina ve qué preparar y caja marca si la mesa ya pagó.
--
--  Catálogo propio (comanda_products): es el de consumo en mesa y NO toca el menú
--  público de pedidos (public.products), que sigue siendo el del sitio web.
--
--  Idempotente: se puede aplicar con `supabase db push` o pegar en el SQL Editor
--  varias veces.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Catálogo de mesa
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comanda_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'panaderia',
  price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- El seed de abajo usa ON CONFLICT (name) para poder re-aplicarse sin duplicar.
CREATE UNIQUE INDEX IF NOT EXISTS comanda_products_name_key ON public.comanda_products (name);
CREATE INDEX IF NOT EXISTS comanda_products_active_sort_order_idx ON public.comanda_products (active, sort_order);

-- ---------------------------------------------------------------------------
-- 2. Comandas (una por mesa abierta)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comandas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mesa TEXT NOT NULL,
  mesera TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierta' CHECK (status IN ('abierta', 'cerrada')),
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comandas_status_created_at_idx ON public.comandas (status, created_at DESC);
CREATE INDEX IF NOT EXISTS comandas_paid_idx ON public.comandas (paid);

-- ---------------------------------------------------------------------------
-- 3. Renglones de cada comanda
--    name y unit_price son una foto del catálogo al momento de pedir: si el dueño
--    cambia el precio desde el admin, las comandas ya tomadas no se alteran.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.comanda_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comanda_id UUID NOT NULL REFERENCES public.comandas (id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.comanda_products (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT DEFAULT '',
  ready BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comanda_items_comanda_id_idx ON public.comanda_items (comanda_id);
CREATE INDEX IF NOT EXISTS comanda_items_ready_idx ON public.comanda_items (ready);

-- ---------------------------------------------------------------------------
-- 4. updated_at
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS update_comanda_products_updated_at ON public.comanda_products;
CREATE TRIGGER update_comanda_products_updated_at
  BEFORE UPDATE ON public.comanda_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_comandas_updated_at ON public.comandas;
CREATE TRIGGER update_comandas_updated_at
  BEFORE UPDATE ON public.comandas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. RLS
--    Decisión del dueño: meseras, cocina y caja entran por un link público sin
--    clave, así que el rol anónimo puede leer y escribir las comandas. El acceso
--    anónimo llega hasta aquí y no alcanza products, orders ni quotations.
--    El catálogo y sus precios siguen siendo solo de administradores.
-- ---------------------------------------------------------------------------
ALTER TABLE public.comanda_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comandas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comanda_items ENABLE ROW LEVEL SECURITY;

-- 5.1 Catálogo: todos leen lo activo, solo el admin escribe precios.
DROP POLICY IF EXISTS "Comanda products viewable by everyone" ON public.comanda_products;
CREATE POLICY "Comanda products viewable by everyone" ON public.comanda_products
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage comanda products" ON public.comanda_products;
CREATE POLICY "Admins can manage comanda products" ON public.comanda_products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5.2 Comandas: abrir, consultar y actualizar (cocina y caja) sin sesión.
--     Borrar queda solo para el admin: una comanda con historial no se tira desde el salón.
DROP POLICY IF EXISTS "Anyone can read comandas" ON public.comandas;
CREATE POLICY "Anyone can read comandas" ON public.comandas
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can open comandas" ON public.comandas;
CREATE POLICY "Anyone can open comandas" ON public.comandas
  FOR INSERT WITH CHECK (paid = false AND status = 'abierta');

DROP POLICY IF EXISTS "Anyone can update comandas" ON public.comandas;
CREATE POLICY "Anyone can update comandas" ON public.comandas
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete comandas" ON public.comandas;
CREATE POLICY "Admins can delete comandas" ON public.comandas
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5.3 Renglones: no se agregan ni se quitan sobre una mesa ya pagada.
--     Esta guarda es la que evita que la cuenta cambie después de cobrar.
DROP POLICY IF EXISTS "Anyone can read comanda items" ON public.comanda_items;
CREATE POLICY "Anyone can read comanda items" ON public.comanda_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can add items to an unpaid comanda" ON public.comanda_items;
CREATE POLICY "Anyone can add items to an unpaid comanda" ON public.comanda_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_id AND c.paid = false AND c.status = 'abierta'
    )
  );

-- Cocina marca "listo": se permite mientras la mesa no esté cobrada.
DROP POLICY IF EXISTS "Anyone can update items of an unpaid comanda" ON public.comanda_items;
CREATE POLICY "Anyone can update items of an unpaid comanda" ON public.comanda_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_id AND c.paid = false
    )
  );

DROP POLICY IF EXISTS "Anyone can remove items of an unpaid comanda" ON public.comanda_items;
CREATE POLICY "Anyone can remove items of an unpaid comanda" ON public.comanda_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.comandas c
      WHERE c.id = comanda_id AND c.paid = false AND c.status = 'abierta'
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Catálogo por defecto de panadería
--    Precios en pesos colombianos. El dueño los ajusta desde /admin/comandas.
--    ON CONFLICT: re-aplicar la migración no pisa los precios ya editados.
-- ---------------------------------------------------------------------------
INSERT INTO public.comanda_products (name, category, price, sort_order) VALUES
  ('Pastel de pollo',                   'panaderia', 5000, 10),
  ('Pastel de pollo con champiñones',   'panaderia', 5500, 11),
  ('Pastel de carne',                   'panaderia', 5000, 12),
  ('Empanada de carne',                 'panaderia', 3000, 13),
  ('Empanada de pollo',                 'panaderia', 3000, 14),
  ('Pandebono',                         'panaderia', 3000, 15),
  ('Almojábana',                        'panaderia', 3500, 16),
  ('Buñuelo',                           'panaderia', 3000, 17),
  ('Pan de yuca',                       'panaderia', 3000, 18),
  ('Palito de queso',                   'panaderia', 3500, 19),
  ('Croissant',                         'panaderia', 4500, 20),
  ('Roscón de arequipe',                'panaderia', 4500, 21),
  ('Mantecada',                         'panaderia', 3500, 22),
  ('Mogolla integral',                  'panaderia', 3000, 23),
  ('Tinto',                             'cafeteria', 2000, 40),
  ('Café con leche',                    'cafeteria', 4000, 41),
  ('Capuchino',                         'cafeteria', 6000, 42),
  ('Chocolate con queso',               'cafeteria', 6500, 43),
  ('Aguapanela con queso',              'cafeteria', 5500, 44),
  ('Avena',                             'cafeteria', 4500, 45),
  ('Jugo natural en agua',              'bebidas',   6000, 60),
  ('Jugo natural en leche',             'bebidas',   7000, 61),
  ('Gaseosa personal',                  'bebidas',   3500, 62),
  ('Agua',                              'bebidas',   2500, 63)
ON CONFLICT (name) DO NOTHING;
