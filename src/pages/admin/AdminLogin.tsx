import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Key, ShieldCheck, ArrowRight, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import logoImg from '@/assets/images/logo.png';

const AdminLogin = () => {
  const { user, isAdmin, loading, signIn } = useAuth();
  const { data: settings } = useSiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (loading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error('Credenciales inválidas. Por favor, verifica tu correo y contraseña.', {
        icon: <Info className="w-4 h-4 text-destructive" />
      });
    } else {
      toast.success('Bienvenido de nuevo al panel de administración.');
    }
    setSubmitting(false);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen w-full flex bg-[#F8FAFC] dark:bg-background overflow-hidden relative">
      
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-amber-500/20 blur-[100px] pointer-events-none" />

      {/* Left Panel - Brand / Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-primary/5">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.find(s => s.key === 'login_cover_image')?.value || "https://images.unsplash.com/photo-1555507036-ab1f40ce88ca?q=80&w=2692&auto=format&fit=crop"} 
            alt="Fondo Delicias Colombianas" 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/80" />
        </div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white mb-6"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold tracking-wider uppercase">Acceso Restringido</span>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-4xl xl:text-5xl font-display font-bold text-white max-w-lg leading-tight"
          >
            Gestión y Control de <span className="text-primary italic">Delicias Colombianas</span>
          </motion.h2>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="relative z-10 flex items-center justify-between text-white/70 text-sm font-medium"
        >
          <p>© {currentYear} DC Delicias Colombianas</p>
          <p>Plataforma Administrativa Segura</p>
        </motion.div>
      </div>

      {/* Right Panel - Form (Glassmorphism) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          {/* Mobile Text (Visible only on small screens) */}
          <div className="lg:hidden text-center mb-8">
            <img src={logoImg} alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain filter drop-shadow-lg" />
            <h1 className="font-display text-2xl font-bold text-foreground">Panel Administrativo</h1>
            <p className="text-sm text-muted-foreground mt-2">Delicias Colombianas</p>
          </div>

          <div className="bg-white/70 dark:bg-card/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl rounded-3xl p-8 sm:p-10 relative overflow-hidden">
            {/* Subtle inner gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            {/* Desktop Logo within Form */}
            <div className="hidden lg:block mb-10 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-6 shadow-inner">
                <img src={logoImg} alt="Logo" className="w-14 h-14 object-contain" />
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground mb-2">Bienvenido de nuevo</h1>
              <p className="text-muted-foreground text-sm font-medium">Ingresa tus credenciales de administrador</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@delicias.com"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-background/50 border-2 border-transparent focus:border-primary/50 focus:bg-background rounded-xl font-medium text-sm transition-all outline-none hover:bg-background/80 shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-11 pr-4 py-3.5 bg-background/50 border-2 border-transparent focus:border-primary/50 focus:bg-background rounded-xl font-medium text-sm transition-all outline-none hover:bg-background/80 shadow-sm"
                  />
                </div>
              </div>

              <div className="pt-4">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="w-full group py-4 rounded-xl bg-gradient-to-r from-primary to-amber-500 font-bold text-primary-foreground shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative z-10 flex items-center gap-2">
                    {submitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Verificando...</>
                    ) : (
                      <>Ingresar al Sistema <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </span>
                </motion.button>
              </div>
            </form>
            
            <div className="mt-8 text-center flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground bg-primary/5 py-2 px-4 rounded-lg border border-primary/10">
              <Lock className="w-3.5 h-3.5 text-primary" />
              Transmisión encriptada de extremo a extremo
            </div>
          </div>
          
          <div className="mt-8 text-center lg:hidden">
            <p className="text-xs text-muted-foreground font-medium">© {currentYear} Plataforma Segura</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLogin;