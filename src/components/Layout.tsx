import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import CartSlideOver from './CartSlideOver';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import ErrorBoundary from './ErrorBoundary';
import PageFallback from './PageFallback';

/**
 * Layout persistente (ruta padre): Header/Footer/Carrito/WhatsApp se montan UNA vez y no se
 * vuelven a renderizar ni refetchean en cada navegación. El ErrorBoundary de la página va
 * keyed por ruta para que un error no "se pegue" al navegar a otra página.
 */
const Layout = () => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ErrorBoundary>
        <Header />
      </ErrorBoundary>
      <main className="flex-1">
        <ErrorBoundary key={pathname}>
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <ErrorBoundary>
        <Footer />
      </ErrorBoundary>
      <CartSlideOver />
      <FloatingWhatsApp />
    </div>
  );
};

export default Layout;
