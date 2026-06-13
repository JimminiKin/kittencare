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
      useAuthStore.setState({ ready: true });
      return;
    }
    console.log("[auth] activateCloud household:", householdId);

    setSessionContext({ userId, householdId });
    setUseCloudRepositories(true);

    await useKittenStore.getState().fetchKittens();
    // Unlock the UI as soon as kittens are available; summaries stream in next
    useAuthStore.setState({ ready: true });
    useCareStore.getState().refreshSummaries().catch(console.error);

    startRealtime(householdId, userId, {
      onKittensChange: async () => {
        await useKittenStore.getState().fetchKittens();
        useCareStore.getState().refreshSummaries();
      },
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
  init: () => () => void;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (email: string, password: string, displayName: string) => Promise<string | null>;
  sendMagicLink: (email: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  ready: false,

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
          useCareStore.setState({ summaries: [], summariesLoaded: false });
          useKittenStore.setState({ kittens: [], loading: false });
          set({ user: null, ready: true });
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
