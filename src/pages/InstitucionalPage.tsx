import { useState, useRef } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Building2, FileText, Send, CalendarDays, Clock, Store, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import DateInput from '@/components/DateInput';
import { supabase } from '@/integrations/supabase/client';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { toast } from 'sonner';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useSedes } from '@/hooks/useSedes';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

interface QuoteItem {
  productId: string;
  quantity: number;
}

const InstitucionalPage = () => {
  usePageTitle('Pedidos Empresariales');
  const { data: products = [] } = useProducts();
  const { sedes } = useSedes();
  const whatsappNum = sedes[0]?.whatsapp || '573158924567';
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [company, setCompany] = useState('');
  const [nit, setNit] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  type DeliveryType = 'pickup' | 'delivery';
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [sedeId, setSedeId] = useState<string>('');
  const activeSede = sedeId;
  const [addressMain, setAddressMain] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [showQuote, setShowQuote] = useState(false);
  const quoteRef = useRef<HTMLDivElement>(null);
  const { sections: s } = usePageSectionsMap('institucional');

  const updateItem = (productId: string, quantity: number) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      if (existing) return prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      return [...prev, { productId, quantity }];
    });
  };

  const getQty = (id: string) => items.find((i) => i.productId === id)?.quantity || 0;

  const quoteItems = items
    .filter((i) => i.quantity > 0)
    .map((i) => {
      const p = products.find((pr) => pr.id === i.productId)!;
      return { ...i, product: p, subtotal: p.price * i.quantity };
    });
  const total = quoteItems.reduce((sum, i) => sum + i.subtotal, 0);
  const requiresAdvanceNotice = quoteItems.some(i => i.product.requiresAdvanceNotice);

  const handleGenerate = async () => {
    if (!company || !contact || !phone || quoteItems.length === 0) {
      toast.error('Completa los datos de la empresa y selecciona al menos un producto.');
      return;
    }
    if (deliveryType === 'pickup' && !sedeId) {
      toast.error('Selecciona una sede para recoger el pedido.');
      return;
    }
    if (deliveryType === 'delivery' && (!addressMain || !neighborhood)) {
      toast.error('Completa tu dirección y barrio para el envío.');
      return;
    }

    const selectedSede = sedes.find((s) => s.id === sedeId) || sedes[0];
    const deliveryInfo = deliveryType === 'delivery' 
       ? `ENVÍO DOMICILIO: ${addressMain.trim()} ${addressDetail.trim()} ${neighborhood.trim()}` 
       : `RECOGER EN SEDE: ${selectedSede?.name || ''}`;

    const { error } = await supabase.from('quotations').insert({
      company_name: company,
      nit: nit || null,
      contact_name: contact,
      phone,
      email: email || null,
      items: quoteItems.map((i) => ({ name: i.product.name, quantity: i.quantity, subtotal: i.subtotal })),
      total,
      notes: [
        requestedDeliveryDate ? `Fecha deseada: ${requestedDeliveryDate}` : null,
        deliveryInfo
      ].filter(Boolean).join(' | '),
    });

    if (error) {
      console.error('SUPABASE_QUOTATION_ERROR:', error);
      toast.error(`Error al guardar: ${error.message || 'Intenta de nuevo.'}`);
      return;
    }

    const fechaCotizacion = format(new Date(), "EEEE d 'de' MMMM 'de' yyyy, h:mm a", { locale: es });
    const orderText = quoteItems.map((i) => `- ${i.quantity}x ${i.product.name} - ${formatPrice(i.subtotal)}`).join('\n');
    const textMsg = `*Cotización Corporativa - Delicias Colombianas*\n- Fecha: ${fechaCotizacion}\n\n- Empresa: ${company}${nit ? ` (NIT: ${nit})` : ''}\n- Contacto: ${contact}\n- Tel: ${phone}${email ? `\n- Email: ${email}` : ''}\n\n- ${deliveryInfo}\n${requestedDeliveryDate ? `- Fecha deseada: ${requestedDeliveryDate}\n` : ''}\n*Detalle:*\n${orderText}\n\n*Total estimado: ${formatPrice(total)}*\n\n(Válida por 15 días hábiles)`;

    const whatsappDest = deliveryType === 'pickup' && selectedSede ? selectedSede.whatsapp : (sedes[0]?.whatsapp || whatsappNum);
    window.open(`https://wa.me/${whatsappDest}?text=${encodeURIComponent(textMsg)}`, '_blank');

    toast.success('Cotización generada y enviada a WhatsApp');
    setShowQuote(true);
    setTimeout(() => quoteRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const inputClass = "w-full px-4 py-3.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all";

  return (
    <>
      {/* Hero */}
      <section className="w-full bg-section-warm">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-16 md:py-24 text-center">
          <FadeInWhenVisible>
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-5">
              <Building2 className="w-3.5 h-3.5" /> {s.hero?.subtitle || 'Servicio B2B'}
            </span>
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl text-foreground mb-4">
              {s.hero?.title || 'Cotización Corporativa'}
            </h1>
            <p className="text-muted-foreground text-base max-w-lg mx-auto">
              {s.hero?.content || 'Arma tu paquete para eventos, desayunos corporativos o catering.'}
            </p>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* CTA de fecha de entrega */}
      <section className="w-full border-b bg-secondary/60">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-3.5 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <div className="flex items-center gap-2.5 text-sm text-foreground/80">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span>
              Hoy es <strong>{format(new Date(), "EEEE d 'de' MMMM", { locale: es })}</strong>
              {' '}· Especifica tu fecha de entrega en el formulario de cotización
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span>Pedidos con +24h de anticipación tienen prioridad</span>
          </div>
        </div>
      </section>

      <section className="w-full py-12 bg-background">
        <div className="max-w-4xl mx-auto px-6 lg:px-10">
          <FadeInWhenVisible delay={0.1}>
            <div className="bg-card border rounded-2xl p-7 mb-8 shadow-soft">
              <h2 className="font-display text-xl mb-5">{s.step1?.title || '1. Selecciona productos y cantidades'}</h2>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-background border hover:border-primary/30 transition-colors">
                    <img src={p.image} alt={p.name} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{formatPrice(p.price)} c/u</p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      value={getQty(p.id) || ''}
                      placeholder="0"
                      onChange={(e) => updateItem(p.id, parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2.5 rounded-xl border bg-card text-center text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                  </div>
                ))}
              </div>
              {total > 0 && (
                <div className="mt-5 pt-5 border-t flex justify-between items-center">
                  <span className="font-medium text-muted-foreground">Subtotal estimado</span>
                  <span className="font-display font-bold text-primary text-2xl">{formatPrice(total)}</span>
                </div>
              )}
            </div>
          </FadeInWhenVisible>

          <FadeInWhenVisible delay={0.2}>
            <div className="bg-card border rounded-2xl p-7 mb-8 shadow-soft">
              <h2 className="font-display text-xl mb-5">{s.step2?.title || '2. Datos de la empresa'}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Razón Social *" className={inputClass} />
                <input value={nit} onChange={(e) => setNit(e.target.value)} placeholder="NIT" className={inputClass} />
                <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Persona de contacto *" className={inputClass} />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono *" className={inputClass} />
                <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" className={`${inputClass} sm:col-span-2`} />
                <div className="sm:col-span-2 flex flex-col gap-2">
                  <DateInput
                    value={requestedDeliveryDate}
                    onChange={setRequestedDeliveryDate}
                    placeholder="Fecha deseada de entrega"
                    min={requiresAdvanceNotice ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                    className="w-full"
                  />
                  {requiresAdvanceNotice && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400 text-sm font-medium flex items-start gap-2.5">
                      <span className="text-lg">⚠️</span>
                      <p>La cotización contiene productos de preparación lenta. La fecha más cercana elegible es a partir de mañana.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery type selector */}
              <div className="pt-4 border-t mt-6">
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
                          layoutId="activeInstDelivery"
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

              <AnimatePresence mode="wait">
                {deliveryType === 'pickup' && (
                  <motion.div
                    key="pickup"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 overflow-hidden pt-4"
                  >
                    <div>
                      <label className="text-sm font-medium mb-2.5 block text-muted-foreground">Sede de recogida</label>
                      <div className="flex gap-3">
                        {sedes.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => setSedeId(s.id)}
                            className={`relative flex-1 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                              activeSede === s.id ? 'text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
                            }`}
                          >
                            {activeSede === s.id && (
                              <motion.div
                                layoutId="activeInstSede"
                                className="absolute inset-0 bg-primary rounded-xl"
                                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                              />
                            )}
                            <div className="relative z-10 text-center">
                              <span className="block">{s.name}</span>
                              <span className="text-[10px] opacity-80 mt-0.5 max-w-[120px] truncate mx-auto">{s.address}</span>
                            </div>
                          </button>
                        ))}
                      </div>
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
                    className="space-y-4 overflow-hidden pt-4"
                  >
                    <div>
                      <label className="text-sm font-medium mb-3 block text-muted-foreground">Datos de envío</label>
                      <div className="space-y-3">
                        <input value={addressMain} onChange={(e) => setAddressMain(e.target.value)} placeholder="Dirección completa *" className={inputClass} />
                        <div className="grid grid-cols-2 gap-3">
                          <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="Apto, Torre, Oficina" className={inputClass} />
                          <input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Barrio *" className={inputClass} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FadeInWhenVisible>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            className="w-full py-4 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:shadow-elevated transition-all duration-300 inline-flex items-center justify-center gap-2.5"
          >
            <FileText className="w-5 h-5" /> Generar Cotización
          </motion.button>

          {showQuote && (
            <motion.div
              ref={quoteRef}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-12 bg-card border-2 border-primary/20 rounded-2xl p-10 shadow-elevated"
            >
              <div className="text-center mb-8">
                <h2 className="font-display text-3xl">Cotización Formal</h2>
                <p className="text-muted-foreground text-sm mt-1">Delicias Colombianas · Válida por 15 días hábiles</p>
                <p className="text-muted-foreground text-xs mt-1 flex items-center justify-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" />
                  Emitida: {format(new Date(), "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })}
                </p>
              </div>
              <div className="mb-8 p-5 bg-secondary rounded-xl text-sm space-y-1.5">
                <p><strong>Empresa:</strong> {company}</p>
                {nit && <p><strong>NIT:</strong> {nit}</p>}
                <p><strong>Contacto:</strong> {contact}</p>
                <p><strong>Teléfono:</strong> {phone}</p>
                {email && <p><strong>Email:</strong> {email}</p>}
                {requestedDeliveryDate && (
                  <p className="flex items-center gap-1.5 text-primary font-semibold">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <strong>Fecha de entrega solicitada:</strong> {new Date(requestedDeliveryDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
              <table className="w-full text-sm mb-8">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 font-medium">Producto</th>
                    <th className="py-3 font-medium text-center">Cant.</th>
                    <th className="py-3 font-medium text-right">Unit.</th>
                    <th className="py-3 font-medium text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {quoteItems.map((i) => (
                    <tr key={i.productId} className="border-b border-border/50">
                      <td className="py-3">{i.product.name}</td>
                      <td className="py-3 text-center">{i.quantity}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatPrice(i.product.price)}</td>
                      <td className="py-3 text-right font-medium">{formatPrice(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-4 text-right font-display font-semibold text-lg">Total:</td>
                    <td className="py-4 text-right font-display font-bold text-primary text-2xl">{formatPrice(total)}</td>
                  </tr>
                </tfoot>
              </table>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleGenerate()}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" /> Enviar cotización por WhatsApp
              </motion.button>
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
};

export default InstitucionalPage;
