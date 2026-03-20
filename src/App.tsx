import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import DynamicTheme from "./components/DynamicTheme";
import ScrollToTop from "./components/ScrollToTop";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import MenuPage from "./pages/MenuPage";
import ProductDetail from "./pages/ProductDetail";
import SedesPage from "./pages/SedesPage";
import InstitucionalPage from "./pages/InstitucionalPage";
import NosotrosPage from "./pages/NosotrosPage";
import BlogPage from "./pages/BlogPage";
import BlogDetailPage from "./pages/BlogDetailPage";
import FaqPage from "./pages/FaqPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminQuotations from "./pages/admin/AdminQuotations";
import AdminPages from "./pages/admin/AdminPages";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminSections from "./pages/admin/AdminSections";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminMedia from "./pages/admin/AdminMedia";
import AdminProfile from "./pages/admin/AdminProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DynamicTheme />
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/menu" element={<Layout><MenuPage /></Layout>} />
            <Route path="/producto/:id" element={<Layout><ProductDetail /></Layout>} />
            <Route path="/sedes" element={<Layout><SedesPage /></Layout>} />
            <Route path="/institucional" element={<Layout><InstitucionalPage /></Layout>} />
            <Route path="/nosotros" element={<Layout><NosotrosPage /></Layout>} />
            <Route path="/blog" element={<Layout><BlogPage /></Layout>} />
            <Route path="/blog/:slug" element={<Layout><BlogDetailPage /></Layout>} />
            <Route path="/preguntas-frecuentes" element={<Layout><FaqPage /></Layout>} />
            <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />

            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
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

            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
