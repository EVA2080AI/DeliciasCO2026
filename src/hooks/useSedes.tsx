import { useMemo } from 'react';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { toWaNumber } from '@/lib/whatsapp';

export type Sede = {
  id: string;
  name: string;
  type: 'tienda' | 'administrativa';
  phone: string;
  whatsapp: string;
  email?: string;
  hours: string;
  address: string;
  mapEmbed: string;
};

export const fallBackSedes: Sede[] = [
  {
    id: 'sede-quirinal',
    name: 'Sede Quirinal',
    type: 'tienda',
    phone: '+57 316 925 9646',
    whatsapp: '573169259646',
    email: 'contacto@deliciascolombianas.com',
    hours: 'Lun-Sáb 6:00 AM - 8:00 PM',
    address: 'Calle 60 # 56A-34, Bogotá',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15906.946394149097!2d-74.10115042211915!3d4.641666499999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f9bc6807897ab%3A0xc3b5e4c6c03e9a9a!2sQuirinal%2C%20Bogot%C3%A1%2C%20Colombia!5e0!3m2!1sen!2sus!4v1710438123456!5m2!1sen!2sus'
  },
  {
    id: 'sede-sprint',
    name: 'Sede Sprint Norte',
    type: 'tienda',
    phone: '+57 315 290 5160',
    whatsapp: '573152905160',
    email: 'sprint@deliciascolombianas.com',
    hours: 'Lun-Sáb 7:00 AM - 7:00 PM',
    address: 'Cl. 134, Bogotá',
    mapEmbed: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15904.757041571434!2d-74.0583155!3d4.739778200000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8e3f8582b1ed00a9%3A0x6d8b2496a2e2d83f!2sSprint%20Norte%2C%20Bogot%C3%A1%2C%20Colombia!5e0!3m2!1sen!2sus!4v1710438123456!5m2!1sen!2sus'
  }
];

/** Número de respaldo cuando el CMS no tiene sedes (primera tienda por defecto). */
export const DEFAULT_WHATSAPP = fallBackSedes[0].whatsapp;

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const str = (v: unknown) => (v === null || v === undefined ? '' : String(v)).trim();

/**
 * El JSON de sedes lo edita el dueño desde el panel: puede venir sin `id`, `type`, `whatsapp` o
 * `mapEmbed`. Normalizamos para que ningún consumidor tenga que hacer guards.
 */
export const normalizeSede = (raw: unknown, index: number): Sede | null => {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = str(r.name);
  if (!name) return null;
  const phone = str(r.phone);
  const type = str(r.type).toLowerCase() === 'administrativa' || /administrativ/i.test(name) ? 'administrativa' : 'tienda';
  return {
    id: str(r.id) || `sede-${slugify(name) || index + 1}`,
    name,
    type,
    phone,
    whatsapp: toWaNumber(str(r.whatsapp) || phone),
    email: str(r.email) || undefined,
    hours: str(r.hours),
    address: str(r.address),
    mapEmbed: str(r.mapEmbed),
  };
};

export const parseSedes = (json: string | null | undefined): Sede[] => {
  if (!json) return fallBackSedes;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return fallBackSedes;
    const list = parsed.map(normalizeSede).filter((s): s is Sede => s !== null);
    return list.length > 0 ? list : fallBackSedes;
  } catch {
    return fallBackSedes;
  }
};

export const useSedes = () => {
  const { settings, isLoading, error } = useSiteSettingsMap();
  const sedesJson = settings.sedes;
  const sedes = useMemo(() => parseSedes(sedesJson), [sedesJson]);
  const tiendas = useMemo(() => sedes.filter((s) => s.type === 'tienda'), [sedes]);
  return { sedes, tiendas, isLoading, error };
};
