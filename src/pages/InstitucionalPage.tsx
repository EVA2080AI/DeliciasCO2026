import { useState, useRef, useEffect, useMemo, type FormEvent } from 'react';
import { ThumbImage } from '@/components/ThumbImage';
import { usePageTitle } from '@/hooks/usePageTitle';
import { Building2, FileText, Send, CalendarDays, Clock, Store, MapPin, RefreshCw, RotateCcw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useProducts } from '@/hooks/useProducts';
import DateInput from '@/components/DateInput';
import { supabase } from '@/integrations/supabase/client';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';
import { toast } from 'sonner';
import { usePageSectionsMap } from '@/hooks/usePageSections';
import { useSedes, DEFAULT_WHATSAPP } from '@/hooks/useSedes';
import { buildWaUrl, openWhatsAppAfter } from '@/lib/whatsapp';
import { localISODate } from '@/lib/dates';
import type { Database } from '@/integrations/supabase/types';
import type { Product } from '@/store/cartStore';
import {
  DELIVERY_LABELS,
  MAX_QUOTE_QTY,
  buildDeliveryAddress,
  buildQuotationMessage,
  buildQuotationNotes,
  clampQty,
  formatCOP as formatPrice,
  newQuotationId,
  validateQuotation,
  type DeliveryType,
  type QuotationSummary,
} from '@/lib/quotation';

type QuotationInsert = Database['public']['Tables']['quotations']['Insert'];

interface QuoteItem {
  productId: string;
  quantity: number;
}

/** Cotización ya guardada: la tarjeta se renderiza desde esta copia, no desde el formulario vivo. */
interface SavedQuote extends QuotationSummary {
  id: string;
  issuedAt: Date;
  waUrl: string;
  /** false si el navegador bloqueó la pestaña de WhatsApp → mostramos enlace de respaldo. */
  opened: boolean;
}

const EMPTY_PRODUCTS: Product[] = [];

