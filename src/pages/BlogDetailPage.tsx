import { useParams, Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft, Calendar, Clock, ChefHat } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { Skeleton } from '@/components/ui/skeleton';
import heroImg from '@/assets/images/hero-pastel.jpg';

interface BlogArticle {
  slug: string;
  title: string;
  category: string;
  date: string;
  readTime: string;
  image: string;
  metaDescription: string;
  content: string[];
}

const articles: Record<string, BlogArticle> = {
  'origen-conflicto-armado-familia-pastelera': {
    slug: 'origen-conflicto-armado-familia-pastelera',
    title: 'Huyendo del conflicto armado: cómo nació Delicias Colombianas',
    category: 'Historia',
    date: '2026-03-01',
    readTime: '8 min',
    image: heroImg,
    metaDescription: 'La historia real de la familia fundadora de Delicias Colombianas que huyó del conflicto armado en Boyacá y encontró en Bogotá su destino como pasteleros.',
    content: [
      'En los años 70, la familia Rodríguez vivía en una pequeña finca en las montañas de Boyacá. Don José cultivaba papa y cebolla, mientras doña Carmen, su esposa, preparaba arepas, almojábanas y pasteles para los vecinos de la vereda. La vida era sencilla pero tranquila.',
      'Todo cambió cuando el conflicto armado colombiano llegó a su región. Los grupos armados que operaban en la zona empezaron a extorsionar a los campesinos, exigiéndoles "vacunas" que la familia no podía pagar. Las amenazas se volvieron cada vez más directas.',
      'En 1982, después de que quemaran la finca de su vecino, don José tomó la decisión más difícil de su vida: dejar todo atrás. Con doña Carmen, sus tres hijos pequeños y apenas dos maletas, tomaron un bus hacia Bogotá. No sabían qué les esperaba.',
      'Llegaron al barrio Quirinal, donde un paisano boyacense les ofreció una habitación. Los primeros meses fueron los más duros: don José trabajaba en construcción, mientras doña Carmen cuidaba niños del vecindario. Pero cada noche, Carmen soñaba con su cocina en Boyacá.',
      'Un domingo de 1985, con los últimos ahorros, doña Carmen compró harina, pollo y mantequilla. Horneó 20 pasteles de pollo con la receta que su madre le había enseñado en la vereda. Los empacó en una canasta y salió a venderlos en la cuadra.',
      'Se agotaron en menos de una hora. Los vecinos no podían creer que un pastel tan delicioso viniera de una cocina casera. "Señora, ¿mañana trae más?" le preguntaron. Ese fue el primer día de Delicias Colombianas, aunque todavía no tenía nombre.',
      'Poco a poco, el negocio creció. De 20 pasteles pasaron a 50, luego a 100. La fama del pastel de pollo de doña Carmen se extendió por todo el barrio. Los clientes venían desde Cedritos, Usaquén y el norte de Bogotá solo para probar ese sabor que les recordaba al campo colombiano.',
      'En 1998, con el esfuerzo de toda la familia, inauguraron el primer local formal en el barrio Quirinal. Lo llamaron "Delicias Colombianas" porque doña Carmen siempre decía: "Esto no es solo un pastel, es toda la delicia de Colombia en un bocado".',
      'La segunda generación tomó la batuta en 2010, abriendo la sede de Sprint Norte sin cambiar ni un gramo de las recetas originales. Hoy, más de 40 años después, cada pastel que sale del horno lleva la memoria de aquella finca en Boyacá, la resiliencia de una familia desplazada y la certeza de que la tradición colombiana puede sobrevivir a todo.',
      'Delicias Colombianas no es solo una pastelería. Es la prueba de que las familias colombianas, incluso en las circunstancias más difíciles, pueden convertir el dolor en algo hermoso. Cada pastel de pollo es un homenaje a todos los campesinos que, como don José y doña Carmen, encontraron en la ciudad una nueva oportunidad para honrar sus raíces.',
    ],
  },
  'primer-pastel-pollo-1985': {
    slug: 'primer-pastel-pollo-1985',
    title: 'El primer pastel de pollo de 1985: así comenzó todo',
    category: 'Historia',
    date: '2026-01-05',
    readTime: '5 min',
    image: heroImg,
    metaDescription: 'La historia del primer pastel de pollo que doña Carmen horneó en 1985 en una cocina prestada del barrio Quirinal en Bogotá.',
    content: [
      'Era un domingo de mayo de 1985. Doña Carmen se levantó antes del amanecer en la pequeña habitación que compartía con su familia en el barrio Quirinal. Llevaba meses pensando en una forma de ayudar con los gastos del hogar, y esa mañana tomó la decisión.',
      'Con $5.000 pesos —todo lo que tenía ahorrado— fue al mercado de la Plaza de Las Flores. Compró un kilo de harina de trigo, medio kilo de mantequilla, dos pechugas de pollo, cebolla, tomate y las especias que conocía de memoria: comino, ajo en polvo y color.',
      'La cocina de la casa no tenía horno. Su vecina, doña Rosita, le prestó el suyo a cambio de un par de pasteles. Así, entre dos cocinas y un pasillo, doña Carmen preparó la primera tanda: 20 pasteles de pollo, cada uno armado a mano con la misma técnica que aprendió de su madre en Boyacá.',
      'La masa era el secreto. Doña Carmen la amasaba hasta que quedaba lisa como seda, sin una sola grieta. La estiraba con un rodillo de palo que don José le había tallado, y cortaba círculos perfectos con el borde de un plato de loza.',
      'El relleno llevaba pollo desmechado fino, cocinado lento con hogao casero. Nada de atajos ni condimentos artificiales. "Si le metes cariño, la gente lo siente", decía siempre.',
      'A las 9 de la mañana, los 20 pasteles estaban listos. Dorados, crujientes, con ese aroma que se colaba por las ventanas de toda la cuadra. Los puso en una canasta forrada con un mantel de cuadros y salió a tocar puertas.',
      'No llegó a la tercera cuadra. Se agotaron todos. Los vecinos se quedaron pidiendo más, y doña Carmen supo en ese instante que había encontrado su camino. Esos primeros 20 pasteles son los ancestros directos de los miles que horneamos cada semana en nuestras dos sedes.',
    ],
  },
  'receta-pastel-pollo-colombiano': {
    slug: 'receta-pastel-pollo-colombiano',
    title: 'Receta del pastel de pollo colombiano: guía paso a paso',
    category: 'Recetas',
    date: '2026-02-10',
    readTime: '7 min',
    image: heroImg,
    metaDescription: 'Aprende a preparar el auténtico pastel de pollo colombiano con nuestra guía completa. Receta tradicional con masa hojaldrada y relleno de pollo desmechado.',
    content: [
      'El pastel de pollo colombiano es una de las joyas de la gastronomía nacional. Crujiente por fuera, jugoso por dentro, es el acompañante perfecto del desayuno, la media mañana o la once. Aquí te compartimos la receta que ha hecho famosa a Delicias Colombianas.',
      'INGREDIENTES PARA LA MASA: 500 g de harina de trigo todo uso, 200 g de mantequilla fría cortada en cubitos, 1 huevo, 1 cucharadita de sal, 100 ml de agua helada. El secreto está en que la mantequilla esté muy fría para lograr esas capas hojaldradas.',
      'INGREDIENTES PARA EL RELLENO: 500 g de pechuga de pollo, 1 cebolla cabezona grande picada finamente, 2 tomates maduros rallados, 3 dientes de ajo picados, 1 cucharadita de comino molido, sal y pimienta al gusto, 2 cucharadas de aceite vegetal, 1 papa criolla cocida y picada (opcional).',
      'PASO 1 — LA MASA: En un bowl grande, mezcla la harina con la sal. Agrega la mantequilla fría y trabaja con las yemas de los dedos hasta obtener una textura arenosa. Añade el huevo y el agua helada poco a poco. Amasa lo justo para que se integre —no sobretrabajar. Envuelve en plástico y refrigera mínimo 30 minutos.',
      'PASO 2 — EL RELLENO: Cocina las pechugas en agua con sal, cebolla y ajo por 25 minutos. Desmenúzalas finamente. En una sartén, prepara el hogao: sofríe la cebolla hasta que esté transparente, agrega el tomate rallado, el ajo, el comino y cocina a fuego medio 10 minutos. Incorpora el pollo desmechado y la papa criolla si la usas. Rectifica sal. Deja enfriar completamente.',
      'PASO 3 — EL ARMADO: Estira la masa sobre una superficie enharinada con un grosor de 3mm. Corta círculos de unos 12cm de diámetro. Coloca una cucharada generosa de relleno en el centro, dobla por la mitad y sella los bordes presionando con un tenedor. Este paso es clave: un mal sellado hace que se abra en el horno.',
      'PASO 4 — EL HORNEADO: Precalienta el horno a 200°C. Coloca los pasteles en una bandeja engrasada o con papel pergamino. Pincélalos con huevo batido para lograr el dorado. Hornea 25-30 minutos hasta que estén dorados y crujientes. Deja reposar 5 minutos antes de servir.',
      'TIPS DE DOÑA CARMEN: Nunca uses pollo congelado, la diferencia de sabor es abismal. La masa no debe quedar elástica sino quebradiza —eso indica que la mantequilla está haciendo su trabajo. Y el relleno siempre debe estar frío antes de armar, para que la masa no se humedezca.',
      'En Delicias Colombianas horneamos más de 500 pasteles de pollo cada día siguiendo esta misma receta. Si quieres probar el original sin cocinar, visítanos en nuestras sedes de Quirinal y Sprint Norte en Bogotá.',
    ],
  },
  'historia-pasteleria-colombiana': {
    slug: 'historia-pasteleria-colombiana',
    title: 'Historia de la pastelería colombiana: de la colonia al siglo XXI',
    category: 'Historia',
    date: '2025-12-20',
    readTime: '6 min',
    image: heroImg,
    metaDescription: 'Un recorrido histórico por la evolución de la pastelería y panadería en Colombia, desde las influencias coloniales españolas hasta la fusión gastronómica moderna.',
    content: [
      'La historia de la pastelería colombiana es un fascinante cruce de culturas. Cuando los españoles llegaron al territorio en el siglo XVI, trajeron consigo el trigo, la mantequilla y las técnicas de horneado europeas. Estos ingredientes se fusionaron con los productos autóctonos —maíz, yuca, queso fresco— para crear una tradición pastelera única.',
      'Durante la colonia, las monjas de los conventos fueron las grandes innovadoras. En claustros de Bogotá, Tunja y Popayán nacieron recetas como las almojábanas (del árabe al-muyabbana), los buñuelos de queso y los panderos. Muchas de estas recetas se mantienen casi idénticas 400 años después.',
      'El siglo XIX trajo la influencia francesa a las élites bogotanas. Panaderías como la Florida y la Puerta del Sol introducían croissants y brioche, pero el pueblo seguía fiel a sus empanadas, pandebonos y pasteles. La pastelería popular colombiana siempre ha sido democrática: accesible, sabrosa y hecha para compartir.',
      'El pastel de pollo, como lo conocemos hoy, se consolidó en el siglo XX como el rey indiscutido de la panadería bogotana. Cada barrio tenía su versión, pero todas compartían la misma esencia: masa hojaldrada, relleno de pollo con hogao y el aroma inconfundible del comino colombiano.',
      'En la segunda mitad del siglo XX, las panaderías de barrio se convirtieron en centros de la vida social colombiana. Era el lugar donde se compraba el pan para el desayuno, se tomaba el tinto de la mañana y se conversaba con los vecinos. Delicias Colombianas nació en esta tradición en 1985.',
      'Hoy, la pastelería colombiana vive un renacimiento. Nuevas generaciones de panaderos honran las recetas tradicionales mientras experimentan con técnicas modernas. En Delicias Colombianas creemos que la innovación debe sumar, nunca reemplazar: nuestras recetas son las mismas de hace 40 años, porque la perfección no necesita cambio.',
    ],
  },
  'pastel-pollo-eventos-bogota': {
    slug: 'pastel-pollo-eventos-bogota',
    title: 'Pastel de pollo para eventos en Bogotá: guía completa',
    category: 'Tips',
    date: '2026-02-28',
    readTime: '4 min',
    image: heroImg,
    metaDescription: 'Guía completa para pedir pasteles de pollo artesanales para eventos corporativos, fiestas y reuniones en Bogotá. Precios, cantidades y consejos.',
    content: [
      'Si estás organizando un evento en Bogotá —ya sea un desayuno corporativo, una fiesta de cumpleaños o una reunión familiar— el pastel de pollo artesanal es siempre una apuesta segura. Es el bocado más querido por los colombianos y nunca falla.',
      'CANTIDADES RECOMENDADAS: Para desayunos, calcula 2 pasteles por persona. Para eventos tipo brunch o buffet, 1.5 pasteles por persona es suficiente. Para fiestas con otros platos, 1 pastel por persona. En Delicias Colombianas manejamos pedidos desde 50 unidades con precio especial.',
      'TIEMPO DE PEDIDO: Para eventos pequeños (menos de 100 pasteles), 24 horas de anticipación es suficiente. Para pedidos grandes o catering completo, recomendamos 48-72 horas. Esto nos permite hornear todo fresco el mismo día del evento.',
      'TRANSPORTE Y CONSERVACIÓN: Los pasteles se entregan en cajas especiales que mantienen la temperatura. Idealmente deben consumirse dentro de las 4 horas posteriores al horneado para disfrutar la textura crujiente. Si necesitas recalentar, 5 minutos en horno a 180°C los devuelve a la vida.',
      'COMPLEMENTOS PERFECTOS: Nuestros pasteles de pollo combinan perfecto con café colombiano de origen, jugo de naranja natural o agua de panela. También ofrecemos paquetes completos de catering que incluyen empanadas, almojábanas y pan de bono.',
      'Para cotizar tu evento, visita nuestra sección de Empresas o escríbenos directamente por WhatsApp. En Delicias Colombianas hacemos que tu evento sepa a Colombia.',
    ],
  },
  'mejores-pastelerias-bogota': {
    slug: 'mejores-pastelerias-bogota',
    title: 'Las mejores pastelerías de Bogotá en 2026',
    category: 'Tips',
    date: '2026-01-15',
    readTime: '5 min',
    image: heroImg,
    metaDescription: 'Descubre las mejores pastelerías y panaderías artesanales de Bogotá en 2026. Guía con recomendaciones de locales tradicionales y modernos.',
    content: [
      'Bogotá es una ciudad de panaderos. Desde las panaderías de barrio con sus vitrinas repletas de mogollas y pandeyucas, hasta los nuevos conceptos artesanales, la oferta es inmensa. Aquí te compartimos nuestra selección de las pastelerías que vale la pena conocer.',
      'En el norte de Bogotá, el corredor gastronómico entre Cedritos y Usaquén concentra algunas de las mejores opciones. Panaderías artesanales que honran la tradición bogotana mientras ofrecen espacios acogedores para desayunar o tomar el algo.',
      'Delicias Colombianas, con sedes en Quirinal y Sprint Norte, se ha mantenido como referente del pastel de pollo artesanal desde 1985. La clave de su permanencia es simple: recetas intocables y frescura diaria. No hay atajos.',
      'La zona de Chapinero también ofrece opciones interesantes, especialmente para quienes buscan panaderías con influencia europea pero sabor local. El pan de masa madre con queso campesino es una tendencia que ha conquistado a los bogotanos.',
      'En el centro histórico, las panaderías tradicionales de La Candelaria mantienen vivas recetas centenarias: colaciones, merengones y almojábanas que saben igual que hace 100 años.',
      'Nuestro consejo: la mejor pastelería no es la más moderna ni la más cara. Es la que hornea fresco cada día, usa ingredientes de verdad y tiene una historia que contar. Eso es lo que hace grande a la panadería colombiana.',
    ],
  },
  'historia-delicias-colombianas': {
    slug: 'historia-delicias-colombianas',
    title: 'De una cocina familiar a referente bogotano: nuestra historia desde 1985',
    category: 'Historia',
    date: '2025-12-15',
    readTime: '5 min',
    image: heroImg,
    metaDescription: 'La historia completa de Delicias Colombianas, desde una cocina familiar en el barrio Quirinal hasta convertirse en referente de la pastelería bogotana.',
    content: [
      'En 1985, en una pequeña cocina del barrio Quirinal en Bogotá, doña Carmen preparaba pasteles de pollo para sus vecinos. Lo que comenzó como un gesto de generosidad familiar se transformó rápidamente en el negocio que hoy conocemos como Delicias Colombianas.',
      'La receta del pastel de pollo —crujiente por fuera, jugoso por dentro— fue perfeccionada durante años. Cada mañana, doña Carmen se levantaba a las 4 de la madrugada para preparar la masa artesanal, seleccionar el pollo más fresco del mercado y sazonar con las especias que su madre le había enseñado.',
      'Con el tiempo, la fama del pastel de pollo creció más allá del barrio. Clientes llegaban desde otros puntos de la ciudad solo para probar ese sabor inconfundible. Fue así como en 1998 se inauguró la primera sede formal en el Quirinal, y en 2010 abrió Sprint Norte.',
      'Hoy, más de 40 años después, Delicias Colombianas mantiene el mismo compromiso: ingredientes frescos, preparación diaria y recetas de generación en generación. Cada producto que sale de nuestro horno lleva la esencia de aquella primera cocina familiar.',
      'Nuestro equipo de panaderos y pasteleros trabaja con la misma pasión que doña Carmen, asegurando que cada cliente reciba un producto hecho con amor y tradición auténtica colombiana.',
    ],
  },
  'secreto-pastel-pollo': {
    slug: 'secreto-pastel-pollo',
    title: 'El secreto detrás de nuestro Pastel de Pollo: receta y tradición',
    category: 'Recetas',
    date: '2026-01-20',
    readTime: '4 min',
    image: heroImg,
    metaDescription: 'Descubre el secreto del mejor pastel de pollo de Colombia. Masa artesanal, relleno jugoso y horneado perfecto en Delicias Colombianas.',
    content: [
      'Nuestro pastel de pollo no es un pastel cualquiera. Es el resultado de más de 40 años de perfeccionamiento de una receta familiar que combina técnica artesanal con ingredientes de la más alta calidad.',
      'Todo empieza con la masa: harina de trigo seleccionada, mantequilla fresca y un toque de sal marina. Se amasa a mano hasta conseguir esa textura elástica perfecta que, al hornear, se transforma en capas doradas y crujientes.',
      'El relleno es donde está la magia. Pollo desmechado fresco —nunca congelado— se cocina lentamente con un sofrito de cebolla cabezona, tomate, ajo, comino y una pizca de color. El resultado es un relleno jugoso que se derrite en la boca.',
      'El horneado es el paso final y quizá el más importante. A temperatura controlada, cada pastel se dora hasta alcanzar ese color ámbar perfecto que indica que está listo. Ni un minuto más, ni un minuto menos.',
      'El secreto verdadero no es un ingrediente específico: es la dedicación diaria, la frescura de cada componente y el respeto por una tradición que nos define como colombianos.',
    ],
  },
  'empanada-colombiana-perfecta': {
    slug: 'empanada-colombiana-perfecta',
    title: 'Cómo hacer la empanada colombiana perfecta en casa',
    category: 'Recetas',
    date: '2025-10-08',
    readTime: '6 min',
    image: heroImg,
    metaDescription: 'Receta completa para preparar la empanada colombiana perfecta en casa. Masa de maíz, relleno tradicional y técnica de fritura.',
    content: [
      'La empanada colombiana es mucho más que una fritura. Es un símbolo de nuestra cultura gastronómica, presente en cada esquina, cada fiesta y cada reunión familiar.',
      'La masa se hace con harina de maíz precocida, agua tibia y una pizca de sal. El truco está en dejar reposar la masa al menos 15 minutos para que hidrate bien.',
      'Para el relleno clásico, cocina carne molida con papa criolla cortada en cubitos pequeños. Sazona con hogao, comino, ajo y cilantro picado. Deja enfriar completamente antes de rellenar.',
      'El armado requiere paciencia: estira una bola de masa sobre plástico, coloca el relleno en una mitad y cierra presionando los bordes con un tenedor.',
      'Fríe en aceite bien caliente (180°C) hasta que estén doradas y crujientes. Escurre sobre papel absorbente y sirve con ají casero de cilantro.',
    ],
  },
  'almojabana-tradicion': {
    slug: 'almojabana-tradicion',
    title: 'Almojábana: la joya escondida de la panadería colombiana',
    category: 'Historia',
    date: '2025-09-12',
    readTime: '3 min',
    image: heroImg,
    metaDescription: 'Historia y tradición de la almojábana colombiana, desde sus raíces árabes en la colonia hasta su preparación artesanal moderna.',
    content: [
      'La almojábana tiene raíces que se remontan a la época colonial, cuando los españoles fusionaron técnicas europeas con ingredientes autóctonos.',
      'Su nombre viene del árabe "al-muyabbana", que significa "hecho con queso". Esta herencia lingüística nos recuerda las múltiples influencias culturales que dan forma a nuestra gastronomía.',
      'En Delicias Colombianas la preparamos con queso campesino fresco, cuajada, harina de maíz y un toque de mantequilla. Cada almojábana se hornea hasta que el exterior queda ligeramente dorado y el interior mantiene esa textura esponjosa.',
    ],
  },
  'cafe-colombiano-preparacion': {
    slug: 'cafe-colombiano-preparacion',
    title: '5 formas de preparar café colombiano como un experto',
    category: 'Tips',
    date: '2025-08-25',
    readTime: '4 min',
    image: heroImg,
    metaDescription: 'Aprende 5 métodos para preparar café colombiano como un experto: tinto, prensa francesa, pour-over, espresso y cold brew.',
    content: [
      'Colombia produce uno de los mejores cafés del mundo, y prepararlo correctamente es todo un arte.',
      '1. Tinto tradicional: Hierve agua, retira del fuego, agrega café molido medio, deja reposar 4 minutos y cuela con media de tela.',
      '2. Prensa francesa: Usa café molido grueso, agua a 93°C y deja infusionar 4 minutos.',
      '3. Pour-over (V60): Moja el filtro, agrega café molido medio-fino y vierte agua en círculos lentos.',
      '4. Espresso: Con una buena máquina y granos recién molidos finos, extrae 25-30 ml en 25-30 segundos.',
      '5. Cold brew: Mezcla café molido grueso con agua fría en proporción 1:8. Refrigera 12-24 horas y filtra.',
    ],
  },
  'pan-de-bono-historia': {
    slug: 'pan-de-bono-historia',
    title: 'Pan de Bono: del Valle del Cauca a tu mesa en Bogotá',
    category: 'Historia',
    date: '2025-07-30',
    readTime: '3 min',
    image: heroImg,
    metaDescription: 'Historia del pan de bono colombiano, desde su origen en el Valle del Cauca hasta su preparación artesanal en Delicias Colombianas.',
    content: [
      'El pan de bono es originario del Valle del Cauca, donde las familias lo preparan desde hace generaciones como acompañamiento del desayuno.',
      'La receta tradicional combina almidón de yuca agria, queso costeño rallado, cuajada y huevo. La magia está en el almidón de yuca.',
      'En Delicias Colombianas horneamos nuestros panes de bono cada mañana. Usamos queso costeño auténtico traído del Caribe colombiano.',
    ],
  },
};

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

