"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@/types/database";

interface UseAuthReturn {
  user: SupabaseUser | null;
  profile: User | null;
  isAdmin: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(
    async (userId: string) => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single<User>();

      if (!error && data) {
        setProfile(data);
      } else {
        setProfile(null);
      }
    },
    [supabase],
  );

  useEffect(() => {
    // Get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }

      // Check if this is a session-only login (auto-login was unchecked)
      if (currentUser && typeof sessionStorage !== "undefined") {
        const sessionOnly = sessionStorage.getItem("smegym_session_only");
        if (sessionOnly === "true") {
          // This flag was set during login; the session persists for this browser tab.
          // On a fresh page load (not a refresh within the same tab),
          // we rely on the session storage being cleared when the tab closes.
        }
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const isAdmin = profile?.role === "admin";

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem("smegym_session_only");
    }
  }, [supabase]);

  return {
    user,
    profile,
    isAdmin,
    isLoading,
    signOut,
  };
}
