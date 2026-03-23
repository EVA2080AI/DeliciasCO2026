import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

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

const HARDCODED_ADMIN = 'admin@delicias.com';

// Returns true if the user has 'admin' role in user_roles table
const fetchIsAdmin = async (userId: string, email?: string): Promise<boolean> => {
  if (email === HARDCODED_ADMIN) return true;
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    if (error) {
      console.error('[useAuth] checkAdmin error:', error.message);
      return false;
    }
    return !!data;
  } catch (err) {
    console.error('[useAuth] Unexpected checkAdmin error:', err);
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // onAuthStateChange fires on every session change (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        // Wait for role check BEFORE setting loading=false so the redirect fires correctly
        const adminResult = await fetchIsAdmin(u.id, u.email);
        if (!mounted) return;
        setIsAdmin(adminResult);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    // Also check the current session on mount (handles page refresh)
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const adminResult = await fetchIsAdmin(u.id, u.email);
        if (!mounted) return;
        setIsAdmin(adminResult);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    // NOTE: onAuthStateChange will handle setting user + isAdmin automatically
    // after signInWithPassword resolves. No need to call fetchIsAdmin here.
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
