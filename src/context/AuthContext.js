import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [booting, setBooting] = useState(true);

useEffect(() => {
  let mounted = true;

  (async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!mounted) return;

      setSession(data.session ?? null);
    } catch (e) {
      console.log("getSession error:", e?.message || e);
      if (!mounted) return;

      setSession(null);
    } finally {
      if (mounted) setBooting(false);
    }
  })();

  const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
    setSession(newSession ?? null);
    // Safety: if auth event fires first, ensure booting is false
    setBooting(false);
  });

  return () => {
    mounted = false;
    sub?.subscription?.unsubscribe?.();
  };
}, []);


  const value = useMemo(() => {
    return {
      booting,
      session,
      user: session?.user ?? null,
      signOut: () => supabase.auth.signOut(),
    };
  }, [booting, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
