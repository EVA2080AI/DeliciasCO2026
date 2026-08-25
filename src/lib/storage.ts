import { supabase } from '@/integrations/supabase/client';
import { makeVariants, type ImagePreset } from '@/lib/imageCompression';
import { extForMime } from '@/lib/imageNames';
import { BUCKET, bucketPathFromUrl, publicUrlForPath, thumbPathFor } from '@/lib/imageUrls';

/** Un año: el CDN de Supabase (plan Free) cachea hasta expirar, por eso NUNCA se reescribe una ruta existente. */
export const CACHE_CONTROL = '31536000';

export type UploadResult = { url: string; path: string; thumbUrl: string | null };

const uploadFile = async (path: string, file: File) => {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: CACHE_CONTROL,
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
};

/**
 * Comprime según el preset y sube `prefix-<timestamp>.<ext>` (+ `-thumb.webp` si aplica)
 * a una ruta nueva y única. Devuelve URLs públicas limpias (sin `?t=`).
 */
export const uploadOptimizedImage = async (opts: {
  file: File;
  preset: ImagePreset;
  prefix: string;
  folder?: string;
}): Promise<UploadResult> => {
  const { main, thumb } = await makeVariants(opts.file, opts.preset);
  const folder = opts.folder ? `${opts.folder.replace(/\/+$/, '')}/` : '';
  const safePrefix = opts.prefix.replace(/[^a-zA-Z0-9_-]/g, '-');
  const base = `${folder}${safePrefix}-${Date.now()}`;
  const path = `${base}.${extForMime(main.type)}`;

  await uploadFile(path, main);

  let thumbUrl: string | null = null;
  if (thumb) {
    const tPath = thumbPathFor(path);
    await uploadFile(tPath, thumb);
    thumbUrl = publicUrlForPath(tPath);
  }

  return { url: publicUrlForPath(path), path, thumbUrl };
};

/** Borra el objeto (y su miniatura, si existe) referenciado por una URL pública del bucket. Ignora URLs ajenas. */
export const removeByUrl = async (url: string | null | undefined): Promise<void> => {
  const path = bucketPathFromUrl(url);
  if (!path) return;
  const targets = [path];
  if (!/-thumb\.webp$/i.test(path)) targets.push(thumbPathFor(path));
  const { error } = await supabase.storage.from(BUCKET).remove(targets);
  if (error) throw error;
};

export const isImageFile = (file: File) => file.type.startsWith('image/');
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
