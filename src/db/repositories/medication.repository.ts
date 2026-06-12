import { getDB } from "@/db/database";
import type { Medication, MedicationAdministration } from "@/domain/types";
import type {
  MedicationRepository,
  MedicationAdministrationRepository,
} from "@/repositories/interfaces";

export class DexieMedicationRepository implements MedicationRepository {
  private get table() {
    return getDB().medications;
  }

  async getById(id: string): Promise<Medication | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<Medication[]> {
    return this.table.orderBy("startDate").reverse().toArray();
  }

  async getByKitten(kittenId: string): Promise<Medication[]> {
    return this.table.where("kittenId").equals(kittenId).toArray();
  }

  async getActiveForKitten(kittenId: string): Promise<Medication[]> {
    const meds = await this.getByKitten(kittenId);
    const now = new Date();
    return meds.filter(
      (m) => m.startDate <= now && (!m.endDate || m.endDate >= now)
    );
  }

  async create(medication: Medication): Promise<Medication> {
    await this.table.add(medication);
    return medication;
  }

  async update(
    id: string,
    partial: Partial<Omit<Medication, "id">>
  ): Promise<Medication> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`Medication ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}

export class DexieMedicationAdministrationRepository
  implements MedicationAdministrationRepository
{
  private get table() {
    return getDB().administrations;
  }

  async getById(id: string): Promise<MedicationAdministration | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<MedicationAdministration[]> {
    return this.table.orderBy("timestamp").reverse().toArray();
  }

  async getByMedication(
    medicationId: string
  ): Promise<MedicationAdministration[]> {
    const all = await this.table
      .where("medicationId")
      .equals(medicationId)
      .toArray();
    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLatestForMedication(
    medicationId: string
  ): Promise<MedicationAdministration | undefined> {
    const all = await this.getByMedication(medicationId);
    return all[0];
  }

  async getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<MedicationAdministration[]> {
    const all = await this.table
      .where("kittenId")
      .equals(kittenId)
      .toArray();
    return all.filter((a) => a.timestamp >= since);
  }

  async create(
    admin: MedicationAdministration
  ): Promise<MedicationAdministration> {
    await this.table.add(admin);
    return admin;
  }

  async update(
    id: string,
    partial: Partial<Omit<MedicationAdministration, "id">>
  ): Promise<MedicationAdministration> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated)
      throw new Error(`MedicationAdministration ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
