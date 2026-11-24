import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegistrationData {
  full_name: string;
  age: number;
  gender: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, data: RegistrationData) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    }).catch(() => { if (active) setLoading(false); });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string, profile: RegistrationData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: profile },
    });

    if (error) {
      toast({ title: "Could not create account", description: error.message, variant: "destructive" });
      return { error };
    }

    if (!data.user || !data.session) {
      const pending = new Error("Your account needs email confirmation before sign in.");
      toast({ title: "Check your email", description: pending.message });
      return { error: pending };
    }

    const { error: profileError } = await supabase.from("user_profiles").upsert({
      user_id: data.user.id,
      full_name: profile.full_name,
      age: profile.age,
      gender: profile.gender,
    }, { onConflict: "user_id" });

    if (profileError) {
      toast({ title: "Account created", description: "Your profile could not be saved. Please try again in Settings.", variant: "destructive" });
      return { error: profileError };
    }

    toast({ title: "Account created", description: "Welcome to PulseGuard." });
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast({ title: "Could not sign in", description: error.message, variant: "destructive" });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast({ title: "Could not sign out", description: error.message, variant: "destructive" });
  };

  return <AuthContext.Provider value={{ user, session, signUp, signIn, signOut, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
