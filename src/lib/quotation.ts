/**
 * Lógica pura del formulario de cotización corporativa (/institucional):
 * validación, dirección, notas legibles y mensaje de WhatsApp. Sin React ni Supabase → testeable.
 */
import { toWaNumber } from '@/lib/whatsapp';
import { isTodayOrLater } from '@/lib/dates';

export type DeliveryType = 'pickup' | 'delivery';

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  pickup: 'Recoger en sede',
  delivery: 'Envío a domicilio',
};

export const MAX_QUOTE_QTY = 999;
export const PHONE_RE = /^\+?[\d\s()-]{7,}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

/** Cantidad entera entre 0 y MAX_QUOTE_QTY (NaN → 0). */
export const clampQty = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_QUOTE_QTY, Math.max(0, Math.trunc(value)));
};

export interface QuotationFormValues {
  company: string;
  nit: string;
  contact: string;
  phone: string;
  email: string;
  deliveryType: DeliveryType;
  sedeId: string;
  addressMain: string;
  addressDetail: string;
  neighborhood: string;
  /** YYYY-MM-DD o '' */
  requestedDate: string;
}

/** Devuelve el mensaje de error (es) o null si el formulario es válido. */
export const validateQuotation = (v: QuotationFormValues, itemCount: number): string | null => {
  if (!v.company.trim() || !v.contact.trim() || !v.phone.trim()) {
    return 'Completa la razón social, la persona de contacto y el teléfono.';
  }
  const phone = v.phone.trim();
  if (!PHONE_RE.test(phone) || toWaNumber(phone).length < 10) {
    return 'Ingresa un teléfono válido (mínimo 10 dígitos, por ejemplo 316 925 9646).';
  }
  if (v.email.trim() && !EMAIL_RE.test(v.email.trim())) {
    return 'El correo electrónico no es válido.';
  }
  if (itemCount === 0) return 'Selecciona al menos un producto con su cantidad.';
  if (v.deliveryType === 'pickup' && !v.sedeId) return 'Selecciona una sede para recoger el pedido.';
  if (v.deliveryType === 'delivery' && (!v.addressMain.trim() || !v.neighborhood.trim())) {
    return 'Completa tu dirección y barrio para el envío.';
  }
  if (v.requestedDate && !isTodayOrLater(v.requestedDate, 1)) {
    return 'La fecha de entrega debe ser a partir de mañana.';
  }
  return null;
};

/** "Cra 7 # 45-12, Torre B Of. 301, Chapinero" (omite partes vacías). */
export const buildDeliveryAddress = (v: Pick<QuotationFormValues, 'addressMain' | 'addressDetail' | 'neighborhood'>): string =>
  [v.addressMain, v.addressDetail, v.neighborhood].map((s) => s.trim()).filter(Boolean).join(', ');

/** `type` (no `interface`) para que sea asignable al tipo `Json` de Supabase. */
export type QuoteLine = {
  name: string;
  quantity: number;
  subtotal: number;
};

export interface QuotationSummary {
  company: string;
  nit: string;
  contact: string;
  phone: string;
  email: string;
  deliveryType: DeliveryType;
  /** Nombre de la sede (pickup) — '' si aplica envío. */
  sedeName: string;
  /** Dirección completa (delivery) — '' si aplica recogida. */
  address: string;
  requestedDate: string;
  items: QuoteLine[];
  total: number;
}

/** Línea legible de entrega, compartida entre `notes` y el mensaje de WhatsApp. */
export const deliveryLine = (s: Pick<QuotationSummary, 'deliveryType' | 'sedeName' | 'address'>): string =>
  s.deliveryType === 'delivery' ? `ENVÍO DOMICILIO: ${s.address}` : `RECOGER EN SEDE: ${s.sedeName}`;

/** Texto legado de `quotations.notes` (el admin lo muestra tal cual). */
export const buildQuotationNotes = (s: Pick<QuotationSummary, 'deliveryType' | 'sedeName' | 'address' | 'requestedDate'>): string =>
  [s.requestedDate ? `Fecha deseada: ${s.requestedDate}` : null, deliveryLine(s)].filter(Boolean).join(' | ');

export const buildQuotationMessage = (s: QuotationSummary, issuedAt: string, ref?: string): string => {
  const lines = s.items.map((i) => `- ${i.quantity}x ${i.name} - ${formatCOP(i.subtotal)}`).join('\n');
  // `null` = línea opcional omitida; '' = separador intencional.
  const parts: Array<string | null> = [
    '*Cotización Corporativa - Delicias Colombianas*',
    `- Fecha: ${issuedAt}`,
    ref ? `- Ref: ${ref}` : null,
    '',
    `- Empresa: ${s.company}${s.nit ? ` (NIT: ${s.nit})` : ''}`,
    `- Contacto: ${s.contact}`,
    `- Tel: ${s.phone}`,
    s.email ? `- Email: ${s.email}` : null,
    '',
    `- ${deliveryLine(s)}`,
    s.requestedDate ? `- Fecha deseada: ${s.requestedDate}` : null,
    '',
    '*Detalle:*',
    lines,
    '',
    `*Total estimado: ${formatCOP(s.total)}*`,
    '',
    '(Válida por 15 días hábiles)',
  ];
  return parts.filter((l): l is string => l !== null).join('\n');
};

/**
 * UUID v4 generado en el cliente: `quotations` solo permite INSERT al público (sin SELECT), así que
 * `insert().select('id')` fallaría por RLS. Con id propio no necesitamos RETURNING.
 */
export const newQuotationId = (): string => {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/** Escapa un valor para CSV (RFC 4180): siempre entre comillas, `"` → `""`. */
export const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

/** Fecha YYYY-MM-DD → "lunes, 31 de agosto de 2026" (sin corrimiento por zona horaria). */
export const formatRequestedDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
