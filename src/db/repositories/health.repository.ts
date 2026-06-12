import { getDB } from "@/db/database";
import type { HealthObservation } from "@/domain/types";
import type { HealthObservationRepository } from "@/repositories/interfaces";

export class DexieHealthObservationRepository
  implements HealthObservationRepository
{
  private get table() {
    return getDB().health;
  }

  async getById(id: string): Promise<HealthObservation | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<HealthObservation[]> {
    return this.table.orderBy("timestamp").reverse().toArray();
  }

  async getByKitten(kittenId: string): Promise<HealthObservation[]> {
    const all = await this.table
      .where("kittenId")
      .equals(kittenId)
      .toArray();
    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<HealthObservation[]> {
    const all = await this.getByKitten(kittenId);
    return all.filter((h) => h.timestamp >= since);
  }

  async create(obs: HealthObservation): Promise<HealthObservation> {
    await this.table.add(obs);
    return obs;
  }

  async update(
    id: string,
    partial: Partial<Omit<HealthObservation, "id">>
  ): Promise<HealthObservation> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`HealthObservation ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
