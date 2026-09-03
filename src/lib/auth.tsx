import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User, AuthError } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export const ADMIN_USER_ID = "852e9748-fcf4-476e-ac38-7ba382c5b858";
export const ADMIN_EMAIL = "admin@techai.store";

export type UserProfile = {
  id: string;
  name: string | null;
  role?: "admin" | "customer" | string;
  created_at?: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<{ data: any; error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  updateProfile: (name: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      // 1. Try selecting id, name, role, created_at
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role, created_at")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
      } else {
        // Fallback query if role column is not yet in schema cache
        const { data: fallbackData } = await supabase
          .from("profiles")
          .select("id, name, created_at")
          .eq("id", userId)
          .maybeSingle();

        if (fallbackData) {
          setProfile(fallbackData as UserProfile);
        } else {
          setProfile(null);
        }
      }
    } catch {
      setProfile(null);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    // 1. Initial session load
    supabase.auth
      .getSession()
      .then(({ data: { session: initSession } }) => {
        setSession(initSession);
        setUser(initSession?.user ?? null);
        if (initSession?.user?.id) {
          void fetchProfile(initSession.user.id);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });

    // 2. Auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user?.id) {
        void fetchProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password });
    return res;
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || undefined,
        },
      },
    });

    if (res.error) {
      return res;
    }

    if (res.data?.session && res.data.user) {
      setSession(res.data.session);
      setUser(res.data.user);

      if (name) {
        const trimmedName = name.trim();
        const profilePayload: UserProfile = {
          id: res.data.user.id,
          name: trimmedName,
        };
        try {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert(profilePayload);

          if (!profileError) {
            setProfile(profilePayload);
          } else {
            console.warn("Profile upsert warning:", profileError);
            setProfile(profilePayload);
          }
        } catch (e) {
          console.warn("Could not upsert initial profile:", e);
          setProfile(profilePayload);
        }
      }
    }

    return res;
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    // Strict Defense-in-Depth validation:
    // 1. Must match official Admin User ID
    const isIdMatch = user.id === ADMIN_USER_ID;
    // 2. Must match official Admin Email
    const isEmailMatch = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    // 3. If role is available in profile, must not be customer
    const isRoleValid = !profile?.role || profile.role === "admin";

    return isIdMatch && isEmailMatch && isRoleValid;
  }, [user, profile]);

  const signOut = useCallback(async () => {
    const res = await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
    return res;
  }, []);

  const updateProfile = useCallback(
    async (newName: string) => {
      if (!user?.id) return { error: new Error("User not authenticated") };
      const trimmed = newName.trim();
      if (!trimmed) return { error: new Error("Name cannot be empty") };

      try {
        // Strictly only update name, never expose role mutation to client
        const { error } = await supabase
          .from("profiles")
          .update({ name: trimmed })
          .eq("id", user.id);

        if (!error) {
          setProfile((prev) => (prev ? { ...prev, name: trimmed } : { id: user.id, name: trimmed }));
        }
        return { error };
      } catch (err: any) {
        return { error: err };
      }
    },
    [user?.id],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isAdmin,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
