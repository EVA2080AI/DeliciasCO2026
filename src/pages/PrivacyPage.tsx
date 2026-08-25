import { usePageTitle } from '@/hooks/usePageTitle';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useSedes } from '@/hooks/useSedes';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012 y Decreto 1377 de 2013).
 * El texto por defecto vive aquí; el dueño puede sobreescribir título/contenido desde el CMS
 * creando secciones en page_slug = 'privacidad' (section_key 'hero' y 'contenido').
 * En 'contenido', cada párrafo separado por una línea en blanco; un párrafo que empiece con "## "
 * se muestra como subtítulo.
 */
const LAST_UPDATE = '25 de agosto de 2026';

const defaultBody = (brand: string, email: string, phone: string) => `
## 1. Responsable del tratamiento
${brand} (en adelante, "la Empresa"), con establecimientos en Bogotá D.C., es responsable del tratamiento de los datos personales que usted suministra a través de este sitio web. Contacto: ${email}${phone ? ` · ${phone}` : ''}.

## 2. Datos que recolectamos
Al hacer un pedido o solicitar una cotización recolectamos únicamente los datos necesarios para atenderlo: nombre, teléfono, correo electrónico (opcional), dirección de entrega (cuando aplica), razón social y NIT (en pedidos empresariales) y el detalle del pedido.

## 3. Finalidad
Usamos sus datos para: procesar y entregar su pedido o cotización; contactarlo por WhatsApp, teléfono o correo para confirmar detalles; emitir la factura cuando corresponda; y, solo si usted lo autoriza expresamente, enviarle promociones. No vendemos ni cedemos sus datos a terceros con fines comerciales.

## 4. Encargados y proveedores
Para operar el sitio usamos proveedores tecnológicos que actúan como encargados del tratamiento (alojamiento web, base de datos y mensajería). Estos proveedores tratan los datos bajo nuestras instrucciones y con medidas de seguridad adecuadas.

## 5. Sus derechos
De acuerdo con la Ley 1581 de 2012, usted puede conocer, actualizar, rectificar y suprimir sus datos, solicitar prueba de la autorización otorgada, ser informado sobre el uso que se les ha dado, presentar quejas ante la Superintendencia de Industria y Comercio y revocar la autorización. Para ejercerlos escríbanos a ${email}; responderemos en los términos legales (10 días hábiles para consultas y 15 para reclamos).

## 6. Conservación y seguridad
Conservamos los datos de pedidos y cotizaciones durante el tiempo necesario para atender el servicio y cumplir obligaciones legales, tributarias y contables. Aplicamos medidas técnicas y administrativas razonables para protegerlos contra acceso no autorizado, pérdida o alteración.

## 7. Cookies y almacenamiento local
El sitio usa almacenamiento local del navegador para recordar su carrito y su preferencia de tema (claro/oscuro). No usamos cookies de rastreo publicitario.

## 8. Cambios a esta política
Podemos actualizar esta política; la versión vigente estará siempre publicada en esta página con su fecha de última actualización.
`.trim();

const renderBody = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, i) =>
      block.startsWith('## ') ? (
        <h2 key={i} className="font-display text-xl md:text-2xl text-foreground mt-10 mb-3">
          {block.slice(3)}
        </h2>
      ) : (
        <p key={i} className="text-muted-foreground leading-relaxed mb-4">
          {block}
        </p>
      ),
    );

const PrivacyPage = () => {
  usePageTitle('Política de tratamiento de datos');
  const { sections: s } = usePageSectionsMap('privacidad');
  const { settings } = useSiteSettingsMap();
  const { sedes } = useSedes();

  const brand = settings.brand_name || 'DC Delicias Colombianas';
  const email = settings.contact_email || sedes[0]?.email || 'contacto@deliciascolombianas.com';
  const phone = sedes[0]?.phone || '';
  const title = s.hero?.title || 'Política de tratamiento de datos personales';
  const subtitle = s.hero?.subtitle || `Última actualización: ${LAST_UPDATE}`;
  const body = s.contenido?.content?.trim() ? s.contenido.content : defaultBody(brand, email, phone);

  return (
    <>
      <section className="w-full bg-section-warm">
        <div className="max-w-[900px] mx-auto px-6 lg:px-10 py-16 md:py-20 text-center">
          <FadeInWhenVisible>
            <h1 className="font-display text-3xl md:text-5xl text-foreground mb-4">{title}</h1>
            <p className="text-muted-foreground">{subtitle}</p>
          </FadeInWhenVisible>
        </div>
      </section>
      <section className="w-full bg-background">
        <article className="max-w-[900px] mx-auto px-6 lg:px-10 py-12 md:py-16">{renderBody(body)}</article>
      </section>
    </>
  );
};

export default PrivacyPage;
