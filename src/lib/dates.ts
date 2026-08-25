/** Fecha local (no UTC) en formato YYYY-MM-DD, con desplazamiento opcional en días. */
export const localISODate = (offsetDays = 0, from: Date = new Date()): string => {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + offsetDays);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** true si `iso` (YYYY-MM-DD) es hoy o posterior según la hora local. */
export const isTodayOrLater = (iso: string, offsetDays = 0): boolean => !!iso && iso >= localISODate(offsetDays);
