import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { isAllowedAdminEmail } from '../lib/adminEmail';
import { supabase } from '../lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function normalizeSession(session: Session | null): Promise<Session | null> {
  if (!session) return null;

  let email = session.user?.email?.trim().toLowerCase() ?? '';
  if (!email) {
    const { data } = await supabase.auth.getUser();
    email = data.user?.email?.trim().toLowerCase() ?? '';
  }

  if (!email || !isAllowedAdminEmail(email)) {
    return null;
  }
  return session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      void normalizeSession(data.session).then((next) => {
        if (!mounted) return;
        setSession(next);
        setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      void normalizeSession(s).then((next) => {
        if (!mounted) return;
        setSession(next);
        setLoading(false);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ session, loading, signOut }),
    [session, loading, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
