import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import type { Medication, MedicationAdministration } from "@/domain/types";
import type {
  MedicationRepository,
  MedicationAdministrationRepository,
} from "@/repositories/interfaces";
import { rowToMedication, rowToAdministration } from "./mappers";

export class SupabaseMedicationRepository implements MedicationRepository {
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<Medication | undefined> {
    const { data } = await this.db.from("medications").select("*").eq("id", id).single();
    return data ? rowToMedication(data) : undefined;
  }

  async getAll(): Promise<Medication[]> {
    const { data } = await this.db
      .from("medications")
      .select("*")
      .eq("household_id", this.hid);
    return (data ?? []).map(rowToMedication);
  }

  async getByKitten(kittenId: string): Promise<Medication[]> {
    const { data } = await this.db
      .from("medications")
      .select("*")
      .eq("kitten_id", kittenId);
    return (data ?? []).map(rowToMedication);
  }

  async getActiveForKitten(kittenId: string): Promise<Medication[]> {
    const now = new Date().toISOString();
    const { data } = await this.db
      .from("medications")
      .select("*")
      .eq("kitten_id", kittenId)
      .or(`end_date.is.null,end_date.gt.${now}`);
    return (data ?? []).map(rowToMedication);
  }

  async create(m: Medication): Promise<Medication> {
    const { userId } = getSessionContext();
    await this.db.from("medications").insert({
      id: m.id,
      kitten_id: m.kittenId,
      household_id: this.hid,
      created_by: userId,
      name: m.name,
      dosage: m.dosage,
      frequency_hours: m.frequencyHours,
      start_date: m.startDate.toISOString(),
      end_date: m.endDate?.toISOString() ?? null,
      notes: m.notes ?? null,
    });
    return m;
  }

  async update(id: string, partial: Partial<Omit<Medication, "id">>): Promise<Medication> {
    const row: Record<string, unknown> = {};
    if (partial.name !== undefined) row.name = partial.name;
    if (partial.dosage !== undefined) row.dosage = partial.dosage;
    if (partial.frequencyHours !== undefined) row.frequency_hours = partial.frequencyHours;
    if (partial.startDate) row.start_date = partial.startDate.toISOString();
    if (partial.endDate !== undefined) row.end_date = partial.endDate?.toISOString() ?? null;
    if (partial.notes !== undefined) row.notes = partial.notes ?? null;
    await this.db.from("medications").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Medication ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("medications").delete().eq("id", id);
  }
}

export class SupabaseMedicationAdministrationRepository
  implements MedicationAdministrationRepository
{
  private get db() { return getSupabaseClient(); }
  private get hid() { return getSessionContext().householdId; }

  async getById(id: string): Promise<MedicationAdministration | undefined> {
    const { data } = await this.db
      .from("medication_administrations")
      .select("*")
      .eq("id", id)
      .single();
    return data ? rowToAdministration(data) : undefined;
  }

  async getAll(): Promise<MedicationAdministration[]> {
    const { data } = await this.db
      .from("medication_administrations")
      .select("*")
      .eq("household_id", this.hid)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToAdministration);
  }

  async getByMedication(medicationId: string): Promise<MedicationAdministration[]> {
    const { data } = await this.db
      .from("medication_administrations")
      .select("*")
      .eq("medication_id", medicationId)
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToAdministration);
  }

  async getLatestForMedication(
    medicationId: string
  ): Promise<MedicationAdministration | undefined> {
    const { data } = await this.db
      .from("medication_administrations")
      .select("*")
      .eq("medication_id", medicationId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();
    return data ? rowToAdministration(data) : undefined;
  }

  async getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<MedicationAdministration[]> {
    const { data } = await this.db
      .from("medication_administrations")
      .select("*")
      .eq("kitten_id", kittenId)
      .gte("timestamp", since.toISOString())
      .order("timestamp", { ascending: false });
    return (data ?? []).map(rowToAdministration);
  }

  async create(a: MedicationAdministration): Promise<MedicationAdministration> {
    const { userId } = getSessionContext();
    await this.db.from("medication_administrations").insert({
      id: a.id,
      medication_id: a.medicationId,
      kitten_id: a.kittenId,
      household_id: this.hid,
      recorded_by: userId,
      timestamp: a.timestamp.toISOString(),
    });
    return { ...a, recordedBy: userId };
  }

  async update(
    id: string,
    partial: Partial<Omit<MedicationAdministration, "id">>
  ): Promise<MedicationAdministration> {
    const row: Record<string, unknown> = {};
    if (partial.timestamp) row.timestamp = partial.timestamp.toISOString();
    await this.db.from("medication_administrations").update(row).eq("id", id);
    const updated = await this.getById(id);
    if (!updated) throw new Error(`Administration ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.from("medication_administrations").delete().eq("id", id);
  }
}
