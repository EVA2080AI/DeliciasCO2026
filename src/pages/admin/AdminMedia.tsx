import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Image as ImageIcon, Loader2, Trash2, Copy, Search, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { compressImage } from '@/lib/imageCompression';

export const AdminMedia = () => {
  const [files, setFiles] = useState<{name: string, url: string, created_at: string, size: number}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const fetchMedia = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('product-images').list('', {
        limit: 100,
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
            created_at: f.created_at,
            size: f.metadata?.size || 0
          };
      });
      
      setFiles(fileList);
    } catch (err: any) {
      toast.error('Error al cargar imágenes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleDelete = async (fileName: string) => {
    if (!confirm('¿Estás seguro de eliminar esta imagen? Este cambio no se puede deshacer y romperá los enlaces donde se use.')) return;
    
    try {
      const { error } = await supabase.storage.from('product-images').remove([fileName]);
      if (error) throw error;
      toast.success('Imagen eliminada correctamente');
      setFiles(prev => prev.filter(f => f.name !== fileName));
    } catch (err: any) {
      toast.error('Error al eliminar: ' + err.message);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
  };

  const handleSaveStaged = async () => {
    if (!stagedFile) return;
    setUploading(true);
    try {
      const compressedFile = await compressImage(stagedFile);
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `media-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('product-images').upload(fileName, compressedFile);
      
      if (error) throw error;
      toast.success('Imagen subida y guardada correctamente');
      setStagedFile(null);
      setStagedPreview(null);
      fetchMedia();
    } catch (err: any) {
      toast.error('Error al subir imagen: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Librería de Medios</h1>
            <p className="text-muted-foreground text-sm mt-1">Explora y gestiona todas las imágenes subidas al sitio.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Buscar por nombre..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-64"
              />
            </div>
            
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            {stagedPreview ? (
              <div className="flex items-center gap-3 bg-secondary/30 p-2 pl-4 rounded-xl border w-full sm:w-auto">
                <img src={stagedPreview} alt="Preview" className="w-8 h-8 rounded object-cover" />
                <button 
                  onClick={handleSaveStaged}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => { setStagedFile(null); setStagedPreview(null); }} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                Subir Imagen
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p>Cargando galería...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-2xl border">
          <ImageIcon className="w-12 h-12 mx-auto text-muted mb-3" />
          <p className="text-muted-foreground">No hay imágenes en la galería aún.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file, i) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              key={file.name} 
              className="bg-card rounded-2xl border overflow-hidden group relative flex flex-col"
            >
              <div className="aspect-square bg-secondary/50 relative overflow-hidden">
                <img 
                  src={file.url} 
                  alt={file.name} 
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyUrl(file.url)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm" title="Copiar Enlace">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(file.name)} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3 text-xs flex-1 flex flex-col justify-between truncate">
                <p className="font-medium truncate" title={file.name}>{file.name}</p>
                <p className="text-muted-foreground text-[10px] mt-1">
                  {new Date(file.created_at).toLocaleDateString()}
                  {file.size > 0 && ` • ${(file.size / 1024).toFixed(1)} KB`}
                </p>
              </div>
            </motion.div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              No se encontraron imágenes que coincidan con la búsqueda.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminMedia;
