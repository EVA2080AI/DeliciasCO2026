import { useEffect } from 'react';

const BRAND = 'DC Delicias Colombianas';

export const usePageTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} | ${BRAND}` : `${BRAND} — El Mejor Pastel de Pollo de Colombia`;
  }, [title]);
};
