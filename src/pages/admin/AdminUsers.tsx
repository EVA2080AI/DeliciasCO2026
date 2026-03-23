import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Mail, Key, Plus, Trash2, Loader2, UserPlus, Lock, Send, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';

type AdminUserRow = {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
};

const AdminUsers = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // List all admin users via Security Definer RPC (bypasses RLS recursion)
  const { data: adminUsers, isLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_admin_users' as any);
      if (error) throw error;
      return data as AdminUserRow[];
    },
  });

  // Create a new admin user via the create_admin_from_cms RPC
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }

    setLoadingCreate(true);
    try {
      const { data, error } = await supabase.rpc('create_admin_from_cms' as any, {
        admin_email: email.trim().toLowerCase(),
        admin_password: password,
      });

      if (error) throw error;

      const result = data as string;
      if (result.startsWith('ERROR:')) {
        toast.error(result.replace('ERROR: ', ''));
        return;
      }

      toast.success(`Administrador "${email}" creado exitosamente.`);
      setEmail('');
      setPassword('');
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
    } catch (err: any) {
      toast.error(err.message || 'No se pudo crear el usuario. Intenta de nuevo.');
    } finally {
      setLoadingCreate(false);
    }
  };

  // Revoke admin role (removes from user_roles — does NOT delete the auth user)
  const handleRevokeRole = async (targetUserId: string, targetEmail?: string) => {
    if (targetUserId === user?.id) {
      toast.error('No puedes revocarte tus propios permisos de administrador.');
      return;
    }
    if (!confirm(`¿Revocar acceso de administrador a "${targetEmail || targetUserId}"?\nEsto elimina su acceso al panel, pero no borra su cuenta.`)) return;

    setRevokingId(targetUserId);
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', targetUserId);
      if (error) throw error;
      toast.success('Permisos revocados correctamente.');
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
    } catch (err: any) {
      toast.error('Error al revocar permisos: ' + (err.message || 'Inténtalo de nuevo.'));
    } finally {
      setRevokingId(null);
    }
  };

  // Send password reset email
  const handleResetPassword = async (targetEmail: string) => {
    if (!targetEmail) return;
    if (!confirm(`¿Enviar enlace de restablecimiento de contraseña a "${targetEmail}"?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      toast.success(`Correo de restablecimiento enviado a ${targetEmail}.`);
    } catch (err: any) {
      toast.error('Error al enviar correo: ' + err.message);
    }
  };

  // Other admins (exclude current user)
  const otherAdmins = adminUsers?.filter((u) => u.user_id !== user?.id) ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Gestión de Usuarios Admin</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crea nuevas cuentas de administrador y gestiona sus permisos de acceso al panel.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Formulario de creación ── */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-2xl border p-6 sticky top-24">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <h2 className="font-display text-lg font-bold">Nuevo Admin</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="nuevo@delicias.com"
                    required
                    autoComplete="off"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">
                  Contraseña Temporal
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <p className="flex items-center gap-1.5 font-bold mb-1">
                  <Shield className="w-3.5 h-3.5" /> Acceso Total
                </p>
                Este usuario tendrá acceso completo al Panel de Control, inventario y configuración.
              </div>

              <button
                type="submit"
                disabled={loadingCreate}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
              >
                {loadingCreate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Administrador
              </button>
            </form>
          </div>
        </div>

        {/* ── Lista de administradores ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Mi cuenta */}
          {user && (
            <div className="bg-card rounded-2xl border overflow-hidden border-primary/20">
              <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
                <h3 className="font-display font-bold text-primary flex items-center gap-2">
                  <Shield className="w-4 h-4" /> Mi Cuenta
                </h3>
                <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                  Sesión Activa
                </span>
              </div>
              <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Correo</p>
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" /> {user.email}
                  </p>
                  <span className="inline-flex mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                    admin
                  </span>
                </div>
                <button
                  onClick={() => handleResetPassword(user.email || '')}
                  className="whitespace-nowrap flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Resetear contraseña
                </button>
              </div>
            </div>
          )}

          {/* Otros admins */}
          <div className="bg-card rounded-2xl border overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Otros Administradores</h3>
              <span className="px-3 py-1 bg-secondary text-foreground text-xs font-bold rounded-full">
                {isLoading ? '…' : otherAdmins.length}
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : otherAdmins.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground px-4">
                <UserPlus className="w-12 h-12 mx-auto text-muted mb-3" />
                <p className="font-semibold text-foreground">Eres el único administrador.</p>
                <p className="text-sm mt-1">Crea nuevos administradores usando el formulario.</p>
              </div>
            ) : (
              <div className="divide-y">
                {otherAdmins.map((admin) => (
                  <FadeInWhenVisible key={admin.id}>
                    <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Lock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">
                            {admin.email || 'Sin correo registrado'}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground mt-0.5 break-all">
                            {admin.user_id}
                          </p>
                          <span className="inline-flex mt-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                            {admin.role}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {admin.email && (
                          <button
                            onClick={() => handleResetPassword(admin.email!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <Send className="w-3 h-3" /> Reset
                          </button>
                        )}
                        <button
                          onClick={() => handleRevokeRole(admin.user_id, admin.email)}
                          disabled={revokingId === admin.user_id}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {revokingId === admin.user_id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                          Revocar
                        </button>
                      </div>
                    </div>
                  </FadeInWhenVisible>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
