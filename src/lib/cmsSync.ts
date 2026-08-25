import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * Sincroniza la caché de react-query entre pestañas: cuando el admin guarda algo, la pestaña
 * pública ("Ver sitio web" abre en otra pestaña) refetchea en segundo plano antes de que el
 * dueño la mire. Así podemos tener caché en el sitio público sin "flash" de contenido viejo.
 */
const CHANNEL = 'dc-cms-sync';

const getChannel = (): BroadcastChannel | null => {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return null;
  try {
    return new BroadcastChannel(CHANNEL);
  } catch {
    return null;
  }
};

export const invalidateCms = (qc: QueryClient, keys: QueryKey[]) => {
  keys.forEach((queryKey) => qc.invalidateQueries({ queryKey, refetchType: 'all' }));
  const ch = getChannel();
  if (ch) {
    ch.postMessage({ keys });
    ch.close();
  }
};

export const subscribeCmsSync = (qc: QueryClient): (() => void) => {
  const ch = getChannel();
  if (!ch) return () => {};
  ch.onmessage = (event: MessageEvent<{ keys?: QueryKey[] }>) => {
    const keys = event.data?.keys;
    if (!Array.isArray(keys)) return;
    keys.forEach((queryKey) => qc.invalidateQueries({ queryKey, refetchType: 'all' }));
  };
  return () => ch.close();
};

/** Keys públicas que dependen del CMS, agrupadas por dominio para no olvidar ninguna. */
export const CMS_KEYS = {
  settings: [['site-settings']] as QueryKey[],
  pages: [['active-pages'], ['admin-pages'], ['admin-pages-nav']] as QueryKey[],
  sections: [['page-sections'], ['page-sections-all']] as QueryKey[],
  products: [['products'], ['product'], ['admin-products']] as QueryKey[],
  blog: [['blog-posts'], ['blog-posts-home'], ['blog-post'], ['admin-blog-posts']] as QueryKey[],
};
