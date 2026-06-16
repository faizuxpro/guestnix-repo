"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { resetProductAnalytics } from "@/lib/analytics/product-client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    function handleProfileUpdated(event: Event) {
      const detail = (
        event as CustomEvent<{
          full_name?: string | null;
          avatar_url?: string | null;
        }>
      ).detail;

      setUser((current) => {
        if (!current) return current;

        return {
          ...current,
          user_metadata: {
            ...current.user_metadata,
            ...detail,
          },
        } as User;
      });
    }

    window.addEventListener("guestnix:profile-updated", handleProfileUpdated);

    return () => {
      window.removeEventListener(
        "guestnix:profile-updated",
        handleProfileUpdated
      );
    };
  }, []);

  const signOut = useCallback(async () => {
    resetProductAnalytics();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }, [supabase]);

  return { user, loading, signOut };
}
