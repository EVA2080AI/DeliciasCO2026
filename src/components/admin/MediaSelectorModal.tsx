import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Image as ImageIcon, Loader2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MediaSelectorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export const MediaSelectorModal = ({ isOpen, onClose, onSelect }: MediaSelectorModalProps) => {
  const [files, setFiles] = useState<{name: string, url: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const fetchMedia = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.storage.from('product-images').list('', {
          limit: 50,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });
        
        if (error) throw error;
        
        const fileList = data
          .filter(f => f.name !== '.emptyFolderPlaceholder')
          .map(f => {
            const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(f.name);
            return {
              name: f.name,
              url: publicUrlData.publicUrl,
            };
        });
        
        setFiles(fileList);
      } catch (err: any) {
        console.error('Error al cargar imágenes:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMedia();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="font-display text-lg font-bold">Seleccionar de Librería</h2>
              <p className="text-sm text-muted-foreground">Elige una imagen cargada previamente</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-secondary text-muted-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Buscador */}
          <div className="p-4 border-b bg-secondary/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar imagen..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          {/* Grid de imágenes */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p>Cargando galería...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-20 bg-secondary/50 rounded-2xl border border-dashed">
                <ImageIcon className="w-12 h-12 mx-auto text-muted mb-3" />
                <p className="text-muted-foreground">No hay imágenes en la galería.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-3">
                {filteredFiles.map((file) => (
                  <button
                    key={file.name}
                    onClick={() => {
                      onSelect(file.url);
                      onClose();
                    }}
                    className="group relative aspect-square bg-secondary rounded-xl overflow-hidden border-2 border-transparent hover:border-primary transition-all focus:outline-none focus:ring-4 focus:ring-primary/20"
                  >
                    <img 
                      src={file.url} 
                      alt={file.name} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-xs font-bold py-1 px-3 bg-primary rounded-full">Seleccionar</span>
                    </div>
                  </button>
                ))}
                {filteredFiles.length === 0 && (
                  <div className="col-span-full text-center py-10 text-muted-foreground">
                    Ninguna imagen coincide con "{search}".
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
