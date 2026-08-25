import { useEffect, useMemo, useState, type ImgHTMLAttributes, type SyntheticEvent } from 'react';
import { getThumbUrl } from '@/lib/imageUrls';

export const PLACEHOLDER_IMAGE = '/placeholder.svg';

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null;
  /** Intentar primero la miniatura `-thumb.webp` (para renders de ≤ 96 px). */
  thumb?: boolean;
  /** Imagen crítica (LCP): carga eager con fetchpriority=high. */
  priority?: boolean;
};

/**
 * <img> con cadena de fallback: miniatura → original → placeholder.
 * Lazy + async por defecto; usa `priority` para la imagen principal above-the-fold.
 */
export const ThumbImage = ({ src, thumb = true, priority = false, loading, decoding = 'async', onError, alt = '', ...rest }: Props) => {
  const candidates = useMemo(() => {
    const list: string[] = [];
    const t = thumb ? getThumbUrl(src) : null;
    if (t && t !== src) list.push(t);
    if (src) list.push(src);
    list.push(PLACEHOLDER_IMAGE);
    return list;
  }, [src, thumb]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [candidates]);

  const current = candidates[Math.min(idx, candidates.length - 1)];

  const handleError = (e: SyntheticEvent<HTMLImageElement>) => {
    setIdx((i) => Math.min(i + 1, candidates.length - 1));
    onError?.(e);
  };

  const priorityAttrs = priority ? ({ fetchpriority: 'high' } as Record<string, string>) : undefined;

  return (
    <img
      src={current}
      alt={alt}
      loading={loading ?? (priority ? 'eager' : 'lazy')}
      decoding={priority ? 'sync' : decoding}
      onError={handleError}
      {...priorityAttrs}
      {...rest}
    />
  );
};

/** Imagen completa (sin miniatura) con fallback a placeholder. */
export const SafeImage = (props: Omit<Props, 'thumb'>) => <ThumbImage {...props} thumb={false} />;

export default ThumbImage;
