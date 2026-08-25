import { Loader2 } from 'lucide-react';

/** Fallback de Suspense para páginas cargadas bajo demanda. Sin framer-motion: debe ser liviano. */
const PageFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center" role="status" aria-live="polite">
    <Loader2 className="w-6 h-6 animate-spin text-primary" />
    <span className="sr-only">Cargando…</span>
  </div>
);

export default PageFallback;
