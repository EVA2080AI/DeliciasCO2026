import { useMemo, useState, type FormEvent } from 'react';
import { ThumbImage } from '@/components/ThumbImage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { repriceItems, useCartStore } from '@/store/cartStore';
import { Link } from 'react-router-dom';
import { ArrowLeft, Send, CheckCircle, MapPin, Store, Building2, AlertTriangle, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DEFAULT_WHATSAPP, useSedes } from '@/hooks/useSedes';
import { useProducts } from '@/hooks/useProducts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DateInput from '@/components/DateInput';
import { buildWaUrl, openWhatsAppAfter } from '@/lib/whatsapp';
import { localISODate } from '@/lib/dates';
import { ADDRESS_MAX, NOTES_MAX, minDateOffset, validateCheckout, type DeliveryType } from '@/lib/checkoutValidation';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const inputClass = 'w-full px-4 py-3.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all';

const optionClass = (active: boolean) =>
  `relative flex-1 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
    active ? 'text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
  }`;

const CheckoutPage = () => {
  usePageTitle('Checkout');
  const { items, clearCart } = useCartStore();
  const { tiendas } = useSedes();
  const { data: products, isLoading: productsLoading, isError: productsError } = useProducts();

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
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderSent, setOrderSent] = useState(false);
  const [waLink, setWaLink] = useState<{ url: string; opened: boolean } | null>(null);

  // Sede: selección explícita (sin default silencioso a la primera tienda).
  const selectedSede = tiendas.find((s) => s.id === sedeId);
  const noSedes = tiendas.length === 0;

  // Re-precio contra el catálogo vigente: el carrito persistido puede traer precios viejos.
  const repriced = useMemo(() => repriceItems(items, products), [items, products]);
  const orderItems = repriced.items;
  const orderTotal = repriced.total;

  const requiresAdvanceNotice = orderItems.some((i) => i.product.requiresAdvanceNotice);
  const minDate = localISODate(minDateOffset(requiresAdvanceNotice));
  const canSubmit = !submitting && !noSedes && !productsLoading && orderItems.length > 0;

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
            <p className="text-muted-foreground mb-2">
              {waLink?.opened
                ? 'Tu pedido quedó registrado y se abrió WhatsApp para confirmarlo con la sede.'
                : 'Tu pedido quedó registrado.'}
            </p>

            {waLink && !waLink.opened && (
              <div className="my-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-sm text-left" role="alert">
                <p className="mb-3 font-medium text-amber-700 dark:text-amber-400">
                  Tu navegador bloqueó la ventana de WhatsApp. Ábrela aquí para enviar tu pedido a la sede:
                </p>
                <a href={waLink.url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex">
                  <MessageCircle className="w-4 h-4" /> Abrir WhatsApp
                </a>
              </div>
            )}

            {waLink?.opened && (
              <p className="text-sm text-muted-foreground mb-2">
                ¿No se abrió WhatsApp?{' '}
                <a href={waLink.url} target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                  Abrir de nuevo
                </a>
              </p>
            )}

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const validationError = validateCheckout({
      name,
      phone,
      deliveryType,
      sedeId,
      hasSedes: !noSedes,
      pickupTime,
      address,
      neighborhood,
      requestedDate,
      requiresAdvanceNotice,
      notes,
      acceptedPolicy,
      itemCount: orderItems.length,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const sedeName = selectedSede?.name ?? sedeId;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanCompany = company.trim();
    const cleanAddress = address.trim();
    const cleanDetail = addressDetail.trim();
    const cleanNeighborhood = neighborhood.trim();
    const cleanNotes = notes.trim().slice(0, NOTES_MAX);
    const cleanDate = requestedDate.trim();
    const cleanTime = pickupTime.trim();

    const deliveryInfo =
      deliveryType === 'pickup'
        ? `Recoge en: ${sedeName}\nHora: ${cleanTime}`
        : `Envío a: ${cleanAddress}${cleanDetail ? ` (${cleanDetail})` : ''}${cleanNeighborhood ? ` — Barrio: ${cleanNeighborhood}` : ''}\n(Despacha: ${sedeName})`;

    const notesField =
      [
        `FECHA PEDIDO: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })}`,
        cleanDate ? `FECHA DESEADA: ${cleanDate}` : '',
        cleanCompany ? `EMPRESA: ${cleanCompany}` : '',
        deliveryType === 'delivery'
          ? `ENVÍO: ${[cleanAddress, cleanDetail, cleanNeighborhood].filter(Boolean).join(' ')} (Despacha: ${sedeName})`
          : `RECOGE EN: ${sedeName} a las ${cleanTime}`,
        cleanNotes,
      ]
        .filter(Boolean)
        .join(' | ') || null;

    const orderText = orderItems
      .map((i) => `- ${i.quantity}x ${i.product.name} - ${formatPrice(i.product.price * i.quantity)}`)
      .join('\n');
    const orderDate = format(new Date(), "EEEE d 'de' MMMM, h:mm a", { locale: es });
    const message = [
      `*Pedido Delicias Colombianas - Arbey Cabrera*`,
      `- Fecha pedido: ${orderDate}`,
      cleanDate ? `- Fecha deseada: ${cleanDate}` : '',
      '',
      `- Cliente: ${cleanName}`,
      `- Tel: ${cleanPhone}`,
      cleanCompany ? `- Empresa: ${cleanCompany}` : '',
      `- ${deliveryInfo}`,
      cleanNotes ? `- Notas: ${cleanNotes}` : '',
      '',
      `*Detalle:*`,
      orderText,
      '',
      `*Total: ${formatPrice(orderTotal)}*`,
    ]
      .filter(Boolean)
      .join('\n');

    const waUrl = buildWaUrl(selectedSede?.whatsapp || DEFAULT_WHATSAPP, message);

    const insertOrder = async () => {
      const { error } = await supabase.from('orders').insert({
        customer_name: cleanName,
        customer_phone: cleanPhone,
        sede: sedeId,
        notes: notesField,
        items: orderItems.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
        total: orderTotal,
      });
      if (error) throw error;
    };

    setSubmitting(true);
    try {
      // La pestaña se abre de forma síncrona dentro del clic; el insert ocurre después → sin popup bloqueado.
      const { opened, url } = await openWhatsAppAfter(insertOrder, () => waUrl);
      setWaLink({ url, opened });
      setOrderSent(true);
      clearCart();
      if (!opened) toast.warning('Tu navegador bloqueó WhatsApp. Usa el botón "Abrir WhatsApp".');
    } catch {
      toast.error('Error al guardar el pedido. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

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

              {repriced.unavailable.length > 0 && (
                <div className="mb-4 p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive space-y-1" role="alert">
                  {repriced.unavailable.map((u) => (
                    <p key={u.product.id} className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>“{u.product.name}” ya no está disponible y se quitó del pedido.</span>
                    </p>
                  ))}
                </div>
              )}

              {repriced.priceChanges.length > 0 && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 space-y-1">
                  {repriced.priceChanges.map((c) => (
                    <p key={c.name}>
                      El precio de “{c.name}” cambió de {formatPrice(c.oldPrice)} a {formatPrice(c.newPrice)}.
                    </p>
                  ))}
                </div>
              )}

              {productsError && (
                <p className="mb-4 text-xs text-muted-foreground">
                  No pudimos verificar los precios actuales; se usarán los guardados en tu carrito.
                </p>
              )}

              {orderItems.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  Ninguno de los productos de tu carrito está disponible. <Link to="/menu" className="text-primary underline">Ver el menú</Link>
                </p>
              ) : (
                <div className="space-y-3 mb-5">
                  {orderItems.map((i) => (
                    <div key={i.product.id} className="flex justify-between text-sm items-center">
                      <div className="flex items-center gap-3">
                        <ThumbImage src={i.product.image} alt={i.product.name} width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
                        <span>{i.quantity}x {i.product.name}</span>
                      </div>
                      <span className="font-medium">{formatPrice(i.product.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t pt-4 flex justify-between items-center">
                <span className="text-muted-foreground font-medium">Total</span>
                <span className="text-2xl font-display font-bold text-primary">{formatPrice(orderTotal)}</span>
              </div>
            </div>
          </FadeInWhenVisible>

          {/* Form */}
          <FadeInWhenVisible delay={0.2}>
            <form onSubmit={handleSubmit} noValidate className="bg-card border rounded-2xl p-7 shadow-soft space-y-5">
              <h2 className="font-display text-lg">Tus datos</h2>

              {noSedes && (
                <div role="alert" className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>En este momento no hay sedes disponibles para recibir pedidos. Inténtalo más tarde o escríbenos por WhatsApp.</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="co-name" className="sr-only">Nombre completo</label>
                  <input
                    id="co-name"
                    name="name"
                    autoComplete="name"
                    required
                    maxLength={120}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nombre completo *"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label htmlFor="co-phone" className="sr-only">Teléfono / WhatsApp</label>
                  <input
                    id="co-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    required
                    maxLength={25}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Teléfono / WhatsApp *"
                    className={inputClass}
                  />
                </div>
                <div className="relative">
                  <label htmlFor="co-company" className="sr-only">Empresa / Razón Social</label>
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                  <input
                    id="co-company"
                    name="organization"
                    autoComplete="organization"
                    maxLength={120}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Empresa / Razón Social"
                    className={`${inputClass} pl-11`}
                  />
                </div>
                <DateInput
                  id="co-date"
                  value={requestedDate}
                  onChange={setRequestedDate}
                  placeholder={requiresAdvanceNotice ? 'Fecha de entrega o recogida *' : 'Fecha deseada de entrega o recogida'}
                  min={minDate}
                  required={requiresAdvanceNotice}
                />
                {requiresAdvanceNotice && (
                  <div className="sm:col-span-2 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm font-medium flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
                    <p>Tu pedido contiene productos que requieren 24h de preparación. Selecciona una fecha a partir de mañana.</p>
                  </div>
                )}
              </div>

              {/* Sede selector */}
              <fieldset>
                <legend className="text-sm font-medium mb-2.5 block text-muted-foreground">
                  {deliveryType === 'pickup' ? 'Sede de recogida *' : 'Sede que despachará tu pedido *'}
                </legend>
                <div className="flex gap-3">
                  {tiendas.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSedeId(s.id)}
                      aria-pressed={sedeId === s.id}
                      className={optionClass(sedeId === s.id)}
                    >
                      {sedeId === s.id && (
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
              </fieldset>

              {/* Delivery type selector */}
              <fieldset>
                <legend className="text-sm font-medium mb-2.5 block text-muted-foreground">¿Cómo deseas recibir tu pedido?</legend>
                <div className="flex gap-3">
                  {[
                    { id: 'pickup' as DeliveryType, label: 'Recoger en sede', icon: Store },
                    { id: 'delivery' as DeliveryType, label: 'Envío a domicilio', icon: MapPin },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDeliveryType(opt.id)}
                      aria-pressed={deliveryType === opt.id}
                      className={optionClass(deliveryType === opt.id)}
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
              </fieldset>

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
                      <label htmlFor="co-time" className="text-sm font-medium mb-2.5 block text-muted-foreground">Hora aproximada de recogida *</label>
                      <input
                        id="co-time"
                        name="pickupTime"
                        type="time"
                        required
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  </motion.div>
                )}

                {deliveryType === 'delivery' && (
                  <motion.div
                    key="delivery"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div>
                      <label htmlFor="co-address" className="sr-only">Dirección de entrega</label>
                      <input
                        id="co-address"
                        name="address"
                        autoComplete="street-address"
                        required
                        maxLength={ADDRESS_MAX}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Dirección de entrega *  (Ej: Cra 7 #45-12)"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="co-address-detail" className="sr-only">Interior / Bloque / Oficina / Apto</label>
                      <input
                        id="co-address-detail"
                        name="addressDetail"
                        autoComplete="address-line2"
                        maxLength={120}
                        value={addressDetail}
                        onChange={(e) => setAddressDetail(e.target.value)}
                        placeholder="Interior / Bloque / Oficina / Apto"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="co-neighborhood" className="sr-only">Barrio</label>
                      <input
                        id="co-neighborhood"
                        name="neighborhood"
                        required
                        maxLength={80}
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Barrio *"
                        className={inputClass}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div>
                <label htmlFor="co-notes" className="sr-only">Notas adicionales para tu pedido</label>
                <textarea
                  id="co-notes"
                  name="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales para tu pedido"
                  rows={3}
                  maxLength={NOTES_MAX}
                  className={`${inputClass} resize-none`}
                />
                <p className="text-right text-[11px] text-muted-foreground mt-1">{notes.length}/{NOTES_MAX}</p>
              </div>

              <label htmlFor="co-policy" className="flex items-start gap-3 text-sm cursor-pointer select-none">
                <input
                  id="co-policy"
                  name="acceptPolicy"
                  type="checkbox"
                  required
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                />
                <span className="text-muted-foreground">
                  Acepto la{' '}
                  <Link to="/politica-de-datos" target="_blank" rel="noopener noreferrer" className="text-primary underline font-medium">
                    política de tratamiento de datos
                  </Link>{' '}
                  *
                </span>
              </label>

              <motion.button
                type="submit"
                whileTap={{ scale: 0.97 }}
                disabled={!canSubmit}
                className="w-full py-4 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:shadow-elevated transition-all duration-300 inline-flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" aria-hidden="true" />
                    Enviando...
                  </span>
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Enviar Pedido por WhatsApp
                  </>
                )}
              </motion.button>
            </form>
          </FadeInWhenVisible>
        </div>
      </section>
    </>
  );
};

export default CheckoutPage;