const InstitucionalPage = () => {
  usePageTitle('Pedidos Empresariales');
  const { data: productsData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useProducts();
  const products = productsData ?? EMPTY_PRODUCTS;
  const { sedes, tiendas } = useSedes();
  const pickupSedes = tiendas.length > 0 ? tiendas : sedes;
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [company, setCompany] = useState('');
  const [nit, setNit] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [requestedDeliveryDate, setRequestedDeliveryDate] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [sedeId, setSedeId] = useState<string>('');
  const [addressMain, setAddressMain] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState<SavedQuote | null>(null);
  const quoteRef = useRef<HTMLDivElement>(null);
  const { sections: s } = usePageSectionsMap('institucional');
  const minDate = localISODate(1);

  const updateItem = (productId: string, raw: number) => {
    const quantity = clampQty(raw);
    setItems((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.productId !== productId);
      const existing = prev.find((i) => i.productId === productId);
      if (existing) return prev.map((i) => (i.productId === productId ? { ...i, quantity } : i));
      return [...prev, { productId, quantity }];
    });
  };

  const getQty = (id: string) => items.find((i) => i.productId === id)?.quantity || 0;

  // Si un producto se desactiva mientras el usuario arma la cotización, lo sacamos de la lista.
  useEffect(() => {
    if (products.length === 0) return;
    setItems((prev) => {
      const next = prev.filter((i) => products.some((p) => p.id === i.productId));
      return next.length === prev.length ? prev : next;
    });
  }, [products]);

  const quoteItems = useMemo(
    () =>
      items.flatMap((i) => {
        const product = products.find((p) => p.id === i.productId);
        if (!product || i.quantity <= 0) return [];
        return [{ productId: i.productId, quantity: i.quantity, product, subtotal: product.price * i.quantity }];
      }),
    [items, products],
  );
  const total = quoteItems.reduce((sum, i) => sum + i.subtotal, 0);
  const requiresAdvanceNotice = quoteItems.some((i) => i.product.requiresAdvanceNotice);

  const resetForm = () => {
    setItems([]);
    setCompany('');
    setNit('');
    setContact('');
    setPhone('');
    setEmail('');
    setRequestedDeliveryDate('');
    setDeliveryType('delivery');
    setSedeId('');
    setAddressMain('');
    setAddressDetail('');
    setNeighborhood('');
    setSaved(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Inserta la fila (id generado en el cliente: el público no tiene SELECT para usar RETURNING). */
  /** PostgREST responde PGRST204 / 42703 cuando una columna no existe (migración aún no aplicada). */
  const isMissingColumnError = (e: { code?: string; message?: string }) =>
    e.code === 'PGRST204' || e.code === '42703' || /schema cache|column .* does not exist/i.test(e.message ?? '');

  const saveQuotation = async (row: QuotationInsert): Promise<string> => {
    const { error } = await supabase.from('quotations').insert(row);
    if (error && isMissingColumnError(error)) {
      // Compatibilidad: si la migración 20260825_qa_fixes aún no corrió, guardar sin las columnas
      // nuevas (toda la información de entrega también va en `notes`).
      const { delivery_type: _dt, sede: _sd, address: _ad, requested_date: _rq, ...legacy } = row;
      const { error: legacyError } = await supabase.from('quotations').insert(legacy);
      if (legacyError) throw legacyError;
      return row.id as string;
    }
    if (error) throw error;
    return row.id as string;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    const values = {
      company, nit, contact, phone, email, deliveryType, sedeId, addressMain, addressDetail, neighborhood,
      requestedDate: requestedDeliveryDate,
    };
    const validationError = validateQuotation(values, quoteItems.length);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const selectedSede = deliveryType === 'pickup' ? pickupSedes.find((sede) => sede.id === sedeId) : undefined;
    const summary: QuotationSummary = {
      company: company.trim(),
      nit: nit.trim(),
      contact: contact.trim(),
      phone: phone.trim(),
      email: email.trim(),
      deliveryType,
      sedeName: selectedSede?.name ?? '',
      address: deliveryType === 'delivery' ? buildDeliveryAddress(values) : '',
      requestedDate: requestedDeliveryDate,
      items: quoteItems.map((i) => ({ name: i.product.name, quantity: i.quantity, subtotal: i.subtotal })),
      total,
    };
    const id = newQuotationId();
    const issuedAt = new Date();
    const row: QuotationInsert = {
      id,
      company_name: summary.company,
      nit: summary.nit || null,
      contact_name: summary.contact,
      phone: summary.phone,
      email: summary.email || null,
      items: summary.items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
      total,
      notes: buildQuotationNotes(summary),
      delivery_type: deliveryType,
      sede: deliveryType === 'pickup' ? selectedSede?.id ?? sedeId : null,
      address: deliveryType === 'delivery' ? summary.address : null,
      requested_date: requestedDeliveryDate || null,
    };
    const message = buildQuotationMessage(
      summary,
      format(issuedAt, "EEEE d 'de' MMMM 'de' yyyy, h:mm a", { locale: es }),
      id.slice(0, 8).toUpperCase(),
    );
    const whatsappDest = deliveryType === 'pickup' && selectedSede ? selectedSede.whatsapp : sedes[0]?.whatsapp || DEFAULT_WHATSAPP;

    setSubmitting(true);
    try {
      // La pestaña se abre de forma síncrona dentro del clic y se redirige al terminar el insert (evita el bloqueo de popups).
      const { opened, url } = await openWhatsAppAfter(() => saveQuotation(row), () => buildWaUrl(whatsappDest, message));
      setSaved({ ...summary, id, issuedAt, waUrl: url, opened });
      toast.success(opened ? 'Cotización generada y enviada a WhatsApp' : 'Cotización guardada. Usa el botón para abrir WhatsApp.');
      setTimeout(() => quoteRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('SUPABASE_QUOTATION_ERROR:', err);
      const detail = err instanceof Error ? err.message : '';
      toast.error(`Error al guardar: ${detail || 'Intenta de nuevo.'}`);
    } finally {
      setSubmitting(false);
    }
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
          <form onSubmit={handleSubmit} noValidate aria-busy={submitting}>
            <FadeInWhenVisible delay={0.1}>
              <div className="bg-card border rounded-2xl p-7 mb-8 shadow-soft">
                <h2 className="font-display text-xl mb-5">{s.step1?.title || '1. Selecciona productos y cantidades'}</h2>

                {productsLoading ? (
                  <div className="space-y-2" role="status" aria-label="Cargando productos">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl bg-background border animate-pulse">
                        <div className="w-12 h-12 rounded-lg bg-secondary" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3.5 w-1/2 rounded bg-secondary" />
                          <div className="h-3 w-1/4 rounded bg-secondary" />
                        </div>
                        <div className="w-20 h-10 rounded-xl bg-secondary" />
                      </div>
                    ))}
                  </div>
                ) : productsError ? (
                  <div className="p-5 rounded-xl border border-destructive/30 bg-destructive/5 text-sm text-center space-y-3">
                    <p className="text-foreground">No pudimos cargar el menú. Revisa tu conexión e intenta de nuevo.</p>
                    <button
                      type="button"
                      onClick={() => refetchProducts()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      <RefreshCw className="w-4 h-4" /> Reintentar
                    </button>
                  </div>
                ) : products.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay productos disponibles por ahora. Escríbenos por WhatsApp y armamos tu cotización.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center gap-4 p-3.5 rounded-xl bg-background border hover:border-primary/30 transition-colors">
                        <ThumbImage src={p.image} alt={p.name} width={48} height={48} className="w-12 h-12 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <label htmlFor={`qty-${p.id}`} className="font-medium text-sm truncate block cursor-pointer">{p.name}</label>
                          <p className="text-xs text-muted-foreground">{formatPrice(p.price)} c/u</p>
                        </div>
                        <input
                          id={`qty-${p.id}`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={MAX_QUOTE_QTY}
                          step={1}
                          value={getQty(p.id) || ''}
                          placeholder="0"
                          aria-label={`Cantidad de ${p.name}`}
                          onChange={(e) => updateItem(p.id, e.target.value === '' ? 0 : Number(e.target.value))}
                          className="w-20 px-3 py-2.5 rounded-xl border bg-card text-center text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        />
                      </div>
                    ))}
                  </div>
                )}

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
                  <div>
                    <label htmlFor="inst-company" className="sr-only">Razón Social</label>
                    <input id="inst-company" name="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Razón Social *" required autoComplete="organization" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="inst-nit" className="sr-only">NIT</label>
                    <input id="inst-nit" name="nit" value={nit} onChange={(e) => setNit(e.target.value)} placeholder="NIT" autoComplete="off" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="inst-contact" className="sr-only">Persona de contacto</label>
                    <input id="inst-contact" name="contact" value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Persona de contacto *" required autoComplete="name" className={inputClass} />
                  </div>
                  <div>
                    <label htmlFor="inst-phone" className="sr-only">Teléfono</label>
                    <input id="inst-phone" name="phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono *" required autoComplete="tel" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="inst-email" className="sr-only">Correo electrónico</label>
                    <input id="inst-email" name="email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo electrónico" autoComplete="email" className={inputClass} />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-2">
                    <DateInput
                      id="inst-fecha"
                      value={requestedDeliveryDate}
                      onChange={setRequestedDeliveryDate}
                      placeholder="Fecha deseada de entrega"
                      min={minDate}
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
                  <p className="text-sm font-medium mb-2.5 block text-muted-foreground" id="inst-delivery-label">¿Cómo deseas recibir tu pedido?</p>
                  <div className="flex gap-3" role="group" aria-labelledby="inst-delivery-label">
                    {[
                      { id: 'pickup' as DeliveryType, label: DELIVERY_LABELS.pickup, icon: Store },
                      { id: 'delivery' as DeliveryType, label: DELIVERY_LABELS.delivery, icon: MapPin },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        aria-pressed={deliveryType === opt.id}
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
                        <p className="text-sm font-medium mb-2.5 block text-muted-foreground" id="inst-sede-label">Sede de recogida *</p>
                        <div className="flex gap-3" role="group" aria-labelledby="inst-sede-label">
                          {pickupSedes.map((sede) => (
                            <button
                              key={sede.id}
                              type="button"
                              aria-pressed={sedeId === sede.id}
                              onClick={() => setSedeId(sede.id)}
                              className={`relative flex-1 py-3.5 rounded-xl border text-sm font-medium transition-all duration-300 ${
                                sedeId === sede.id ? 'text-primary-foreground' : 'bg-background hover:bg-secondary text-foreground'
                              }`}
                            >
                              {sedeId === sede.id && (
                                <motion.div
                                  layoutId="activeInstSede"
                                  className="absolute inset-0 bg-primary rounded-xl"
                                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                />
                              )}
                              <div className="relative z-10 text-center">
                                <span className="block">{sede.name}</span>
                                <span className="text-[10px] opacity-80 mt-0.5 max-w-[120px] truncate mx-auto block">{sede.address}</span>
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
                        <p className="text-sm font-medium mb-3 block text-muted-foreground">Datos de envío</p>
                        <div className="space-y-3">
                          <div>
                            <label htmlFor="inst-address" className="sr-only">Dirección completa</label>
                            <input id="inst-address" name="address" value={addressMain} onChange={(e) => setAddressMain(e.target.value)} placeholder="Dirección completa *" required autoComplete="street-address" className={inputClass} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label htmlFor="inst-address-detail" className="sr-only">Apartamento, torre u oficina</label>
                              <input id="inst-address-detail" name="address-detail" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} placeholder="Apto, Torre, Oficina" autoComplete="address-line2" className={inputClass} />
                            </div>
                            <div>
                              <label htmlFor="inst-neighborhood" className="sr-only">Barrio</label>
                              <input id="inst-neighborhood" name="neighborhood" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Barrio *" required autoComplete="address-level3" className={inputClass} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </FadeInWhenVisible>

            <motion.button
              type="submit"
              whileTap={{ scale: 0.97 }}
              disabled={submitting}
              className="w-full py-4 rounded-xl bg-gradient-gold font-semibold text-primary-foreground shadow-gold hover:shadow-elevated transition-all duration-300 inline-flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <>
                  <FileText className="w-5 h-5" /> Generar Cotización
                </>
              )}
            </motion.button>
          </form>

          {saved && (
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
                  Emitida: {format(saved.issuedAt, "d 'de' MMMM 'de' yyyy, h:mm a", { locale: es })} · Ref. {saved.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
              <div className="mb-8 p-5 bg-secondary rounded-xl text-sm space-y-1.5">
                <p><strong>Empresa:</strong> {saved.company}</p>
                {saved.nit && <p><strong>NIT:</strong> {saved.nit}</p>}
                <p><strong>Contacto:</strong> {saved.contact}</p>
                <p><strong>Teléfono:</strong> {saved.phone}</p>
                {saved.email && <p><strong>Email:</strong> {saved.email}</p>}
                <p className="flex items-center gap-1.5">
                  {saved.deliveryType === 'pickup' ? <Store className="w-3.5 h-3.5" /> : <MapPin className="w-3.5 h-3.5" />}
                  <strong>{DELIVERY_LABELS[saved.deliveryType]}:</strong> {saved.deliveryType === 'pickup' ? saved.sedeName : saved.address}
                </p>
                {saved.requestedDate && (
                  <p className="flex items-center gap-1.5 text-primary font-semibold">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <strong>Fecha de entrega solicitada:</strong> {new Date(saved.requestedDate + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
                  {saved.items.map((i) => (
                    <tr key={i.name} className="border-b border-border/50">
                      <td className="py-3">{i.name}</td>
                      <td className="py-3 text-center">{i.quantity}</td>
                      <td className="py-3 text-right text-muted-foreground">{formatPrice(i.quantity > 0 ? i.subtotal / i.quantity : 0)}</td>
                      <td className="py-3 text-right font-medium">{formatPrice(i.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="py-4 text-right font-display font-semibold text-lg">Total:</td>
                    <td className="py-4 text-right font-display font-bold text-primary text-2xl">{formatPrice(saved.total)}</td>
                  </tr>
                </tfoot>
              </table>

              {!saved.opened && (
                <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                  <ExternalLink className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>
                    El navegador bloqueó la ventana de WhatsApp. Tu cotización ya quedó guardada:{' '}
                    <a href={saved.waUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-2">Abrir WhatsApp</a>
                  </p>
                </div>
              )}

              {/* Solo reabre el enlace: la cotización ya está guardada, no se inserta de nuevo. */}
              <motion.a
                href={saved.waUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm inline-flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" /> Enviar cotización por WhatsApp
              </motion.a>
              <button
                type="button"
                onClick={resetForm}
                className="mt-3 w-full py-3 rounded-xl border bg-background text-sm font-medium inline-flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Nueva cotización
              </button>
            </motion.div>
          )}
        </div>
      </section>
    </>
  );
};

export default InstitucionalPage;
