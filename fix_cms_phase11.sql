-- FASE 11: Expansión de CMS para Institucional y Footer

-- 1. Secciones para la página Institucional (Empresas)
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, active, sort_order)
VALUES 
  ('institucional', 'hero', 'Cotización Corporativa', 'Servicio B2B', 'Arma tu paquete para eventos, desayunos corporativos o catering.', true, 1),
  ('institucional', 'step1', '1. Selecciona productos y cantidades', '', 'Elige los productos favoritos para tu evento corporativo.', true, 2),
  ('institucional', 'step2', '2. Datos de la empresa', '', 'Indícanos los datos de facturación y entrega para procesar tu solicitud.', true, 3)
ON CONFLICT (page_slug, section_key) 
DO UPDATE SET 
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  content = EXCLUDED.content;

-- 2. Configuraciones adicionales en site_settings para el Footer
INSERT INTO public.site_settings (key, value, type, category, label, sort_order)
VALUES
  ('footer_cta_title', '¿Antojo de algo delicioso?', 'text', 'brand', 'Título Banner Footer', 20),
  ('footer_cta_subtitle', 'Haz tu pedido en línea y recógelo en tu sede favorita', 'text', 'brand', 'Subtítulo Banner Footer', 21)
ON CONFLICT (key) 
DO UPDATE SET 
  value = EXCLUDED.value,
  label = EXCLUDED.label;
