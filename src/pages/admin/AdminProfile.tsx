import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Lock, Eye, EyeOff, Save, Key, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';

const AdminProfile = () => {
  const { user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setUpdating(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(`Error: ${error.message}`);
    } else {
      toast.success('Contraseña actualizada correctamente.');
      setPassword('');
      setConfirmPassword('');
    }
    setUpdating(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <FadeInWhenVisible>
        <div className="mb-8">
          <h1 className="font-display text-3xl">Perfil y Seguridad</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestiona tus credenciales de acceso al panel administrativo.
          </p>
        </div>

        <div className="bg-card border rounded-2xl shadow-soft overflow-hidden">
          <div className="p-6 border-b bg-secondary/30 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg">Información de Usuario</h2>
              <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Admin Access</p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Email de acceso</label>
              <div className="px-4 py-3 rounded-xl border bg-secondary/50 text-sm text-foreground/70 font-medium">
                {user?.email}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3" /> El email no puede ser modificado desde este panel.
              </p>
            </div>

            <hr />

            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <h3 className="font-display text-md flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Cambiar Contraseña
              </h3>
              
              <div className="space-y-4">
                <div className="relative">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all pr-12"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">Confirmar Contraseña</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full px-4 py-3 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={updating}
                className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-soft hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {updating ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Actualizar Contraseña
              </motion.button>
            </form>
          </div>
        </div>

        <div className="mt-8 p-5 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-start gap-4">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-amber-700">Recomendación de Seguridad</p>
            <p className="text-xs text-amber-700/80 leading-relaxed">
              Usa una contraseña que no utilices en otros sitios. Te recomendamos incluir una combinación de letras, números y símbolos para mayor protección.
            </p>
          </div>
        </div>
      </FadeInWhenVisible>
    </div>
  );
};

export default AdminProfile;
