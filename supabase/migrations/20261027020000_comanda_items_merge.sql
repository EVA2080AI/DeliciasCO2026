-- ============================================================================
-- Comandas: un producto, un renglón (2026-10-27)
--  Antes cada toque creaba una línea nueva: cocina veía "1 Pastel de pollo"
--  repetido en vez de "2 Pastel de pollo", y el ticket se alargaba sin motivo.
--
--  Idempotente: se puede aplicar varias veces.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Un producto no puede estar dos veces en la misma comanda.
--    Parcial: los renglones huérfanos (product_id NULL, porque se borró el
--    producto del catálogo) quedan fuera y no se fusionan entre sí.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS comanda_items_comanda_product_key
  ON public.comanda_items (comanda_id, product_id)
  WHERE product_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Suma atómica.
--    Un doble toque en el móvil es lo normal, y dos meseras pueden cantar la
--    misma mesa a la vez. Si el cliente leyera la cantidad, le sumara uno y la
--    escribiera, las dos lecturas verían 1 y las dos escribirían 2: se perdería
--    una unidad. Aquí la suma ocurre dentro de la sentencia.
--
--    El nombre y el precio salen del catálogo en el servidor, no del cliente:
--    así el link público no puede inyectar un precio inventado, y se mantiene
--    la foto del precio al momento de pedir.
--
--    SECURITY INVOKER (por defecto): siguen aplicando las políticas RLS, así
--    que no se puede agregar nada a una mesa ya pagada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.add_comanda_item(
  p_comanda_id uuid,
  p_product_id uuid,
  p_quantity integer DEFAULT 1
)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO public.comanda_items (comanda_id, product_id, name, unit_price, quantity)
  SELECT p_comanda_id, p.id, p.name, p.price, greatest(p_quantity, 1)
    FROM public.comanda_products p
   WHERE p.id = p_product_id AND p.active = true
  ON CONFLICT (comanda_id, product_id) WHERE product_id IS NOT NULL
  DO UPDATE SET quantity = public.comanda_items.quantity + EXCLUDED.quantity;
$$;

REVOKE ALL ON FUNCTION public.add_comanda_item(uuid, uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_comanda_item(uuid, uuid, integer) TO anon, authenticated;
