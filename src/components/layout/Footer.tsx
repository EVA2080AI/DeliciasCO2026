import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, Mail } from 'lucide-react';
import { useSiteSettingsMap } from '@/hooks/useSiteSettings';
import { useSedes } from '@/hooks/useSedes';
import logoImg from '@/assets/images/logo.png';

export const Footer = () => {
  const { settings } = useSiteSettingsMap();
  const { sedes } = useSedes();

  const brandName = settings.brand_name || 'DC Delicias Colombianas';
  const brandSubtitle = settings.brand_subtitle || 'Arbey Cabrera · Originales desde 1985';
  const brandLogo = settings.brand_logo || logoImg;
  const socialInstagram = settings.social_instagram || '';
  const socialFacebook = settings.social_facebook || '';

  return (
    <footer className="bg-foreground text-background">
      <div className="bg-primary">
        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-primary-foreground">{settings.footer_cta_title || '¿Antojo de algo delicioso?'}</h3>
            <p className="text-primary-foreground/80 text-sm mt-1">{settings.footer_cta_subtitle || 'Haz tu pedido en línea y recógelo en tu sede favorita'}</p>
          </div>
          <Link to="/menu" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full font-bold text-sm bg-background text-foreground hover:bg-background/90 transition-all hover:-translate-y-0.5">
            Pedir ahora →
          </Link>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-12">
          <div className="md:col-span-4">
            <div className="flex items-center gap-3 mb-4">
              <img src={brandLogo} alt={brandName} className="w-14 h-14 object-contain" />
              <div>
                <span className="font-display text-lg text-background leading-none tracking-tight">
                  {brandName}
                </span>
                <span className="block text-[9px] text-background/50 font-semibold tracking-[0.18em] uppercase">{brandSubtitle}</span>
              </div>
            </div>
            <p className="text-background/60 text-sm leading-relaxed max-w-xs">
              Más de {new Date().getFullYear() - 1985} años llevando el sabor auténtico colombiano a tu mesa. Pasteles, empanadas, café y mucho más.
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socialInstagram && <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center text-background/60 hover:bg-primary hover:text-primary-foreground transition-all">
                <Instagram className="w-4 h-4" />
              </a>}
              {socialFacebook && <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center text-background/60 hover:bg-primary hover:text-primary-foreground transition-all">
                <Facebook className="w-4 h-4" />
              </a>}
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] mb-5">Menú</h4>
            <div className="space-y-3">
              <Link to="/menu?cat=pasteleria" className="block text-sm text-background/55 hover:text-background transition-colors">Pastelería</Link>
              <Link to="/menu?cat=cafeteria" className="block text-sm text-background/55 hover:text-background transition-colors">Cafetería</Link>
              <Link to="/menu?cat=bebidas" className="block text-sm text-background/55 hover:text-background transition-colors">Bebidas</Link>
              <Link to="/menu?cat=delicias" className="block text-sm text-background/55 hover:text-background transition-colors">Delicias</Link>
              <Link to="/menu?cat=combos" className="block text-sm text-background/55 hover:text-background transition-colors">Combos</Link>
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] mb-5">Empresa</h4>
            <div className="space-y-3">
              <Link to="/nosotros" className="block text-sm text-background/55 hover:text-background transition-colors">Nuestra historia</Link>
              <Link to="/institucional" className="block text-sm text-background/55 hover:text-background transition-colors">Empresas</Link>
              <Link to="/blog" className="block text-sm text-background/55 hover:text-background transition-colors">Blog</Link>
              <Link to="/preguntas-frecuentes" className="block text-sm text-background/55 hover:text-background transition-colors">FAQ</Link>
            </div>
          </div>

          <div className="md:col-span-4">
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] mb-5">Nuestras Sedes</h4>
            <div className="space-y-5">
              {sedes.map((s) => (
                <div key={s.name} className="bg-background/5 rounded-xl p-4">
                  <p className="font-bold text-background text-sm">{s.name}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-background/50 text-xs flex items-center gap-2"><MapPin className="w-3 h-3 shrink-0" /> {s.address}</p>
                    <p className="text-background/50 text-xs flex items-center gap-2"><Clock className="w-3 h-3 shrink-0" /> {s.hours}</p>
                    <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="text-primary text-xs font-semibold flex items-center gap-2">
                      <Phone className="w-3 h-3 shrink-0" /> {s.phone}
                    </a>
                    {s.email && (
                      <a href={`mailto:${s.email}`} className="text-secondary-foreground text-xs flex items-center gap-2 mt-1">
                        <Mail className="w-3 h-3 shrink-0" /> {s.email}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-background/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] text-background/40">© {new Date().getFullYear()} {brandName} - Arbey Cabrera. Todos los derechos reservados.</span>
          <div className="flex items-center gap-6 text-[11px] text-background/40">
            <span>Bogotá, Colombia 🇨🇴</span>
            <span>Tradición desde 1985</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