const BlogDetailPage = () => {
  const { slug } = useParams();
  usePageTitle(slug ? slug.replace(/-/g, ' ') : 'Blog');

  // Try to load from DB
  const { data: dbPost, isLoading } = useQuery({
    queryKey: ['blog-post', slug],
    queryFn: async () => {
      if (!slug) return null;
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Fallback to hardcoded
  const hardcoded = slug ? articles[slug] : null;

  if (isLoading) {
    return (
      <div className="py-10">
        <div className="container max-w-3xl space-y-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="w-full aspect-[2/1] rounded-2xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </div>
    );
  }

  // If DB post found, render it
  if (dbPost) {
    const paragraphs = dbPost.content?.split('\n\n').filter(Boolean) || [];
    return (
      <div className="py-10">
        <div className="container max-w-3xl">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al blog
          </Link>
          <FadeInWhenVisible>
            {dbPost.image_url && (
              <div className="rounded-2xl overflow-hidden shadow-elevated mb-10">
                <img src={dbPost.image_url} alt={dbPost.title} className="w-full aspect-[2/1] object-cover" />
              </div>
            )}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent">
                {dbPost.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" /> {formatDate(dbPost.published_at || dbPost.created_at)}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" /> {dbPost.read_time}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl leading-tight mb-8">{dbPost.title}</h1>
            <div className="space-y-5">
              {paragraphs.map((p: string, i: number) => (
                <p key={i} className="text-muted-foreground text-lg leading-relaxed">{p}</p>
              ))}
            </div>
            <div className="mt-16 p-8 bg-section-cream rounded-2xl text-center">
              <ChefHat className="w-8 h-8 text-primary mx-auto mb-3" />
              <h3 className="font-display text-xl mb-2">¿Quieres probar nuestros productos?</h3>
              <p className="text-sm text-muted-foreground mb-5">Visítanos en nuestras sedes o haz tu pedido en línea.</p>
              <Link to="/menu" className="btn-primary">Ver Menú</Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </div>
    );
  }

  // Fallback to hardcoded article
  const article = hardcoded;

  if (!article) {
    return (
      <div className="container py-20 text-center">
        <h1 className="font-display text-2xl mb-4">Artículo no encontrado</h1>
        <Link to="/blog" className="text-accent hover:underline">Volver al blog</Link>
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="container max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" /> Volver al blog
        </Link>

        <FadeInWhenVisible>
          <div className="rounded-2xl overflow-hidden shadow-elevated mb-10">
            <img src={article.image} alt={article.title} className="w-full aspect-[2/1] object-cover" />
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-accent/10 text-accent">
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" /> {formatDate(article.date)}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="w-3.5 h-3.5" /> {article.readTime}</span>
          </div>

          <h1 className="font-display text-3xl md:text-5xl leading-tight mb-8">{article.title}</h1>

          <div className="space-y-5">
            {article.content.map((p, i) => (
              <p key={i} className="text-muted-foreground text-lg leading-relaxed">{p}</p>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 bg-section-cream rounded-2xl text-center">
            <ChefHat className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-display text-xl mb-2">¿Quieres probar nuestros productos?</h3>
            <p className="text-sm text-muted-foreground mb-5">Visítanos en nuestras sedes o haz tu pedido en línea.</p>
            <Link to="/menu" className="btn-primary">Ver Menú</Link>
          </div>

          {/* Related articles */}
          <div className="mt-16">
            <h3 className="font-display text-2xl mb-6">Artículos relacionados</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(articles)
                .filter((a) => a.slug !== article.slug && a.category === article.category)
                .slice(0, 2)
                .map((related) => (
                  <Link
                    key={related.slug}
                    to={`/blog/${related.slug}`}
                    className="group block p-6 rounded-2xl bg-section-cream hover:shadow-elevated transition-all"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">{related.category}</span>
                    <h4 className="font-display text-base mt-2 group-hover:text-primary transition-colors leading-snug line-clamp-2">{related.title}</h4>
                    <p className="text-xs text-muted-foreground mt-2">{related.readTime}</p>
                  </Link>
                ))}
            </div>
          </div>
        </FadeInWhenVisible>
      </div>
    </div>
  );
};

export default BlogDetailPage;
