import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Store, Loader2 } from 'lucide-react';
import { useSedes } from '@/hooks/useSedes';

export const FloatingWhatsApp = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { sedes, isLoading } = useSedes();

  // Cerrar si hace click afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const tiendas = sedes?.filter(s => s.type === 'tienda') || [];

  if (tiendas.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end" ref={dropdownRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-4 w-72 bg-card border shadow-elevated rounded-2xl overflow-hidden"
          >
            <div className="bg-[#25D366] p-4 text-white">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm tracking-wide">¡Hola! ¿En qué sede estás?</h4>
                <button onClick={() => setIsOpen(false)} className="opacity-70 hover:opacity-100 transition-opacity">
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
                tiendas.map((sede) => (
                  <a
                    key={sede.id}
                    href={`https://wa.me/${sede.whatsapp}?text=${encodeURIComponent('Hola, me gustaría información/hacer un pedido en ' + sede.name)}`}
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
        aria-haspopup="true"
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
