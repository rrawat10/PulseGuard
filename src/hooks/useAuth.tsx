import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let hasInitialized = false;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only show toast for actual sign-in events after initialization
        if (event === 'SIGNED_IN' && hasInitialized) {
          // Check if we already showed this toast in this session
          const hasShownSignInToast = sessionStorage.getItem('hasShownSignInToast');
          if (!hasShownSignInToast) {
            toast({
              title: "Welcome!",
              description: "Successfully signed in to your account.",
            });
            sessionStorage.setItem('hasShownSignInToast', 'true');
          }
        }
        
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('hasShownSignInToast');
          toast({
            title: "Goodbye!",
            description: "Successfully signed out.",
          });
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      hasInitialized = true;
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signUp = async (email: string, password: string, userData: any) => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: userData
      }
    });

    if (error) {
      toast({
        title: "Sign Up Error",
        description: error.message,
        variant: "destructive"
      });
    } else if (data.user) {
      // Create user profile in the database
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          full_name: userData.full_name,
          age: userData.age,
          gender: userData.gender,
          enable_doctor_reports: userData.enable_email_reports
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }

      // Create emergency contacts
      if (userData.emergency_contacts && userData.emergency_contacts.length > 0) {
        const emergencyContacts = userData.emergency_contacts
          .filter((contact: any) => contact.name && contact.phone)
          .map((contact: any) => ({
            user_id: data.user.id,
            name: contact.name,
            phone: contact.phone,
            relation: contact.relation || 'Other'
          }));

        if (emergencyContacts.length > 0) {
          const { error: contactError } = await supabase
            .from('emergency_contacts')
            .insert(emergencyContacts);

          if (contactError) {
            console.error('Error creating emergency contacts:', contactError);
          }
        }
      }

      // Create doctor details if provided
      if (userData.doctor_name && userData.doctor_email) {
        const { error: doctorError } = await supabase
          .from('doctor_details')
          .insert({
            user_id: data.user.id,
            name: userData.doctor_name,
            specialization: userData.doctor_specialization || 'General Practitioner',
            email: userData.doctor_email
          });

        if (doctorError) {
          console.error('Error creating doctor details:', doctorError);
        }
      }

      toast({
        title: "Check your email",
        description: "Please check your email for a confirmation link.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      toast({
        title: "Sign In Error",
        description: error.message,
        variant: "destructive"
      });
    }

    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Sign Out Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      signUp,
      signIn,
      signOut,
      loading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};