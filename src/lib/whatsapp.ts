/** Utilidades de WhatsApp: números en formato wa.me (solo dígitos, con indicativo 57) y apertura segura. */

export const DEFAULT_COUNTRY_CODE = '57';

/** `+57 316 925 9646` / `3169259646` / `573169259646` → `573169259646`. Vacío si no hay dígitos. */
export const toWaNumber = (raw: string | null | undefined): string => {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${DEFAULT_COUNTRY_CODE}${digits}`; // celular colombiano sin indicativo
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
};

export const buildWaUrl = (number: string | null | undefined, text?: string): string => {
  const n = toWaNumber(number);
  const base = n ? `https://wa.me/${n}` : 'https://wa.me/';
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
};

export type OpenAfterResult<T> = { result: T; opened: boolean; url: string };

/**
 * Abre WhatsApp DESPUÉS de una operación asíncrona (p. ej. guardar el pedido) sin que el navegador
 * bloquee la ventana: la pestaña se abre de forma síncrona dentro del clic y se redirige al terminar.
 * Si el navegador aun así la bloqueó (`opened: false`), el llamador debe mostrar un enlace de respaldo.
 */
export const openWhatsAppAfter = async <T>(
  work: () => Promise<T>,
  buildUrl: (result: T) => string,
): Promise<OpenAfterResult<T>> => {
  let win: Window | null = null;
  try {
    win = window.open('', '_blank');
    if (win) {
      win.document.write(
        '<!doctype html><title>Abriendo WhatsApp…</title><p style="font-family:system-ui,sans-serif;padding:2rem;color:#444">Abriendo WhatsApp…</p>',
      );
    }
  } catch {
    win = null;
  }

  try {
    const result = await work();
    const url = buildUrl(result);
    if (win && !win.closed) {
      win.location.href = url;
      return { result, opened: true, url };
    }
    return { result, opened: false, url };
  } catch (err) {
    try {
      win?.close();
    } catch {
      /* noop */
    }
    throw err;
  }
};

/** Apertura directa (dentro de un clic). Devuelve false si fue bloqueada. */
export const openWhatsApp = (url: string): boolean => {
  const win = window.open(url, '_blank', 'noopener');
  return !!win;
};
