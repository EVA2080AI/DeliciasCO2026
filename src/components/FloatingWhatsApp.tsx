import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Store, Loader2 } from 'lucide-react';
import { DEFAULT_WHATSAPP, useSedes } from '@/hooks/useSedes';
import { buildWaUrl } from '@/lib/whatsapp';

type Contact = { id: string; name: string; whatsapp: string };

const FALLBACK_CONTACTS: Contact[] = [{ id: 'default', name: 'Delicias Colombianas', whatsapp: DEFAULT_WHATSAPP }];

export const FloatingWhatsApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { tiendas, isLoading } = useSedes();

  // Cerrar si hace click afuera o con Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sin tiendas en el CMS seguimos mostrando el botón con el número de respaldo.
  const contacts: Contact[] = tiendas.length > 0 ? tiendas : FALLBACK_CONTACTS;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end" ref={dropdownRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="mb-4 w-72 bg-card border shadow-elevated rounded-2xl overflow-hidden"
            role="dialog"
            aria-label="Escríbenos por WhatsApp"
          >
            <div className="bg-[#25D366] p-4 text-white">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm tracking-wide">¡Hola! ¿En qué sede estás?</h4>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-white/90 mt-1">Elige tu sucursal para atenderte más rápido.</p>
            </div>

            <div className="p-2 space-y-1 bg-background/50 max-h-[300px] overflow-y-auto">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                contacts.map((sede) => (
                  <a
                    key={sede.id}
                    href={buildWaUrl(sede.whatsapp, `Hola, me gustaría información/hacer un pedido en ${sede.name}`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/80 transition-colors group cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 group-hover:bg-[#25D366]/10 transition-colors">
                      <Store className="w-4 h-4 text-muted-foreground group-hover:text-[#25D366] transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground group-hover:text-[#25D366] transition-colors">{sede.name}</p>
                      <p className="text-xs text-muted-foreground">Responde en minutos</p>
                    </div>
                  </a>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Cerrar chat de WhatsApp' : 'Abrir chat de WhatsApp'}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="w-14 h-14 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow relative z-50 group"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-7 h-7" />}

        {/* Pulsing notification dot when closed */}
        {!isOpen && (
          <span className="absolute top-0 right-0 w-3 h-3" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-[#25D366]"></span>
          </span>
        )}
      </motion.button>
    </div>
  );
};
