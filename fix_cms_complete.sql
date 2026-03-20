-- ============================================
-- SCRIPT DE LIMPIEZA Y SEED DEL CMS
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- 1. LIMPIAR DUPLICADOS EN NOSOTROS
-- Las secciones en inglés (origin, discipline, pivot, promise, values, cta-blog)
-- son duplicados de las versiones en español que usa el código React.
DELETE FROM public.page_sections
WHERE page_slug = 'nosotros'
  AND section_key IN ('origin', 'discipline', 'pivot', 'promise', 'values', 'cta-blog');

-- 2. CREAR SECCIONES FAQ EDITABLES DESDE EL CMS
-- Categoría: Pedidos y Envíos
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, sort_order, active, metadata)
VALUES (
  'faq', 'pedidos', 'Pedidos y Envíos', 'Pedidos y Envíos', '',  1, true,
  '{"items":[{"q":"¿Hacen domicilios en Bogotá?","a":"Sí, realizamos envíos en Bogotá a través de nuestras sedes de Quirinal y Sprint Norte. El valor del domicilio se calcula según la distancia."},{"q":"¿Cuál es el tiempo de entrega?","a":"Los pedidos regulares se entregan en 1 a 2 horas dentro de nuestra zona de cobertura. Para pedidos institucionales, coordinamos con anticipación."},{"q":"¿Puedo hacer pedidos por anticipado?","a":"Para pedidos grandes te recomendamos hacerlo con al menos 24 horas de anticipación para garantizar disponibilidad y frescura."},{"q":"¿Cuáles son los medios de pago?","a":"Aceptamos efectivo, tarjeta débito/crédito, Nequi, Daviplata y transferencia bancaria."}]}'
) ON CONFLICT DO NOTHING;

-- Categoría: Productos
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, sort_order, active, metadata)
VALUES (
  'faq', 'productos', 'Productos', 'Productos', '', 2, true,
  '{"items":[{"q":"¿Los productos son frescos?","a":"Todo se prepara diariamente con ingredientes frescos. No usamos conservantes, colorantes artificiales ni productos pre-fabricados."},{"q":"¿Tienen opciones vegetarianas?","a":"Sí, ofrecemos almojábanas, pan de bono, pan de yuca y jugos naturales aptos para vegetarianos."},{"q":"¿Cuál es el producto más vendido?","a":"Nuestro legendario Pastel de Pollo es el favorito. Más de 40 años perfeccionando la receta."},{"q":"¿Manejan productos sin gluten?","a":"El pan de bono (hecho con almidón de yuca) es naturalmente libre de gluten. Consulta para más opciones."}]}'
) ON CONFLICT DO NOTHING;

-- Categoría: Servicio Institucional
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, sort_order, active, metadata)
VALUES (
  'faq', 'institucional', 'Servicio Institucional', 'Servicio Institucional', '', 3, true,
  '{"items":[{"q":"¿Cuál es el pedido mínimo para empresas?","a":"No hay pedido mínimo, pero los mejores precios se obtienen a partir de 20 unidades por producto."},{"q":"¿Ofrecen desayunos corporativos?","a":"Sí, armamos combos de desayuno que incluyen pasteles, bebidas calientes y jugos."},{"q":"¿Hacen catering para eventos?","a":"Ofrecemos catering para eventos empresariales, reuniones y celebraciones."}]}'
) ON CONFLICT DO NOTHING;

-- Categoría: Sedes y Horarios
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, sort_order, active, metadata)
VALUES (
  'faq', 'sedes_horarios', 'Sedes y Horarios', 'Sedes y Horarios', '', 4, true,
  '{"items":[{"q":"¿Cuáles son los horarios?","a":"Lunes a sábado de 6:00 AM a 8:00 PM. Domingos y festivos de 7:00 AM a 3:00 PM."},{"q":"¿Puedo visitar sin reservar?","a":"Sí, nuestras sedes están abiertas al público sin necesidad de reserva."},{"q":"¿Tienen parqueadero?","a":"Sede Quirinal cuenta con parqueadero. En Sprint Norte hay zonas de parqueo público cercanas."},{"q":"¿Van a abrir más sedes?","a":"Estamos evaluando opciones de expansión en Bogotá. ¡Síguenos en redes!"}]}'
) ON CONFLICT DO NOTHING;

-- 3. FORZAR ROL ADMIN PARA EL USUARIO
DO $$
DECLARE
    u_id UUID;
BEGIN
    SELECT id INTO u_id FROM auth.users WHERE email = 'sebastian689@gmail.com';
    IF u_id IS NOT NULL THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (u_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;
