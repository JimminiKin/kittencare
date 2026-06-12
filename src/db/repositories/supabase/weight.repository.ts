import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { WeightEntry } from "@/domain/types";
import type { WeightRepository } from "@/repositories/interfaces";
import { rowToWeight } from "./mappers";

export class SupabaseWeightRepository implements WeightRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<WeightEntry | undefined> {
    const { data } = await this.db.from("weight_entries").select("*").eq("id", id).single();
    return data ? rowToWeight(data) : undefined;
  }

  async getAll(): Promise<WeightEntry[]> {
    const { data } = await this.db
      .from("weight_entries")
      .select("*")
      .eq("household_id", this.hid)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToWeight);
  }

  async getByKitten(kittenId: string): Promise<WeightEntry[]> {
    const { data } = await this.db
      .from("weight_entries")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToWeight);
  }

  async getLatestForKitten(kittenId: string): Promise<WeightEntry | undefined> {
    const { data } = await this.db
      .from("weight_entries")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();
    return data ? rowToWeight(data) : undefined;
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<WeightEntry[]> {
    const { data } = await this.db
      .from("weight_entries")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToWeight);
  }

  async create(w: WeightEntry): Promise<WeightEntry> {
    const { userId } = getSessionContext();
    await this.db.from("weight_entries").insert({
      id: w.id,
      kitten_id: w.kittenId,
      household_id: this.hid,
      recorded_by: userId,
      timestamp: w.timestamp.toISOString(),
      weight_grams: w.weightGrams,
    });
    return { ...w, recordedBy: userId };
  }

  async update(id: string, partial: Partial<Omit<WeightEntry, "id">>): Promise<WeightEntry> {
    const row: Record<string, unknown> = {};
    if (partial.timestamp) row.timestamp = partial.timestamp.toISOString();
    if (partial.weightGrams !== undefined) row.weight_grams = partial.weightGrams;
    await this.db.from("weight_entries").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`WeightEntry ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("weight_entries").delete().eq("id", id);
  }
}
