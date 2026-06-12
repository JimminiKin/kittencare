import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { Kitten } from "@/domain/types";
import type { KittenRepository } from "@/repositories/interfaces";
import { rowToKitten, isoDate } from "./mappers";

export class SupabaseKittenRepository implements KittenRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<Kitten | undefined> {
    const { data } = await this.db.from("kittens").select("*").eq("id", id).single();
    return data ? rowToKitten(data) : undefined;
  }

  async getAll(): Promise<Kitten[]> {
    const { data } = await this.db
      .from("kittens")
      .select("*")
      .eq("household_id", this.hid)
      .order("created_at", { ascending: false });
    return (data ?? []).map(rowToKitten);
  }

  async getByStatus(status: Kitten["status"]): Promise<Kitten[]> {
    const { data } = await this.db
      .from("kittens")
      .select("*")
      .eq("household_id", this.hid)
      .eq("status", status);
    return (data ?? []).map(rowToKitten);
  }

  async getActive(): Promise<Kitten[]> {
    return this.getByStatus("active");
  }

  async create(k: Kitten): Promise<Kitten> {
    const { userId } = getSessionContext();
    await this.db.from("kittens").insert({
      id: k.id,
      household_id: this.hid,
      created_by: userId,
      name: k.name,
      photo: k.photo ?? null,
      birth_date: isoDate(k.birthDate),
      estimated_age_days: k.estimatedAgeDays ?? null,
      sex: k.sex ?? null,
      intake_date: isoDate(k.intakeDate),
      status: k.status,
      notes: k.notes ?? null,
    });
    return k;
  }

  async update(id: string, partial: Partial<Omit<Kitten, "id">>): Promise<Kitten> {
    const row: Record<string, unknown> = {};
    if (partial.name !== undefined) row.name = partial.name;
    if (partial.photo !== undefined) row.photo = partial.photo ?? null;
    if (partial.birthDate !== undefined) row.birth_date = isoDate(partial.birthDate);
    if (partial.estimatedAgeDays !== undefined) row.estimated_age_days = partial.estimatedAgeDays ?? null;
    if (partial.sex !== undefined) row.sex = partial.sex ?? null;
    if (partial.intakeDate !== undefined) row.intake_date = isoDate(partial.intakeDate);
    if (partial.status !== undefined) row.status = partial.status;
    if (partial.notes !== undefined) row.notes = partial.notes ?? null;
    await this.db.from("kittens").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Kitten ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("kittens").delete().eq("id", id);
  }
}
