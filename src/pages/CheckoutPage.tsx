import { useState } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useCartStore } from '@/store/cartStore';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, MapPin, Store, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSedes } from '@/hooks/useSedes';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DateInput from '@/components/DateInput';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

type DeliveryType = 'pickup' | 'delivery';

const CheckoutPage = () => {
  usePageTitle('Checkout');
  const { items, totalPrice, clearCart } = useCartStore();
  const navigate = useNavigate();
  const { tiendas } = useSedes();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [requestedDate, setRequestedDate] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [sedeId, setSedeId] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [address, setAddress] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  // Auto-select first sede when loaded
  const activeSede = sedeId || (tiendas.length > 0 ? tiendas[0].id : '');
  const selectedSede = tiendas.find((s) => s.id === activeSede);

  const requiresAdvanceNotice = items.some((i) => i.product.requiresAdvanceNotice);

  if (items.length === 0 && !orderSent) {
    return (
      <section className="w-full bg-section-warm py-24 text-center">
        <div className="max-w-[1440px] mx-auto px-6">
          <h1 className="font-display text-3xl mb-4">Tu carrito está vacío</h1>
          <Link to="/menu" className="text-primary hover:underline font-medium">Ir al menú</Link>
        </div>
      </section>
    );
  }

  if (orderSent) {
    return (
      <section className="w-full bg-section-warm py-24 text-center">
        <div className="max-w-lg mx-auto px-6">
          <FadeInWhenVisible>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="font-display text-3xl mb-3">¡Pedido enviado!</h1>
            <p className="text-muted-foreground mb-2">Tu pedido ha sido registrado y se abrió WhatsApp para confirmar con la sede.</p>
            <p className="text-sm text-muted-foreground mb-8">Te contactaremos pronto para confirmar tu pedido.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/menu" className="btn-primary">Seguir comprando</Link>
              <Link to="/" className="btn-outline">Ir al inicio</Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    );
  }

  const handleWhatsApp = async () => {
    if (!name.trim()) { toast.error('Ingresa tu nombre.'); return; }
    if (!phone.trim() || phone.trim().length < 7) { toast.error('Ingresa un teléfono válido.'); return; }
    if (deliveryType === 'pickup' && !pickupTime.trim()) { toast.error('Selecciona la hora de recogida.'); return; }
    if (deliveryType === 'delivery' && !address.trim()) { toast.error('Ingresa tu dirección de entrega.'); return; }

    setSubmitting(true);

    const sedeName = selectedSede?.name || activeSede;
    const deliveryInfo = deliveryType === 'pickup'
      ? `Recoge en: ${sedeName}\nHora: ${pickupTime}`
      : `Envío a: ${address.trim()}${addressDetail.trim() ? ` (${addressDetail.trim()})` : ''}${neighborhood.trim() ? ` — Barrio: ${neighborhood.trim()}` : ''}`;

    const { error } = await supabase.from('orders').insert({
      customer_name: name.trim(),
      customer_phone: phone.trim(),
      sede: deliveryType === 'pickup' ? activeSede : 'envio',
      notes: [
        `FECHA PEDIDO: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}`,
        requestedDate ? `FECHA DESEADA: ${requestedDate}` : '',
        company.trim() ? `EMPRESA: ${company.trim()}` : '',
        deliveryType === 'delivery' ? `ENVÍO: ${address.trim()} ${addressDetail.trim()} ${neighborhood.trim()}` : `RECOGE: ${activeSede} a las ${pickupTime}`,
        notes.trim(),
      ].filter(Boolean).join(' | ') || null,
      items: items.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
      total: totalPrice(),
    });

    if (error) { toast.error('Error al guardar el pedido. Intenta de nuevo.'); setSubmitting(false); return; }

    const orderText = items
      .map((i) => `- ${i.quantity}x ${i.product.name} - ${formatPrice(i.product.price * i.quantity)}`)
      .join('\n');
    const orderDate = format(new Date(), "EEEE d 'de' MMMM, h:mm a", { locale: es });
    const msg = [
      `*Pedido Delicias Colombianas - Arbey Cabrera*`,
      `- Fecha pedido: ${orderDate}`,
      requestedDate ? `- Fecha deseada: ${requestedDate}` : '',
      '',
      `- Cliente: ${name.trim()}`,
      `- Tel: ${phone.trim()}`,
      company.trim() ? `- Empresa: ${company.trim()}` : '',
      `- ${deliveryInfo}`,
      notes.trim() ? `- Notas: ${notes.trim()}` : '',
      '',
      `*Detalle:*`,
      orderText,
      '',
      `*Total: ${formatPrice(totalPrice())}*`,
    ].filter(s => s !== undefined && s !== null && (typeof s === 'string' ? s !== '' : true)).join('\n');

    const whatsappNum = deliveryType === 'pickup' && selectedSede ? selectedSede.whatsapp : (tiendas[0]?.whatsapp || '');
    window.open(`https://wa.me/${whatsappNum}?text=${encodeURIComponent(msg)}`, '_blank');
    clearCart();
    setSubmitting(false);
    setOrderSent(true);
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-12 md:py-16">
          <Link to="/menu" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" /> Seguir comprando
          </Link>
          <FadeInWhenVisible>
            <h1 className="font-display text-4xl md:text-5xl text-foreground">Finalizar Compra</h1>
          </FadeInWhenVisible>
        </div>
      </section>

      <section className="w-full py-12 bg-background">
        <div className="max-w-2xl mx-auto px-6">
          {/* Order summary */}
          <FadeInWhenVisible delay={0.1}>
            <div className="bg-card border rounded-2xl p-7 mb-6 shadow-soft">
              <h2 className="font-display text-lg mb-5">Resumen del pedido</h2>
              <div className="space-y-3 mb-5">
                {items.map((i) => (
                  <div key={i.product.id} className="flex justify-between text-sm items-center">
                    <div className="flex items-center gap-3">
                      <img src={i.product.image} alt={i.product.name} className="w-10 h-10 rounded-lg object-cover" />
                      <span>{i.quantity}x {i.product.name}</span>
                    </div>
                    <span className="font-medium">{formatPrice(i.product.price * i.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="text-2xl font-display font-bold text-primary">{formatPrice(totalPrice())}</span>
              </div>
            </div>
          </FadeInWhenVisible>

          {/* Form */}
          <FadeInWhenVisible delay={0.2}>
            <div className="bg-card border rounded-2xl p-7 shadow-soft space-y-5">
              <h2 className="font-display text-lg">Tus datos</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo *" className={inputClass} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono / WhatsApp *" type="tel" className={inputClass} />
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Empresa / Razón Social" className={`${inputClass} pl-11`} />
                </div>
                <DateInput
                  value={requestedDate}
                  onChange={setRequestedDate}
                  placeholder="Fecha deseada de entrega o recogida"
                  min={requiresAdvanceNotice ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                />
                {requiresAdvanceNotice && (
                  <div className="sm:col-span-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm font-medium flex items-start gap-2.5">
                    <span className="text-lg">⚠️</span>
                    <p>Tu pedido contiene productos que requieren 24h de preparación. La fecha más pronta de entrega es a partir de mañana.</p>
                  </div>
                )}
              </div>

              {/* Delivery type selector */}
              <div>
                <label className="text-sm font-medium mb-2.5 block text-muted-foreground">¿Cómo deseas recibir tu pedido?</label>
                <div className="flex gap-3">
                  {[
                    { id: 'pickup' as DeliveryType, label: 'Recoger en sede', icon: Store },
                    { id: 'delivery' as DeliveryType, label: 'Envío a domicilio', icon: MapPin },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDeliveryType(opt.id)}
                      className={`relative flex-1 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                        deliveryType === opt.id ? 'text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
                      }`}
                    >
                      {deliveryType === opt.id && (
                        <motion.div
                          layoutId="activeDelivery"
                          className="absolute inset-0 bg-primary rounded-xl"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <div className="relative z-10 flex items-center justify-center gap-2">
                        <opt.icon className="w-4 h-4" />
                        <span>{opt.label}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional: Pickup fields */}
              <AnimatePresence mode="wait">
                {deliveryType === 'pickup' && (
                  <motion.div
                    key="pickup"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-sm font-medium mb-2.5 block text-muted-foreground">Sede de recogida</label>
                      <div className="flex gap-3">
                        {tiendas.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSedeId(s.id)}
                            className={`relative flex-1 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                              activeSede === s.id ? 'text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
                            }`}
                          >
                            {activeSede === s.id && (
                              <motion.div
                                layoutId="activeSede"
                                className="absolute inset-0 bg-primary rounded-xl"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <div className="relative z-10">
                              <span className="block">{s.name.replace('Sede ', '')}</span>
                              <span className="text-[10px] opacity-70">{s.address.split(',')[0]}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2.5 block text-muted-foreground">Hora aproximada de recogida *</label>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Conditional: Delivery fields */}
                {deliveryType === 'delivery' && (
                  <motion.div
                    key="delivery"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Dirección de entrega *  (Ej: Cra 7 #45-12)"
                      className={inputClass}
                    />
                    <input
                      value={addressDetail}
                      onChange={(e) => setAddressDetail(e.target.value)}
                      placeholder="Interior / Bloque / Oficina / Apto"
                      className={inputClass}
                    />
                    <input
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder="Barrio"
                      className={inputClass}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales para tu pedido"
                rows={3}
                className={`${inputClass} resize-none`}
              />

              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleWhatsApp}
                disabled={submitting}
                className="w-full py-4 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:shadow-elevated transition-all duration-300 inline-flex items-center justify-center gap-2.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Enviando...
                  </span>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Enviar Pedido por WhatsApp
                  </>
                )}
              </motion.button>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </>
  );
};

export default CheckoutPage;
