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
