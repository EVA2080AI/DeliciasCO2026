import { Suspense, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import DynamicTheme from "./components/DynamicTheme";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "./components/Layout";
import PageFallback from "./components/PageFallback";
import ErrorBoundary from "./components/ErrorBoundary";
import { subscribeCmsSync } from "./lib/cmsSync";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

// Público: la portada carga eager (LCP); el resto bajo demanda.
const MenuPage = lazyWithRetry(() => import("./pages/MenuPage"));
const ProductDetail = lazyWithRetry(() => import("./pages/ProductDetail"));
const SedesPage = lazyWithRetry(() => import("./pages/SedesPage"));
const InstitucionalPage = lazyWithRetry(() => import("./pages/InstitucionalPage"));
const NosotrosPage = lazyWithRetry(() => import("./pages/NosotrosPage"));
const BlogPage = lazyWithRetry(() => import("./pages/BlogPage"));
const BlogDetailPage = lazyWithRetry(() => import("./pages/BlogDetailPage"));
const FaqPage = lazyWithRetry(() => import("./pages/FaqPage"));
const CheckoutPage = lazyWithRetry(() => import("./pages/CheckoutPage"));

// Admin: un solo chunk (manualChunks) que los visitantes nunca descargan.
const AdminLogin = lazyWithRetry(() => import("./pages/admin/AdminLogin"));
const AdminLayout = lazyWithRetry(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/AdminDashboard"));
const AdminProducts = lazyWithRetry(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazyWithRetry(() => import("./pages/admin/AdminOrders"));
const AdminQuotations = lazyWithRetry(() => import("./pages/admin/AdminQuotations"));
const AdminPages = lazyWithRetry(() => import("./pages/admin/AdminPages"));
const AdminBlog = lazyWithRetry(() => import("./pages/admin/AdminBlog"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminSections = lazyWithRetry(() => import("./pages/admin/AdminSections"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/AdminUsers"));
const AdminMedia = lazyWithRetry(() => import("./pages/admin/AdminMedia"));
const AdminProfile = lazyWithRetry(() => import("./pages/admin/AdminProfile"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Sitio público: caché de 2 min (navegar entre páginas no refetchea ni muestra skeletons).
      // El panel admin usa useAdminQuery (siempre fresco) y sus mutaciones invalidan estas keys
      // en TODAS las pestañas (lib/cmsSync), así que no hay "flash" de contenido viejo.
      staleTime: 2 * 60 * 1000,
      gcTime: 15 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

const CmsSync = () => {
  useEffect(() => subscribeCmsSync(queryClient), []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Sonner />
      <DynamicTheme />
      <CmsSync />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          {/* Público: Layout persistente con Header/Footer montados una sola vez */}
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/producto/:id" element={<ProductDetail />} />
            <Route path="/sedes" element={<SedesPage />} />
            <Route path="/institucional" element={<InstitucionalPage />} />
            <Route path="/nosotros" element={<NosotrosPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:slug" element={<BlogDetailPage />} />
            <Route path="/preguntas-frecuentes" element={<FaqPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* Admin */}
          <Route
            path="/admin/login"
            element={
              <Suspense fallback={<PageFallback />}>
                <AdminLogin />
              </Suspense>
            }
          />
          <Route
            path="/admin"
            element={
              <ErrorBoundary>
                <Suspense fallback={<PageFallback />}>
                  <AdminLayout />
                </Suspense>
              </ErrorBoundary>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="quotations" element={<AdminQuotations />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="blog" element={<AdminBlog />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="sections" element={<AdminSections />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="media" element={<AdminMedia />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
