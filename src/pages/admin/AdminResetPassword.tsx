import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Loader2, ShieldCheck, ArrowRight, AlertTriangle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { usePageTitle } from '@/hooks/usePageTitle';
import logoImg from '@/assets/images/logo.webp';

type Stage = 'verifying' | 'ready' | 'error' | 'done';

/**
 * El enlace del correo puede llegar de tres formas según la configuración de Supabase:
 *  - implícito:  /admin/reset-password#access_token=…&refresh_token=…&type=recovery
 *  - PKCE:       /admin/reset-password?code=…
 *  - token hash: /admin/reset-password?token_hash=…&type=recovery
 * El cliente tiene `detectSessionInUrl: false`, así que la sesión se establece aquí a mano.
 */
const parseRecoveryParams = (hash: string, search: string) => {
  const h = new URLSearchParams(hash.replace(/^#/, ''));
  const q = new URLSearchParams(search);
  return {
    accessToken: h.get('access_token'),
    refreshToken: h.get('refresh_token'),
    code: q.get('code'),
    tokenHash: q.get('token_hash') || h.get('token_hash'),
    error: h.get('error_description') || q.get('error_description') || h.get('error') || q.get('error'),
  };
};

const EXPIRED_MSG = 'El enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de acceso.';

const AdminResetPassword = () => {
  usePageTitle('Restablecer contraseña');
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>('verifying');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const p = parseRecoveryParams(window.location.hash, window.location.search);
      try {
        if (p.error) throw new Error(p.error.replace(/\+/g, ' '));
        if (p.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: p.tokenHash, type: 'recovery' });
          if (error) throw error;
        } else if (p.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(p.code);
          if (error) throw error;
        } else if (p.accessToken && p.refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: p.accessToken, refresh_token: p.refreshToken });
          if (error) throw error;
        } else {
          // Sin parámetros (p. ej. recarga de la página): solo sirve si ya hay sesión.
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error(EXPIRED_MSG);
        }
        // Los tokens no deben quedar en la barra de direcciones ni en el historial.
        window.history.replaceState(null, '', window.location.pathname);
        if (!cancelled) setStage('ready');
      } catch (err) {
        if (cancelled) return;
        setErrorMsg(err instanceof Error && err.message ? err.message : EXPIRED_MSG);
        setStage('error');
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setSaving(false);
      toast.error(`No se pudo actualizar la contraseña: ${error.message}`);
      return;
    }
    // Sesión de recuperación cerrada: el usuario entra con su nueva contraseña.
    await supabase.auth.signOut();
    setSaving(false);
    setStage('done');
    toast.success('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
    navigate('/admin/login', { replace: true });
  };

  const inputClass = 'w-full pl-11 pr-12 py-3.5 bg-background/50 border-2 border-transparent focus:border-primary/50 focus:bg-background rounded-xl font-medium text-sm transition-all outline-none hover:bg-background/80 shadow-sm';

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F8FAFC] dark:bg-background overflow-hidden relative p-6">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-amber-500/20 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/70 dark:bg-card/60 backdrop-blur-2xl border border-white/40 dark:border-white/10 shadow-2xl rounded-3xl p-8 sm:p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-6 shadow-inner">
              <img src={logoImg} alt="Logo" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground mb-2">Nueva contraseña</h1>
            <p className="text-muted-foreground text-sm font-medium">Panel administrativo · Delicias Colombianas</p>
          </div>

          {stage === 'verifying' && (
            <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              Verificando el enlace…
            </div>
          )}

          {stage === 'error' && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
              <Link to="/admin/login" className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                Volver al acceso <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="text-xs text-center text-muted-foreground">
                En la pantalla de acceso pulsa "¿Olvidaste tu contraseña?" para recibir un enlace nuevo.
              </p>
            </div>
          )}

          {stage === 'done' && (
            <div className="flex flex-col items-center gap-3 py-6 text-sm text-muted-foreground">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              Contraseña actualizada. Redirigiendo…
            </div>
          )}

          {stage === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="new-password" className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Nueva contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Key className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  </div>
                  <input
                    id="new-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShow(!show)}
                    aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-bold text-foreground uppercase tracking-wider ml-1">Confirmar contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ShieldCheck className="h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                  </div>
                  <input
                    id="confirm-password"
                    type={show ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    minLength={6}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={saving}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-primary to-amber-500 font-bold text-primary-foreground shadow-lg hover:shadow-xl transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? <><Loader2 className="w-5 h-5 animate-spin" /> Guardando…</> : <>Guardar contraseña <ArrowRight className="w-5 h-5" /></>}
              </motion.button>

              <p className="text-xs text-center text-muted-foreground">
                <Link to="/admin/login" className="hover:text-primary transition-colors">Volver al acceso</Link>
              </p>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminResetPassword;
