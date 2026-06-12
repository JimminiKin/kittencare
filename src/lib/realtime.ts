import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase/client";

let _channel: RealtimeChannel | null = null;

type RefreshCallbacks = {
  onKittensChange: () => void;
  onEventsChange: (kittenId: string | null, table: string) => void;
};

export function startRealtime(
  householdId: string,
  userId: string,
  callbacks: RefreshCallbacks
): void {
  stopRealtime();

  const supabase = getSupabaseClient();

  const makeEventHandler =
    (table: string) => (payload: { eventType: string; new: any; old: any }) => {
      const row = payload.new ?? payload.old;
      // Skip INSERTs from the current session — store is already updated optimistically
      if (payload.eventType === "INSERT" && row?.recorded_by === userId) return;
      if (payload.eventType === "INSERT" && row?.created_by === userId) return;
      callbacks.onEventsChange(row?.kitten_id ?? null, table);
    };

  _channel = supabase
    .channel(`hh-${householdId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "kittens",
        filter: `household_id=eq.${householdId}`,
      },
      (payload) => {
        const row = payload.new ?? payload.old;
        if (payload.eventType === "INSERT" && (row as any)?.created_by === userId) return;
        callbacks.onKittensChange();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "feedings", filter: `household_id=eq.${householdId}` },
      makeEventHandler("feedings")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "weight_entries", filter: `household_id=eq.${householdId}` },
      makeEventHandler("weight_entries")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "elimination_entries", filter: `household_id=eq.${householdId}` },
      makeEventHandler("elimination_entries")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "medications", filter: `household_id=eq.${householdId}` },
      makeEventHandler("medications")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "medication_administrations", filter: `household_id=eq.${householdId}` },
      makeEventHandler("medication_administrations")
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "health_observations", filter: `household_id=eq.${householdId}` },
      makeEventHandler("health_observations")
    )
    .subscribe();
}

export function stopRealtime(): void {
  if (_channel) {
    getSupabaseClient().removeChannel(_channel);
    _channel = null;
  }
}
