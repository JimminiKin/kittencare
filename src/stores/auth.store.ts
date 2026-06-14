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
    .order("joined_at", { ascending: true });
  if (error) console.error("[auth] resolveHousehold error:", error);
  if (!data?.length) return null;
  // Prefer households the user was invited into (member role) over ones they
  // auto-created on first sign-in. For multiple owned households, ascending order
  // puts the oldest first — that is the one with actual content.
  const asMember = data.find((r) => r.role === "member");
  const row = asMember ?? data[0];
  return { householdId: row.household_id, role: row.role as string };
}

async function ensureHousehold(userId: string): Promise<HouseholdInfo | null> {
  const supabase = getSupabaseClient();
  const info = await resolveHousehold(userId);
  if (info) return info;
  console.log("[auth] No household found, creating one");
  // Use the UUID returned by the RPC directly — avoids a second round-trip and
  // the consistency window where an immediate re-query might still see 0 rows.
  const { data: newId, error } = await supabase.rpc("create_household", { p_name: "My Household" });
  if (error || !newId) { console.error("[auth] create_household error:", error); return null; }
  return { householdId: newId as string, role: "owner" };
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
  isRecovery: boolean;
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  resetPasswordForEmail: (email: string) => Promise<string | null>;
  updatePassword: (newPassword: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (updates: { avatar_url?: string; display_name?: string }) => Promise<string | null>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  ready: false,
  role: null,
  isRecovery: false,

  init: () => {
    const supabase = getSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" && session?.user) {
          set({ user: session.user, ready: true, isRecovery: true });
        } else if (session?.user && (event === "SIGNED_IN" || event === "INITIAL_SESSION")) {
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
          set({ user: null, ready: true, role: null, isRecovery: false });
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

  resetPasswordForEmail: async (email) => {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    });
    return error?.message ?? null;
  },

  updatePassword: async (newPassword) => {
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (!error) set({ isRecovery: false });
    return error?.message ?? null;
  },

  signOut: async () => {
    await getSupabaseClient().auth.signOut();
    set({ user: null });
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return "Not authenticated";
    const supabase = getSupabaseClient();

    const { error: dbError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (dbError) return dbError.message;

    // Mirror into user_metadata so components can read without a profiles fetch.
    const metaUpdates: Record<string, string> = {};
    if (updates.avatar_url !== undefined) metaUpdates.avatar_url = updates.avatar_url;
    if (updates.display_name !== undefined) metaUpdates.display_name = updates.display_name;

    const { data, error: authError } = await supabase.auth.updateUser({ data: metaUpdates });
    if (authError) return authError.message;
    if (data.user) set({ user: data.user });
    return null;
  },
}));
