import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { HealthObservation } from "@/domain/types";
import type { HealthObservationRepository } from "@/repositories/interfaces";
import { rowToHealth } from "./mappers";

export class SupabaseHealthObservationRepository implements HealthObservationRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<HealthObservation | undefined> {
    const { data } = await this.db
      .from("health_observations")
      .select("*")
      .eq("id", id)
      .single();
    return data ? rowToHealth(data) : undefined;
  }

  async getAll(): Promise<HealthObservation[]> {
    const { data } = await this.db
      .from("health_observations")
      .select("*")
      .eq("household_id", this.hid)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToHealth);
  }

  async getByKitten(kittenId: string): Promise<HealthObservation[]> {
    const { data } = await this.db
      .from("health_observations")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToHealth);
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<HealthObservation[]> {
    const { data } = await this.db
      .from("health_observations")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToHealth);
  }

  async create(h: HealthObservation): Promise<HealthObservation> {
    const { userId } = getSessionContext();
    await this.db.from("health_observations").insert({
      id: h.id,
      kitten_id: h.kittenId,
      household_id: this.hid,
      recorded_by: userId,
      timestamp: h.timestamp.toISOString(),
      energy: h.energy,
      hydration: h.hydration,
      appetite: h.appetite,
      temperature: h.temperature ?? null,
      notes: h.notes ?? null,
    });
    return { ...h, recordedBy: userId };
  }

  async update(
    id: string,
    partial: Partial<Omit<HealthObservation, "id">>
  ): Promise<HealthObservation> {
    const row: Record<string, unknown> = {};
    if (partial.timestamp) row.timestamp = partial.timestamp.toISOString();
    if (partial.energy !== undefined) row.energy = partial.energy;
    if (partial.hydration !== undefined) row.hydration = partial.hydration;
    if (partial.appetite !== undefined) row.appetite = partial.appetite;
    if (partial.temperature !== undefined) row.temperature = partial.temperature ?? null;
    if (partial.notes !== undefined) row.notes = partial.notes ?? null;
    await this.db.from("health_observations").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`HealthObservation ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("health_observations").delete().eq("id", id);
  }
}
