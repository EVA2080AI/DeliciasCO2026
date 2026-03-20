import CartSlideOver from './CartSlideOver';
import { FloatingWhatsApp } from './FloatingWhatsApp';
import { Header } from './layout/Header';
import { Footer } from './layout/Footer';
import ErrorBoundary from './ErrorBoundary';

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Footer />
      <CartSlideOver />
      <FloatingWhatsApp />
    </div>
  );
};

export default Layout;
