import { useEffect, useMemo, useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Trash2, Copy, Search, Upload, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { usePageTitle } from '@/hooks/usePageTitle';
import { ThumbImage } from '@/components/ThumbImage';
import { OptimizeMediaDialog } from '@/components/admin/OptimizeMediaDialog';
import { uploadOptimizedImage, MAX_UPLOAD_BYTES, isImageFile } from '@/lib/storage';
import { isThumbPath, publicUrlForPath, thumbPathFor } from '@/lib/imageUrls';
import { formatBytes, isImagePath, listAllObjects, removePaths, type BucketObject } from '@/lib/mediaOptimizer';

type MediaFile = BucketObject & { url: string };

const sizeBadge = (size: number) => {
  if (size > 300 * 1024) return 'bg-destructive/10 text-destructive';
  if (size > 120 * 1024) return 'bg-amber-500/10 text-amber-600';
  return 'bg-green-500/10 text-green-600';
};

export const AdminMedia = () => {
  usePageTitle('Medios');
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [stagedFile, setStagedFile] = useState<File | null>(null);
  const [stagedPreview, setStagedPreview] = useState<string | null>(null);
  const [optimizeOpen, setOptimizeOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const objects = await listAllObjects();
      const list = objects
        .filter((o) => isImagePath(o.path) && !isThumbPath(o.path))
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
        .map((o) => ({ ...o, url: publicUrlForPath(o.path) }));
      setFiles(list);
    } catch (err) {
      toast.error('Error al cargar imágenes: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, []);

  useEffect(() => {
    return () => {
      if (stagedPreview) URL.revokeObjectURL(stagedPreview);
    };
  }, [stagedPreview]);

  const totalBytes = useMemo(() => files.reduce((s, f) => s + f.size, 0), [files]);
  const heavyCount = useMemo(() => files.filter((f) => f.size > 300 * 1024 || !/\.webp$/i.test(f.path)).length, [files]);

  const handleDelete = async (file: MediaFile) => {
    if (!confirm(`¿Eliminar "${file.path}"? Este cambio no se puede deshacer y romperá los enlaces donde se use.`)) return;
    try {
      await removePaths([file.path, thumbPathFor(file.path)]);
      toast.success('Imagen eliminada correctamente');
      setFiles((prev) => prev.filter((f) => f.path !== file.path));
    } catch (err) {
      toast.error('Error al eliminar: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isImageFile(file)) { toast.error('Solo se permiten imágenes'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { toast.error('La imagen no debe superar 12MB'); return; }
    setStagedFile(file);
    setStagedPreview(URL.createObjectURL(file));
  };

  const clearStaged = () => {
    setStagedFile(null);
    setStagedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveStaged = async () => {
    if (!stagedFile) return;
    setUploading(true);
    try {
      await uploadOptimizedImage({ file: stagedFile, preset: 'section', prefix: 'media' });
      toast.success('Imagen subida y optimizada');
      clearStaged();
      fetchMedia();
    } catch (err) {
      toast.error('Error al subir imagen: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setUploading(false);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copiada al portapapeles');
  };

  const filteredFiles = files.filter((f) => f.path.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold">Librería de Medios</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {files.length} imágenes · {formatBytes(totalBytes)} en total
              {heavyCount > 0 && <span className="text-amber-600"> · {heavyCount} por optimizar</span>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none w-full sm:w-56"
              />
            </div>

            <button
              onClick={() => setOptimizeOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 border border-primary/40 text-primary font-semibold rounded-xl hover:bg-primary/5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              Optimizar imágenes
            </button>

            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileSelect} />
            {stagedPreview ? (
              <div className="flex items-center gap-3 bg-secondary/30 p-2 pl-4 rounded-xl border w-full sm:w-auto">
                <img src={stagedPreview} alt="Vista previa" className="w-8 h-8 rounded object-cover" />
                <button
                  onClick={handleSaveStaged}
                  disabled={uploading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 text-sm"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={clearStaged} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-lg" aria-label="Descartar">
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i, 12) * 0.03 }}
              key={file.path}
              className="bg-card rounded-2xl border overflow-hidden group relative flex flex-col"
            >
              <div className="aspect-square bg-secondary/50 relative overflow-hidden">
                <ThumbImage
                  src={file.url}
                  alt={file.path}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className={`absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${sizeBadge(file.size)}`}>
                  {formatBytes(file.size)}
                </span>
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => copyUrl(file.url)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm" title="Copiar Enlace" aria-label="Copiar enlace">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(file)} className="p-2 bg-red-500/80 hover:bg-red-500 text-white rounded-full backdrop-blur-sm" title="Eliminar" aria-label="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-3 text-xs flex-1 flex flex-col justify-between truncate">
                <p className="font-medium truncate" title={file.path}>{file.path}</p>
                <p className="text-muted-foreground text-[10px] mt-1">
                  {file.createdAt ? new Date(file.createdAt).toLocaleDateString('es-CO') : ''}
                  {file.mime && ` • ${file.mime.replace('image/', '').toUpperCase()}`}
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

      <OptimizeMediaDialog isOpen={optimizeOpen} onClose={() => setOptimizeOpen(false)} onFinished={fetchMedia} />
    </div>
  );
};

export default AdminMedia;
