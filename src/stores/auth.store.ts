"use client";

import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { setSessionContext } from "@/lib/current-session";
import { setUseCloudRepositories } from "@/db/index";
import { startRealtime, stopRealtime } from "@/lib/realtime";
import { useKittenStore } from "./kitten.store";
import { useCareStore } from "./care.store";

async function resolveHouseholdId(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) console.error("[auth] resolveHouseholdId error:", error);
  return data?.household_id ?? null;
}

async function ensureHousehold(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  let householdId = await resolveHouseholdId(userId);
  if (!householdId) {
    console.log("[auth] No household found, creating one");
    const { error } = await supabase.rpc("create_household", { p_name: "My Household" });
    if (error) { console.error("[auth] create_household error:", error); return null; }
    householdId = await resolveHouseholdId(userId);
  }
  return householdId;
}

let _activating = false;

async function activateCloud(userId: string): Promise<void> {
  if (_activating) return;
  _activating = true;

  try {
    const householdId = await ensureHousehold(userId);
    if (!householdId) {
      console.error("[auth] Could not resolve household — staying in local mode");
      return;
    }
    console.log("[auth] activateCloud household:", householdId);

    setSessionContext({ userId, householdId });
    setUseCloudRepositories(true);

    await useKittenStore.getState().fetchKittens();

    startRealtime(householdId, userId, {
      onKittensChange: () => { useKittenStore.getState().fetchKittens(); },
      onEventsChange: (kittenId, _table) => {
        const selectedId = useKittenStore.getState().selectedKittenId;
        if (!selectedId || (kittenId && kittenId !== selectedId)) return;
        const care = useCareStore.getState();
        care.loadFeedingsForKitten(selectedId);
        care.loadWeightsForKitten(selectedId);
        care.loadEliminationsForKitten(selectedId);
        care.loadMedicationsForKitten(selectedId);
        care.loadHealthForKitten(selectedId);
      },
    });
  } finally {
    _activating = false;
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
          activateCloud(session.user.id).catch(console.error);
        }
        if (event === "SIGNED_OUT") {
          stopRealtime();
          setSessionContext(null);
          setUseCloudRepositories(false);
          _activating = false;
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
