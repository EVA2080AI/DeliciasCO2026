
-- Site settings: key-value store for global configuration
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text', -- text, image, color, json
  category text NOT NULL DEFAULT 'general', -- brand, contact, social, sedes, seo
  label text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Site settings viewable by everyone" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Page sections: content blocks per page
CREATE TABLE public.page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  section_key text NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  cta_text text DEFAULT '',
  cta_link text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(page_slug, section_key)
);

ALTER TABLE public.page_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Page sections viewable by everyone" ON public.page_sections
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage page sections" ON public.page_sections
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_page_sections_updated_at
  BEFORE UPDATE ON public.page_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed site_settings with defaults
INSERT INTO public.site_settings (key, value, type, category, label, sort_order) VALUES
  -- Brand
  ('brand_name', 'DC Delicias Colombianas', 'text', 'brand', 'Nombre de la marca', 1),
  ('brand_subtitle', 'Arbey Cabrera · Originales desde 1985', 'text', 'brand', 'Subtítulo del logo', 2),
  ('brand_logo', '', 'image', 'brand', 'Logo', 3),
  ('brand_color_primary', '14 72% 42%', 'color', 'brand', 'Color primario (terracotta)', 4),
  ('brand_color_secondary', '0 78% 52%', 'color', 'brand', 'Color secundario (rojo)', 5),
  ('brand_color_background', '40 20% 98%', 'color', 'brand', 'Color de fondo', 6),
  ('brand_color_foreground', '20 40% 8%', 'color', 'brand', 'Color de texto', 7),
  ('brand_font_display', 'Plus Jakarta Sans', 'text', 'brand', 'Tipografía títulos', 8),
  ('brand_font_body', 'Plus Jakarta Sans', 'text', 'brand', 'Tipografía cuerpo', 9),
  -- Contact
  ('contact_phone_1', '+57 315 892 4567', 'text', 'contact', 'Teléfono principal', 1),
  ('contact_phone_2', '+57 315 892 4568', 'text', 'contact', 'Teléfono secundario', 2),
  ('contact_whatsapp', '+573158924567', 'text', 'contact', 'WhatsApp', 3),
  ('contact_email', 'info@deliciascolombianas.com', 'text', 'contact', 'Email', 4),
  -- Social
  ('social_instagram', 'https://www.instagram.com/deliciascolombianas', 'text', 'social', 'Instagram', 1),
  ('social_facebook', 'https://www.facebook.com/deliciascolombianas', 'text', 'social', 'Facebook', 2),
  ('social_tiktok', '', 'text', 'social', 'TikTok', 3),
  -- Sedes (JSON)
  ('sedes', '[{"name":"Sede Quirinal","phone":"+57 315 892 4567","hours":"Lun-Sáb 6AM-8PM","address":"Calle 60 #56A-32"},{"name":"Sede Sprint Norte","phone":"+57 315 892 4568","hours":"Lun-Sáb 6AM-8PM","address":"Cra 7 #140-20"}]', 'json', 'sedes', 'Sedes', 1),
  -- SEO
  ('seo_title', 'Delicias Colombianas — Panadería Artesanal desde 1985', 'text', 'seo', 'Título SEO', 1),
  ('seo_description', 'Pasteles, empanadas y café artesanal en Bogotá. Más de 38 años de tradición colombiana.', 'text', 'seo', 'Descripción SEO', 2),
  ('seo_og_image', '', 'image', 'seo', 'Imagen OG', 3);

-- Seed page sections for Index page
INSERT INTO public.page_sections (page_slug, section_key, title, subtitle, content, active, sort_order) VALUES
  ('index', 'hero', 'El pastel de pollo más famoso de Bogotá', 'Desde 1985', 'Más de 38 años horneando con amor. Recetas artesanales transmitidas por tres generaciones de una familia colombiana.', true, 1),
  ('index', 'featured', 'Nuestros Favoritos', 'Lo Más Pedido', 'Los productos que nuestros clientes piden una y otra vez.', true, 2),
  ('index', 'categories', 'Explora Nuestro Menú', 'Categorías', 'Desde pasteles hojaldrados hasta café premium, tenemos algo para cada antojo.', true, 3),
  ('index', 'history', 'Una historia de resiliencia', 'Nuestra Historia', 'Nacimos del coraje de una familia que huyó del conflicto armado y encontró en Bogotá el lugar para convertir sus recetas en un legado.', true, 4),
  ('index', 'cta', '¿Antojo de algo delicioso?', '', 'Haz tu pedido en línea y recógelo en tu sede favorita.', true, 5),
  -- Nosotros page
  ('nosotros', 'hero', '¿Quién está detrás del pastel de pollo más famoso de Bogotá?', 'Nuestra Historia', 'Esta es la historia de Arbey Cabrera, un caqueteño que tras sufrir los golpes de la violencia rural, decidió irse a una ciudad desconocida.', true, 1),
  ('nosotros', 'origin', 'María Obdulia Zapata: el coraje de una madre', 'Un Comienzo Forjado en la Resiliencia', 'Nuestras raíces se hunden en la valentía de una madre cabeza de familia.', true, 2),
  ('nosotros', 'discipline', 'La disciplina de un emprendedor', 'Disciplina y Esfuerzo', 'Arbey Cabrera no es solo un panadero; es un ejemplo de tesón que comenzó a trabajar desde los 10 años.', true, 3),
  ('nosotros', 'pivot', 'De la ingeniería al corazón del hojaldre', 'El Giro Definitivo', 'Decidió volcar toda su disciplina y visión empresarial al gremio del pan.', true, 4),
  ('nosotros', 'promise', 'Ofrecerte lo MEJOR!', 'Nuestra Promesa', 'Hoy, bajo la marca Dagusto, continuamos con el legado de calidad y esfuerzo.', true, 5),
  ('nosotros', 'values', 'Lo que nos define', '', 'Los mismos valores que forjaron esta historia. Sin atajos, sin conservantes, sin prisa.', true, 6),
  ('nosotros', 'stats', '', '', '', true, 7),
  ('nosotros', 'cta-blog', 'Conoce más en nuestro blog', '', 'Recetas tradicionales, la historia de la pastelería colombiana y tips para disfrutar nuestros productos al máximo.', true, 8);
