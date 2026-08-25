/**
 * Validadores puros del checkout (sin React) para poder testearlos y reutilizarlos.
 */
import { toWaNumber } from '@/lib/whatsapp';
import { isTodayOrLater } from '@/lib/dates';

export const NAME_MIN = 2;
export const ADDRESS_MIN = 5;
export const ADDRESS_MAX = 200;
export const NOTES_MAX = 500;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Evita consultar Postgres con ids que no son uuid (error 22P02). */
export const isUuid = (value: string | null | undefined): value is string => !!value && UUID_RE.test(value);

/** Formato humano permitido: dígitos, espacios, paréntesis y guiones, con `+` opcional. */
export const PHONE_RE = /^\+?[\d\s()-]{7,}$/;

/** Válido si tiene formato de teléfono y, normalizado a wa.me, tiene indicativo + número (≥ 12 dígitos). */
export const isValidPhone = (raw: string): boolean => {
  const value = (raw ?? '').trim();
  return PHONE_RE.test(value) && toWaNumber(value).length >= 12;
};

export type DeliveryType = 'pickup' | 'delivery';

/** Días mínimos de anticipación: mañana si hay productos de 24 h, hoy en caso contrario. */
export const minDateOffset = (requiresAdvanceNotice: boolean): number => (requiresAdvanceNotice ? 1 : 0);

export interface CheckoutInput {
  name: string;
  phone: string;
  deliveryType: DeliveryType;
  sedeId: string;
  hasSedes: boolean;
  pickupTime: string;
  address: string;
  neighborhood: string;
  requestedDate: string;
  requiresAdvanceNotice: boolean;
  notes: string;
  acceptedPolicy: boolean;
  itemCount: number;
}

/** Devuelve el primer mensaje de error, o `null` si el formulario es válido. */
export const validateCheckout = (input: CheckoutInput): string | null => {
  if (input.itemCount <= 0) return 'Tu carrito está vacío.';
  if (!input.hasSedes) return 'No hay sedes disponibles para recibir pedidos en este momento.';
  if (input.name.trim().length < NAME_MIN) return 'Ingresa tu nombre completo.';
  if (!isValidPhone(input.phone)) return 'Ingresa un teléfono válido (10 dígitos, ej. 316 925 9646).';
  if (!input.sedeId) return 'Selecciona una sede.';

  const date = input.requestedDate.trim();
  const offset = minDateOffset(input.requiresAdvanceNotice);
  if (input.requiresAdvanceNotice && !date) {
    return 'Selecciona la fecha de entrega: tu pedido incluye productos que requieren 24h de anticipación.';
  }
  if (date && !isTodayOrLater(date, offset)) {
    return input.requiresAdvanceNotice
      ? 'La fecha debe ser a partir de mañana (productos con 24h de anticipación).'
      : 'La fecha no puede ser anterior a hoy.';
  }

  if (input.deliveryType === 'pickup') {
    if (!input.pickupTime.trim()) return 'Selecciona la hora de recogida.';
  } else {
    const address = input.address.trim();
    if (address.length < ADDRESS_MIN) return 'Ingresa tu dirección de entrega.';
    if (address.length > ADDRESS_MAX) return `La dirección es demasiado larga (máx. ${ADDRESS_MAX} caracteres).`;
    if (!input.neighborhood.trim()) return 'Ingresa el barrio de entrega.';
  }

  if (input.notes.trim().length > NOTES_MAX) return `Las notas no pueden superar ${NOTES_MAX} caracteres.`;
  if (!input.acceptedPolicy) return 'Debes aceptar la política de tratamiento de datos.';
  return null;
};
