import imageCompression from 'browser-image-compression';

/**
 * Presets de compresión por uso. Supabase está en plan Free (sin transformaciones
 * de imagen), así que TODA la optimización ocurre aquí, en el navegador, al subir.
 */
export type ImagePreset = 'product' | 'section' | 'hero' | 'blog' | 'cover' | 'logo' | 'og' | 'thumb';

export type PresetSpec = {
  maxWidthOrHeight: number;
  maxSizeMB: number;
  initialQuality: number;
  fileType: 'image/webp' | 'image/jpeg';
  /** Si el navegador no puede codificar WebP, caer a PNG (conserva transparencia) en vez de JPEG. */
  keepAlpha: boolean;
  /** Generar además una miniatura `-thumb.webp` (192 px) para listas. */
  thumb: boolean;
};

export const IMAGE_PRESETS: Record<ImagePreset, PresetSpec> = {
  product: { maxWidthOrHeight: 1200, maxSizeMB: 0.18, initialQuality: 0.8, fileType: 'image/webp', keepAlpha: false, thumb: true },
  section: { maxWidthOrHeight: 1600, maxSizeMB: 0.25, initialQuality: 0.8, fileType: 'image/webp', keepAlpha: false, thumb: true },
  hero: { maxWidthOrHeight: 1920, maxSizeMB: 0.3, initialQuality: 0.78, fileType: 'image/webp', keepAlpha: false, thumb: true },
  blog: { maxWidthOrHeight: 1600, maxSizeMB: 0.25, initialQuality: 0.8, fileType: 'image/webp', keepAlpha: false, thumb: true },
  cover: { maxWidthOrHeight: 1600, maxSizeMB: 0.3, initialQuality: 0.75, fileType: 'image/webp', keepAlpha: false, thumb: false },
  logo: { maxWidthOrHeight: 256, maxSizeMB: 0.05, initialQuality: 0.9, fileType: 'image/webp', keepAlpha: true, thumb: false },
  // og:image en JPEG: los scrapers de WhatsApp/Facebook no renderizan WebP de forma fiable.
  og: { maxWidthOrHeight: 1200, maxSizeMB: 0.3, initialQuality: 0.85, fileType: 'image/jpeg', keepAlpha: false, thumb: false },
  thumb: { maxWidthOrHeight: 192, maxSizeMB: 0.02, initialQuality: 0.75, fileType: 'image/webp', keepAlpha: false, thumb: false },
};

const MIME_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
};

export const extForMime = (mime: string): string => MIME_EXT[mime] ?? 'bin';
export const stripExt = (name: string): string => name.replace(/\.[a-z0-9]+$/i, '');
export const renameExt = (name: string, ext: string): string => `${stripExt(name)}.${ext}`;

/** Formatos que no se rasterizan (se suben tal cual). */
const PASSTHROUGH = new Set(['image/svg+xml', 'image/gif']);

let webpSupport: boolean | null = null;
/** Safari (hasta 16) no codifica WebP en canvas: detectamos una sola vez. */
export const supportsWebpEncode = (): boolean => {
  if (webpSupport !== null) return webpSupport;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
};

const toFile = (blob: Blob, name: string): File =>
  blob instanceof File && blob.name === name ? blob : new File([blob], name, { type: blob.type, lastModified: Date.now() });

/**
 * Comprime/redimensiona según el preset y devuelve un File cuyo nombre lleva la
 * extensión REAL del contenido (antes quedaban `.png` con bytes JPEG).
 */
export const compressImage = async (input: File | Blob, preset: ImagePreset = 'product'): Promise<File> => {
  const spec = IMAGE_PRESETS[preset];
  const originalName = input instanceof File ? input.name : 'image';
  const file = toFile(input, originalName);

  if (PASSTHROUGH.has(file.type)) return file;

  const fallbackType = spec.keepAlpha ? 'image/png' : 'image/jpeg';
  const wantedType = spec.fileType === 'image/webp' && !supportsWebpEncode() ? fallbackType : spec.fileType;

  const run = (fileType: string) =>
    imageCompression(file, {
      maxSizeMB: spec.maxSizeMB,
      maxWidthOrHeight: spec.maxWidthOrHeight,
      initialQuality: spec.initialQuality,
      fileType,
      useWebWorker: true,
      preserveExif: false,
    });

  try {
    let out: Blob = await run(wantedType);
    if (out.type !== wantedType && wantedType !== fallbackType) {
      // El codificador pedido no está disponible en este navegador: reintentar con el fallback.
      out = await run(fallbackType);
    }
    return new File([out], renameExt(originalName, extForMime(out.type)), { type: out.type, lastModified: Date.now() });
  } catch (error) {
    console.error('[compressImage] fallo al comprimir, se usa el archivo original', error);
    return file;
  }
};

/** Variante principal + miniatura (si el preset la define). */
export const makeVariants = async (
  input: File | Blob,
  preset: ImagePreset,
): Promise<{ main: File; thumb: File | null }> => {
  const spec = IMAGE_PRESETS[preset];
  const [main, thumb] = await Promise.all([
    compressImage(input, preset),
    spec.thumb ? compressImage(input, 'thumb') : Promise.resolve(null),
  ]);
  return { main, thumb };
};
