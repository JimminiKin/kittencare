"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

async function ensureHousehold() {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("household_members")
    .select("household_id")
    .limit(1);
  if (!data || data.length === 0) {
    await supabase.rpc("create_household", { p_name: "My Household" });
  }
}

interface AuthStore {
  user: User | null;
  loading: boolean;
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,

  init: () => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        set({ user: session?.user ?? null, loading: false });
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          ensureHousehold().catch(console.error);
        }
      }
    );
    return () => subscription.unsubscribe();
  },

  signInWithPassword: async (email, password) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUpWithPassword: async (email, password, displayName) => {
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    return error?.message ?? null;
  },

  sendMagicLink: async (email) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    return error?.message ?? null;
  },

  signOut: async () => {
    await getSupabaseClient().auth.signOut();
    set({ user: null });
  },
}));
