import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Mail, Key, Plus, Trash2, Loader2, UserPlus, Lock, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { FadeInWhenVisible } from '@/components/ScrollAnimations';

// NOTA: Para un listado completo (auth.users) Supabase restringe el acceso directo desde el frontend por seguridad.
// En un sistema real se usa Edge Functions o una tabla espejo `profiles`.
// Aquí emularemos leyendo desde la tabla `user_roles` como fuente de verdad de quiénes son Administradores.
type UserRoleItem = {
  id: string; // uuid from user_roles
  user_id: string;
  role: string;
  created_at: string;
  email?: string; // returned by list_admin_users RPC
};

const AdminUsers = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Fetch from user_roles via a Security Definer RPC to bypass RLS recursion
  const { data: adminRoles, isLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_admin_users' as any);
      if (error) {
        console.error('Fetch Admin Roles Error:', error);
        throw error;
      }
      return data as UserRoleItem[];
    },
  });

  // Mutación para intentar crear un usuario desde Auth (Supabase Client - signUp)
  // NOTA: Si `signUp` envía un correo de confirmación, dependerá de la config de tu proyecto.
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || password.length < 6) {
      toast.error('Ingresa un correo y una contraseña (mínimo 6 caracteres)');
      return;
    }
    
    setLoadingAction(true);
    try {
      // Usamos el RPC que creamos en Supabase para evitar el error de "Signups not allowed" 
      // y no cerrar la sesión del admin actual.
      const { data, error } = await supabase.rpc('create_admin_from_cms' as any, {
        admin_email: email,
        admin_password: password
      });

      if (error) throw error;
      
      if (data && data !== 'SUCCESS') {
        throw new Error(data as string);
      }

      toast.success('Usuario Administrador creado exitosamente');
      setEmail('');
      setPassword('');
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
    } catch (err: any) {
      toast.error(`Error: ${err.message || 'No se pudo crear el usuario'}`);
    } finally {
      setLoadingAction(false);
    }
  };

  // Mutación para revocar rol (No borra el Auth, pero le quita el acceso Admin)
  const revokeRole = async (userId: string) => {
    if(!confirm('¿Seguro quieres revocar los permisos de Administrador a este usuario?')) return;
    try {
      const { error } = await supabase.from('user_roles').delete().eq('user_id', userId);
      if (error) throw error;
      toast.success('Permisos de administrador revocados');
      qc.invalidateQueries({ queryKey: ['admin-user-roles'] });
    } catch(err: any) {
      toast.error('Error al revocar permisos');
    }
  };

  const handleResetPassword = async (targetEmail: string) => {
    if(!confirm(`¿Enviar instrucciones de restablecimiento de contraseña a ${targetEmail}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: `${window.location.origin}/admin/login`,
      });
      if (error) throw error;
      toast.success('Correo de credenciales enviado a ' + targetEmail);
    } catch(err: any) {
      toast.error('Error al enviar correo: ' + err.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold">Gestión de Usuarios (RBAC)</h1>
        <p className="text-muted-foreground text-sm mt-1">Crea nuevas cuentas de administrador y gestiona sus credenciales.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Formulario de Creación */}
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
                <label className="text-xs font-medium text-foreground mb-1.5 block">Correo Electrónico</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="ejemplo@delicias.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground mb-1.5 block">Contraseña Temporal</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-background text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
              </div>
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400 mt-2">
                <p className="flex items-center gap-1.5 font-bold mb-1"><Shield className="w-3.5 h-3.5"/> Nivel de Acceso</p>
                Este usuario tendrá acceso total y directo a todo el Panel de Control, inventario y facturación.
              </div>

              <button
                type="submit"
                disabled={loadingAction}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 mt-4"
              >
                {loadingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Crear Administrador
              </button>
            </form>
          </div>
        </div>

        {/* Lista de Usuarios */}
        <div className="lg:col-span-2 space-y-6">
          
           {/* Mi Cuenta Bloque */}
           {user && (
             <div className="bg-card rounded-2xl border overflow-hidden border-primary/20 shadow-sm">
               <div className="p-4 border-b bg-primary/5 flex items-center justify-between">
                 <h3 className="font-display font-bold text-primary flex items-center gap-2">
                   <Shield className="w-4 h-4" /> Mi Cuenta (Administrador)
                 </h3>
                 <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">Actual</span>
               </div>
               <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                 <div className="flex-1 space-y-4 w-full">
                   <div>
                     <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Correo Electrónico</p>
                     <p className="font-medium text-sm flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-lg border border-transparent">
                       <Mail className="w-4 h-4 text-muted-foreground" /> {user.email}
                     </p>
                   </div>
                   <div>
                     <p className="text-xs text-muted-foreground font-semibold mb-1 uppercase tracking-wider">Contraseña</p>
                     <p className="font-medium text-sm flex items-center gap-2 bg-secondary/50 px-3 py-2 rounded-lg border border-transparent text-muted-foreground/50 tracking-widest">
                       <Key className="w-4 h-4 text-muted-foreground mr-1" /> ••••••••••••
                     </p>
                   </div>
                 </div>
                 
                 <div className="flex flex-col gap-2 w-full sm:w-auto mt-4 sm:mt-0">
                   <button 
                     onClick={() => handleResetPassword(user.email || '')}
                     className="whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground font-semibold text-xs rounded-xl transition-colors w-full"
                   >
                     <Key className="w-3.5 h-3.5" /> Cambiar Contraseña
                   </button>
                   <button 
                     onClick={() => handleResetPassword(user.email || '')}
                     className="whitespace-nowrap flex items-center justify-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-xs rounded-xl transition-colors w-full"
                   >
                     <Send className="w-3.5 h-3.5" /> Enviar Credenciales
                   </button>
                 </div>
               </div>
             </div>
           )}

           <div className="bg-card rounded-2xl border overflow-hidden">
             <div className="p-6 border-b flex items-center justify-between">
               <h3 className="font-display font-bold text-lg">Otros Administradores Activos</h3>
               <span className="px-3 py-1 bg-secondary text-foreground text-xs font-bold rounded-full">
                 {adminRoles?.length || 0} Secundarios
               </span>
             </div>

             {isLoading ? (
               <div className="flex items-center justify-center py-16">
                 <Loader2 className="w-6 h-6 animate-spin text-primary" />
               </div>
             ) : adminRoles?.length === 0 ? (
               <div className="text-center py-16 text-muted-foreground px-4">
                 <Shield className="w-12 h-12 mx-auto text-muted mb-3" />
                 <p className="font-semibold text-foreground">El listado secundario está vacío.</p>
                 <p className="text-sm">Por RLS o porque eres el único administrador.</p>
               </div>
             ) : (
               <div className="divide-y">
                 {adminRoles?.map((role) => (
                   <FadeInWhenVisible key={role.id}>
                     <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-secondary/30 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                           <Lock className="w-5 h-5 text-primary" />
                         </div>
                         <div>
                           <p className="font-semibold text-sm text-foreground">
                             {(role as any).email || (role.user_id === user?.id ? user.email : 'Sin correo')}
                             {role.user_id === user?.id && <span className="ml-2 text-[10px] text-primary font-bold">(Tú)</span>}
                           </p>
                           <p className="font-medium text-xs font-mono text-muted-foreground break-all mt-0.5">ID: {role.user_id}</p>
                           <div className="flex items-center gap-2 mt-1">
                             <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                               {role.role}
                             </span>
                             {role.user_id === user?.id && (
                               <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">Tú</span>
                             )}
                           </div>
                         </div>
                       </div>
                       <button
                         onClick={() => revokeRole(role.user_id)}
                         className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-destructive hover:bg-destructive/10 transition-colors"
                       >
                         <Trash2 className="w-3 h-3" /> Revocar
                       </button>
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
