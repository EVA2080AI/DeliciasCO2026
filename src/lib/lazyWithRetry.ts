import { lazy, type ComponentType } from 'react';

const RETRY_KEY = 'dc-chunk-retry';

/**
 * React.lazy con un reintento: tras un deploy, una pestaña vieja puede pedir un chunk cuyo hash
 * ya no existe. Recargamos una sola vez para tomar la versión nueva en lugar de mostrar un error.
 */
export const lazyWithRetry = <T extends ComponentType<unknown>>(factory: () => Promise<{ default: T }>) =>
  lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RETRY_KEY);
      return mod;
    } catch (err) {
      if (!sessionStorage.getItem(RETRY_KEY)) {
        sessionStorage.setItem(RETRY_KEY, '1');
        window.location.reload();
        // Devolvemos una promesa que nunca resuelve: la página se está recargando.
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });
