import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabase/client";
import { getQueryClient } from "@/lib/query-client";
import { qk } from "@/lib/query-keys";
import { useKittenStore } from "@/stores/kitten.store";

let _channel: RealtimeChannel | null = null;

const TABLE_TO_QK: Record<string, (kittenId: string) => readonly string[]> = {
  feedings:                  qk.feedings,
  weight_entries:            qk.weights,
  elimination_entries:       qk.eliminations,
  medications:               qk.medications,
  medication_administrations: qk.admins,
  health_observations:       qk.health,
};

export function startRealtime(householdId: string, userId: string): void {
  stopRealtime();

  const supabase = getSupabaseClient();
  const qc = getQueryClient();

  const makeEventHandler = (table: string) => (payload: { eventType: string; new: any; old: any }) => {
    const row = payload.new ?? payload.old;
    // Skip own INSERTs — the optimistic cache update already handled them
    if (payload.eventType === "INSERT" && (row?.recorded_by === userId || row?.created_by === userId)) return;

    const kittenId: string | null = row?.kitten_id ?? null;
    const qkFn = TABLE_TO_QK[table];

    if (kittenId && qkFn) {
      // Only invalidate if the relevant hook is mounted (detail view for that kitten)
      const selectedId = useKittenStore.getState().selectedKittenId;
      if (!selectedId || kittenId === selectedId) {
        qc.invalidateQueries({ queryKey: qkFn(kittenId) });
      }
    }
    qc.invalidateQueries({ queryKey: qk.summaries() });
  };

  _channel = supabase
    .channel(`hh-${householdId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "kittens", filter: `household_id=eq.${householdId}` },
      (payload) => {
        const row = payload.new ?? payload.old;
        if (payload.eventType === "INSERT" && (row as any)?.created_by === userId) return;
        qc.invalidateQueries({ queryKey: qk.kittens() });
        qc.invalidateQueries({ queryKey: qk.summaries() });
      }
    )
    .on("postgres_changes", { event: "*", schema: "public", table: "feedings",                  filter: `household_id=eq.${householdId}` }, makeEventHandler("feedings"))
    .on("postgres_changes", { event: "*", schema: "public", table: "weight_entries",            filter: `household_id=eq.${householdId}` }, makeEventHandler("weight_entries"))
    .on("postgres_changes", { event: "*", schema: "public", table: "elimination_entries",       filter: `household_id=eq.${householdId}` }, makeEventHandler("elimination_entries"))
    .on("postgres_changes", { event: "*", schema: "public", table: "medications",               filter: `household_id=eq.${householdId}` }, makeEventHandler("medications"))
    .on("postgres_changes", { event: "*", schema: "public", table: "medication_administrations", filter: `household_id=eq.${householdId}` }, makeEventHandler("medication_administrations"))
    .on("postgres_changes", { event: "*", schema: "public", table: "health_observations",       filter: `household_id=eq.${householdId}` }, makeEventHandler("health_observations"))
    .subscribe();
}

export function stopRealtime(): void {
  if (_channel) {
    getSupabaseClient().removeChannel(_channel);
    _channel = null;
  }
}
