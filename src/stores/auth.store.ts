"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setSessionContext } from "@/lib/current-session";
import { setUseCloudRepositories } from "@/db/index";
import { startRealtime, stopRealtime } from "@/lib/realtime";
import { getQueryClient } from "@/lib/query-client";

interface HouseholdInfo { householdId: string; role: string }

async function resolveHousehold(userId: string): Promise<HouseholdInfo | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id, role")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[auth] resolveHousehold error:", error);
  return data ? { householdId: data.household_id, role: data.role as string } : null;
}

async function ensureHousehold(userId: string): Promise<HouseholdInfo | null> {
  const supabase = getSupabaseClient();
  let info = await resolveHousehold(userId);
  if (!info) {
    console.log("[auth] No household found, creating one");
    const { error } = await supabase.rpc("create_household", { p_name: "My Household" });
    if (error) { console.error("[auth] create_household error:", error); return null; }
    info = await resolveHousehold(userId);
  }
  return info;
}

let _activating = false;

async function activateCloud(userId: string): Promise<void> {
  if (_activating) return;
  _activating = true;

  try {
    const household = await ensureHousehold(userId);
    if (!household) {
      console.error("[auth] Could not resolve household — staying in local mode");
      useAuthStore.setState({ ready: true });
      return;
    }
    const { householdId, role } = household;
    console.log("[auth] activateCloud household:", householdId);

    setSessionContext({ userId, householdId });
    setUseCloudRepositories(true);
    useAuthStore.setState({ role: role as "owner" | "member", ready: true });

    startRealtime(householdId, userId);
  } catch (err) {
    console.error("[auth] activateCloud error:", err);
    useAuthStore.setState({ ready: true });
  } finally {
    _activating = false;
  }
}

interface AuthStore {
  user: User | null;
  ready: boolean;
  role: "owner" | "member" | null;
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  ready: false,
  role: null,

  init: () => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
          // Reset to skeleton while data loads; activateCloud sets ready: true when done
          set({ user: session.user, ready: false });
          activateCloud(session.user.id);
        } else if (!session?.user && event === "INITIAL_SESSION") {
          // If auth params are in the URL a SIGNED_IN is imminent — keep skeleton
          const href = typeof window !== "undefined" ? window.location.href : "";
          const hasPendingAuth = href.includes("code=") || href.includes("access_token");
          set({ user: null, ready: !hasPendingAuth });
        }
        if (event === "SIGNED_OUT") {
          stopRealtime();
          setSessionContext(null);
          setUseCloudRepositories(false);
          _activating = false;
          getQueryClient().clear();
          set({ user: null, ready: true, role: null });
        }
      }
    );
    return () => {
      subscription.unsubscribe();
      stopRealtime();
    };
  },

  signInWithPassword: async (email, password) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  },

  signUpWithPassword: async (email, password, displayName) => {
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return error?.message ?? null;
  },

  sendMagicLink: async (email) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });
    return error?.message ?? null;
  },

  signOut: async () => {
    await getSupabaseClient().auth.signOut();
    set({ user: null });
  },
}));
