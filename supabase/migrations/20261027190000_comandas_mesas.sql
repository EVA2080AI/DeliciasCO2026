-- ============================================================================
-- Mesas del salón (2026-10-27)
--  Hasta ahora la mesa era texto libre dentro de cada comanda: "Mesa 5", "mesa 5"
--  y "Mesa5" eran tres mesas distintas para la caja. Esta tabla le da al dueño un
--  listado fijo que la mesera toca en vez de escribir.
--
--  La mesa sigue viajando como TEXTO dentro de comandas.mesa y NO como llave
--  foránea, a propósito: una cuenta vieja tiene que poder nombrar una mesa que el
--  dueño ya borró del salón, y renombrar "Mesa 5" hoy no puede reescribir lo que
--  decía la comanda de ayer.
--
--  Idempotente: se puede aplicar con `supabase db push` o pegar en el SQL Editor
--  varias veces.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.comanda_mesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dos mesas con el mismo nombre volverían a romper justo lo que esto arregla.
CREATE UNIQUE INDEX IF NOT EXISTS comanda_mesas_name_key ON public.comanda_mesas (name);
CREATE INDEX IF NOT EXISTS comanda_mesas_active_sort_order_idx ON public.comanda_mesas (active, sort_order);

DROP TRIGGER IF EXISTS update_comanda_mesas_updated_at ON public.comanda_mesas;
CREATE TRIGGER update_comanda_mesas_updated_at
  BEFORE UPDATE ON public.comanda_mesas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------------
-- RLS: mismo criterio que el catálogo de productos. La mesera entra por link sin
-- clave y necesita leer las mesas activas; darlas de alta o de baja es del admin.
-- ---------------------------------------------------------------------------
ALTER TABLE public.comanda_mesas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comanda mesas viewable by everyone" ON public.comanda_mesas;
CREATE POLICY "Comanda mesas viewable by everyone" ON public.comanda_mesas
  FOR SELECT USING (active = true OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can manage comanda mesas" ON public.comanda_mesas;
CREATE POLICY "Admins can manage comanda mesas" ON public.comanda_mesas
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role));
