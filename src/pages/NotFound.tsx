import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Home, ArrowLeft } from 'lucide-react';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <section className="w-full bg-section-warm min-h-[70vh] flex items-center justify-center">
      <div className="text-center px-6">
        <FadeInWhenVisible>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary mb-4">Error 404</p>
          <h1 className="font-display text-6xl md:text-8xl text-foreground mb-4">404</h1>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Lo sentimos, la página que buscas no existe o fue movida.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/" className="btn-primary gap-2">
              <Home className="w-4 h-4" /> Ir al inicio
            </Link>
            <Link to="/menu" className="btn-outline gap-2">
              <ArrowLeft className="w-4 h-4" /> Ver menú
            </Link>
          </div>
        </FadeInWhenVisible>
      </div>
    </section>
  );
};

export default NotFound;
