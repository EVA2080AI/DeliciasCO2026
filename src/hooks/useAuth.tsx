import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, AuthChangeEvent, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

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
  } catch (err: any) {
    if (err?.name === 'AbortError' && retries > 0) {
      console.warn(`[useAuth] fetchIsAdmin hit AbortError. Retrying... (${retries} attempts left)`);
      // Wait a short moment for the auth lock to release
      await new Promise(resolve => setTimeout(resolve, 200));
      return fetchIsAdmin(userId, retries - 1);
    }
    console.error('[useAuth] fetchIsAdmin unexpected error:', err);
    return false;
  }
};

// ─── Provider ─────────────────────────────────────────────────────────────────
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety net — if something hangs, unblock after 8s
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('[useAuth] Safety timeout triggered — forcing loading=false');
        setLoading(false);
      }
    }, 8000);

    // Single source of truth: onAuthStateChange handles ALL state transitions.
    // - INITIAL_SESSION fires on mount with the persisted session (replaces getSession())
    // - SIGNED_IN fires after signInWithPassword succeeds
    // - SIGNED_OUT fires after signOut()
    // - TOKEN_REFRESHED fires on auto-refresh
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        const u = session?.user ?? null;
        setUser(u);

        if (u) {
          // Fast-path bypass for the main admin accounts (restored to 8 PM state + qa added)
          if (
            u.email?.toLowerCase() === 'admin@delicias.com' ||
            u.email?.toLowerCase() === 'deliciascolombianas1985@gmail.com'
          ) {
            if (!mounted) return;
            setIsAdmin(true);
            setLoading(false);
            return;
          }

          // Fetch the admin role from DB for other users
          const adminResult = await fetchIsAdmin(u.id);
          if (!mounted) return;
          setIsAdmin(adminResult);
        } else {
          setIsAdmin(false);
        }

        // Only set loading=false AFTER role check is done.
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // signIn: purely delegates to Supabase. State is handled by onAuthStateChange above.
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
