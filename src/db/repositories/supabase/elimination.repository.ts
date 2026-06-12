import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { EliminationEntry } from "@/domain/types";
import type { EliminationRepository } from "@/repositories/interfaces";
import { rowToElimination } from "./mappers";

export class SupabaseEliminationRepository implements EliminationRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<EliminationEntry | undefined> {
    const { data } = await this.db.from("elimination_entries").select("*").eq("id", id).single();
    return data ? rowToElimination(data) : undefined;
  }

  async getAll(): Promise<EliminationEntry[]> {
    const { data } = await this.db
      .from("elimination_entries")
      .select("*")
      .eq("household_id", this.hid)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToElimination);
  }

  async getByKitten(kittenId: string): Promise<EliminationEntry[]> {
    const { data } = await this.db
      .from("elimination_entries")
      .select("*")
      .eq("kitten_id", kittenId)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToElimination);
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<EliminationEntry[]> {
    const { data } = await this.db
      .from("elimination_entries")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToElimination);
  }

  async create(e: EliminationEntry): Promise<EliminationEntry> {
    const { userId } = getSessionContext();
    await this.db.from("elimination_entries").insert({
      id: e.id,
      kitten_id: e.kittenId,
      household_id: this.hid,
      recorded_by: userId,
      timestamp: e.timestamp.toISOString(),
      pee: e.pee,
      poo: e.poo,
      poo_consistency: e.pooConsistency ?? null,
      poo_color: e.pooColor ?? null,
      notes: e.notes ?? null,
    });
    return { ...e, recordedBy: userId };
  }

  async update(id: string, partial: Partial<Omit<EliminationEntry, "id">>): Promise<EliminationEntry> {
    const row: Record<string, unknown> = {};
    if (partial.timestamp) row.timestamp = partial.timestamp.toISOString();
    if (partial.pee !== undefined) row.pee = partial.pee;
    if (partial.poo !== undefined) row.poo = partial.poo;
    if (partial.pooConsistency !== undefined) row.poo_consistency = partial.pooConsistency ?? null;
    if (partial.pooColor !== undefined) row.poo_color = partial.pooColor ?? null;
    if (partial.notes !== undefined) row.notes = partial.notes ?? null;
    await this.db.from("elimination_entries").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`EliminationEntry ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("elimination_entries").delete().eq("id", id);
  }
}
