import { useEffect, useState, useRef, useCallback, useMemo, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => ({ error: null }),
});

export const useAuth = () => useContext(AuthContext);

/**
 * Cuentas principales con acceso directo al panel (decisión del dueño). OJO: esto NO otorga
 * permisos RLS (storage, tablas): para eso el usuario necesita su fila en `user_roles`.
 */
const BYPASS_EMAILS = new Set(['admin@delicias.com', 'deliciascolombianas1985@gmail.com']);

// ─── DB check: does this userId have role='admin' in user_roles? ───────────────
const fetchIsAdmin = async (userId: string, retries = 3): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('[useAuth] fetchIsAdmin error:', error.message);
      return false;
    }
    return !!data;
  } catch (err: unknown) {
    // El lock de auth de supabase-js puede abortar la consulta justo tras un cambio de sesión.
    if ((err as { name?: string } | null)?.name === 'AbortError' && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return fetchIsAdmin(userId, retries - 1);
    }
    console.error('[useAuth] fetchIsAdmin unexpected error:', err);
    return false;
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  // El timer de seguridad lee este ref: el closure del efecto vería `loading` siempre en true.
  const loadingRef = useRef(true);
  const lastUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const setLoadingState = (value: boolean) => {
      loadingRef.current = value;
      if (mounted) setLoading(value);
    };

    // Safety net — si la verificación se cuelga (red, lock de auth), desbloquear la UI a los 8s.
    const safetyTimer = setTimeout(() => {
      if (mounted && loadingRef.current) {
        console.error('[useAuth] La verificación de sesión tardó más de 8s; se desbloquea la interfaz.');
        setLoadingState(false);
      }
    }, 8000);

    // Single source of truth: onAuthStateChange handles ALL state transitions.
    // - INITIAL_SESSION fires on mount with the persisted session (replaces getSession())
    // - SIGNED_IN fires after signInWithPassword succeeds
    // - SIGNED_OUT fires after signOut()
    // - TOKEN_REFRESHED / USER_UPDATED fire for the same user (no role re-check needed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        const u = session?.user ?? null;
        setUser(u);

        if (!u) {
          // INITIAL_SESSION sin sesión o SIGNED_OUT: desbloquear de inmediato.
          lastUserIdRef.current = null;
          setIsAdmin(false);
          setLoadingState(false);
          return;
        }

        // Mismo usuario ya verificado (refresh de token, cambio de contraseña): nada que rehacer.
        if (u.id === lastUserIdRef.current && !loadingRef.current) return;
        lastUserIdRef.current = u.id;

        if (BYPASS_EMAILS.has((u.email ?? '').toLowerCase())) {
          setIsAdmin(true);
          setLoadingState(false);
          return;
        }

        // Usuario nuevo: mientras se consulta el rol, `loading` en true para que ninguna pantalla
        // lo trate como "autenticado sin permisos" antes de tiempo.
        setLoadingState(true);
        const adminResult = await fetchIsAdmin(u.id);
        if (!mounted) return;
        setIsAdmin(adminResult);
        setLoadingState(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  // signIn: purely delegates to Supabase. State is handled by onAuthStateChange above.
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: (error as Error | null) ?? null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('[useAuth] signOut error:', error.message);
    return { error: (error as Error | null) ?? null };
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin, loading, signIn, signOut }),
    [user, isAdmin, loading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
