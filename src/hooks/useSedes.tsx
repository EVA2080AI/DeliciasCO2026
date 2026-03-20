import { useSiteSettingsMap } from '@/hooks/useSiteSettings';

export type Sede = {
  id: string;
  name: string;
  type: 'tienda';
  phone: string;
  whatsapp: string;
  email?: string;
  hours: string;
  address: string;
  mapEmbed: string;
};

const fallBackSedes: Sede[] = [
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

export const useSedes = () => {
  const { settings, isLoading, error } = useSiteSettingsMap();

  let sedes: Sede[] = [];
  try {
    if (settings.sedes) {
      const parsed = JSON.parse(settings.sedes);
      sedes = Array.isArray(parsed) && parsed.length > 0 ? parsed : fallBackSedes;
    } else {
      sedes = fallBackSedes;
    }
  } catch {
    sedes = fallBackSedes;
  }

  const tiendas = sedes.filter((s) => s.type === 'tienda');

  return { sedes, tiendas, isLoading, error };
};
