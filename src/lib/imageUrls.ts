import { supabase } from '@/integrations/supabase/client';
import { stripExt } from '@/lib/imageNames';

export const BUCKET = 'product-images';
const PUBLIC_PREFIX = `/storage/v1/object/public/${BUCKET}/`;

/** Ruta dentro del bucket a partir de una URL pública (sin query string), o null si no es del bucket. */
export const bucketPathFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const u = new URL(url);
    const idx = u.pathname.indexOf(PUBLIC_PREFIX);
    if (idx === -1) return null;
    const path = decodeURIComponent(u.pathname.slice(idx + PUBLIC_PREFIX.length));
    return path || null;
  } catch {
    return null;
  }
};

export const publicUrlForPath = (path: string): string =>
  supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

export const isThumbPath = (path: string): boolean => /-thumb\.webp$/i.test(path);
export const thumbPathFor = (path: string): string => `${stripExt(path)}-thumb.webp`;

/** Quita `?t=...` y fragmentos. */
export const cleanImageUrl = (url: string): string => url.split(/[?#]/)[0];

/**
 * URL de la miniatura por convención de nombre (`foo.webp` → `foo-thumb.webp`).
 * Solo para objetos `.webp` del bucket (los subidos/optimizados por el pipeline nuevo);
 * para cualquier otra URL devuelve null y el consumidor usa la imagen completa.
 */
export const getThumbUrl = (url: string | null | undefined): string | null => {
  const path = bucketPathFromUrl(url);
  if (!path) return null;
  if (isThumbPath(path)) return cleanImageUrl(url as string);
  if (!/\.webp$/i.test(path)) return null;
  return publicUrlForPath(thumbPathFor(path));
};
