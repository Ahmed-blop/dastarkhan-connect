import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isGuest: boolean;
  setGuest: (v: boolean) => void;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuestState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("dk_guest") === "1";
  });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const setGuest = (v: boolean) => {
    setIsGuestState(v);
    if (typeof window !== "undefined") {
      if (v) localStorage.setItem("dk_guest", "1");
      else localStorage.removeItem("dk_guest");
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setGuest(false);
  };

  return (
    <Ctx.Provider value={{ user, session, loading, isGuest, setGuest, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
