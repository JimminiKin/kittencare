import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { Feeding } from "@/domain/types";
import type { FeedingRepository } from "@/repositories/interfaces";
import { rowToFeeding } from "./mappers";

export class SupabaseFeedingRepository implements FeedingRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<Feeding | undefined> {
    const { data } = await this.db.from("feedings").select("*").eq("id", id).single();
    return data ? rowToFeeding(data) : undefined;
  }

  async getAll(): Promise<Feeding[]> {
    const { data } = await this.db
      .from("feedings")
      .select("*")
      .eq("household_id", this.hid)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToFeeding);
  }

  async getByKitten(kittenId: string): Promise<Feeding[]> {
    const { data } = await this.db
      .from("feedings")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToFeeding);
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<Feeding[]> {
    const { data } = await this.db
      .from("feedings")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToFeeding);
  }

  async getRecentForKitten(kittenId: string, limit: number): Promise<Feeding[]> {
    const { data } = await this.db
      .from("feedings")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false })
      .limit(limit);
    return (data ?? []).map(rowToFeeding);
  }

  async getForKittenInRange(kittenId: string, start: Date, end: Date): Promise<Feeding[]> {
    const { data } = await this.db
      .from("feedings")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", start.toISOString())
      .lte("timestamp", end.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToFeeding);
  }

  async create(f: Feeding): Promise<Feeding> {
    const { userId } = getSessionContext();
    await this.db.from("feedings").insert({
      id: f.id,
      kitten_id: f.kittenId,
      household_id: this.hid,
      recorded_by: userId,
      timestamp: f.timestamp.toISOString(),
      food_type: f.foodType ?? "formula",
      method: f.method ?? null,
      formula_type: f.formulaType ?? null,
      amount_offered_ml: f.amountOfferedMl ?? null,
      amount_consumed_ml: f.amountConsumedMl ?? null,
      amount_consumed_grams: f.amountConsumedGrams ?? null,
      notes: f.notes ?? null,
    });
    return { ...f, recordedBy: userId };
  }

  async update(id: string, partial: Partial<Omit<Feeding, "id">>): Promise<Feeding> {
    const row: Record<string, unknown> = {};
    if (partial.timestamp) row.timestamp = partial.timestamp.toISOString();
    if (partial.foodType !== undefined) row.food_type = partial.foodType ?? null;
    if (partial.method !== undefined) row.method = partial.method ?? null;
    if (partial.formulaType !== undefined) row.formula_type = partial.formulaType ?? null;
    if (partial.amountOfferedMl !== undefined) row.amount_offered_ml = partial.amountOfferedMl ?? null;
    if (partial.amountConsumedMl !== undefined) row.amount_consumed_ml = partial.amountConsumedMl ?? null;
    if (partial.amountConsumedGrams !== undefined) row.amount_consumed_grams = partial.amountConsumedGrams ?? null;
    if (partial.notes !== undefined) row.notes = partial.notes ?? null;
    await this.db.from("feedings").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Feeding ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("feedings").delete().eq("id", id);
  }
}
