import { useParams, Link } from 'react-router-dom';
import { SafeImage } from '@/components/ThumbImage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ArrowLeft, Minus, Plus, ShoppingCart, MessageCircle, MapPin, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useProduct, useProducts } from '@/hooks/useProducts';
import { MAX_QTY, useCartStore } from '@/store/cartStore';
import { DEFAULT_WHATSAPP, useSedes } from '@/hooks/useSedes';
import { categories } from '@/data/products';
import { buildWaUrl, openWhatsApp } from '@/lib/whatsapp';
import { isUuid } from '@/lib/checkoutValidation';
import ProductCard from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { FadeInWhenVisible, StaggerContainer, StaggerItem } from '@/components/ScrollAnimations';
import { toast } from 'sonner';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const NotFound = () => (
  <section className="w-full bg-section-warm py-20 text-center">
    <div className="max-w-[1440px] mx-auto px-6">
      <h1 className="font-display text-2xl mb-4">Producto no encontrado</h1>
      <Link to="/menu" className="text-primary hover:underline">Volver al menú</Link>
    </div>
  </section>
);

const ProductDetail = () => {
  const { id } = useParams();
  // Un id que no es uuid nunca existirá en la DB: no consultamos (evita el error 22P02 de Postgres).
  const validId = isUuid(id);
  const { data: product, isLoading } = useProduct(validId ? id : undefined);
  usePageTitle(product?.name || 'Producto');
  const { data: allProducts = [] } = useProducts();
  const [qty, setQty] = useState(1);
  const addItem = useCartStore((s) => s.addItem);
  const setCartOpen = useCartStore((s) => s.setCartOpen);
  const { tiendas } = useSedes();

  // Al navegar entre productos (relacionados) la cantidad vuelve a 1.
  useEffect(() => {
    setQty(1);
  }, [id]);

  if (!validId) return <NotFound />;

  if (isLoading) {
    return (
      <section className="w-full bg-section-warm py-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <Skeleton className="h-5 w-32 mb-8" />
          <div className="grid md:grid-cols-2 gap-12">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!product) return <NotFound />;

  const related = allProducts.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 3);
  const categoryLabel = categories.find((c) => c.id === product.category)?.label ?? product.category;
  const lineTotal = product.price * qty;

  const handleAddToCart = () => {
    addItem(product, qty);
    toast.success(`${qty}x ${product.name} añadido al carrito`);
    setCartOpen(true);
  };

  const handleWhatsAppOrder = () => {
    const msg = `*Pedido Delicias Colombianas*\n\n- ${qty}x ${product.name} - ${formatPrice(lineTotal)}\n\n*Total: ${formatPrice(lineTotal)}*`;
    const url = buildWaUrl(tiendas[0]?.whatsapp || DEFAULT_WHATSAPP, msg);
    // Apertura síncrona dentro del clic: si aun así se bloquea, ofrecemos reintentar desde el toast.
    if (!openWhatsApp(url)) {
      toast.error('No se pudo abrir WhatsApp.', {
        action: { label: 'Abrir', onClick: () => window.open(url, '_blank', 'noopener') },
      });
    }
  };

  return (
    <>
      <section className="w-full bg-section-warm py-10">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
          <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Volver al menú
          </Link>

          <div className="grid md:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl overflow-hidden shadow-elevated sticky top-24"
            >
              <SafeImage src={product.image} alt={product.name} className="w-full aspect-square object-cover" priority />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{categoryLabel}</span>
                {product.requiresAdvanceNotice && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-xs font-bold uppercase tracking-wider">
                    <AlertTriangle className="w-3.5 h-3.5" /> Se pide con 24h de anticipación
                  </span>
                )}
              </div>
              <h1 className="font-display text-4xl md:text-5xl mt-3">{product.name}</h1>
              <p className="font-display text-3xl text-primary font-bold mt-4">{formatPrice(product.price)}</p>
              <div className="w-16 h-0.5 bg-gradient-gold rounded-full mt-6" />
              <p className="text-muted-foreground leading-relaxed mt-6 text-lg">{product.longDescription || product.description}</p>

              <div className="flex items-center gap-4 mt-10">
                <div className="flex items-center border rounded-xl overflow-hidden" role="group" aria-label="Cantidad">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    aria-label="Disminuir cantidad"
                    className="p-3.5 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-14 text-center font-semibold" aria-live="polite">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
                    disabled={qty >= MAX_QTY}
                    aria-label="Aumentar cantidad"
                    className="p-3.5 hover:bg-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleAddToCart}
                  className="flex-1 inline-flex items-center justify-center gap-2.5 py-4 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:shadow-elevated transition-all duration-300"
                >
                  <ShoppingCart className="w-5 h-5" /> Añadir al Carrito
                </motion.button>
              </div>

              {/* WhatsApp quick order */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleWhatsAppOrder}
                className="mt-3 w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <MessageCircle className="w-4 h-4" /> Pedir por WhatsApp
              </motion.button>

              {/* Sede phones - dynamic */}
              {tiendas.some((s) => s.phone) && (
                <div className="mt-6 p-4 bg-background rounded-xl space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">Llámanos para pedidos</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {tiendas.filter((s) => s.phone).map((s) => (
                      <a
                        key={s.id}
                        href={`tel:${s.phone?.replace(/\s/g, '') ?? ''}`}
                        className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                      >
                        <MapPin className="w-4 h-4 text-primary" /> {s.name.replace('Sede ', '')}: <span className="font-bold">{s.phone}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="w-full py-20 bg-background">
          <div className="max-w-[1440px] mx-auto px-6 lg:px-10">
            <FadeInWhenVisible>
              <h2 className="font-display text-3xl mb-8">También te puede gustar</h2>
            </FadeInWhenVisible>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-8">
              {related.map((p) => (
                <StaggerItem key={p.id}>
                  <ProductCard product={p} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          </div>
        </section>
      )}
    </>
  );
};

export default ProductDetail;
