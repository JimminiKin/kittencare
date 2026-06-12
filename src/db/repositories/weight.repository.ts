import { getDB } from "@/db/database";
import type { WeightEntry } from "@/domain/types";
import type { WeightRepository } from "@/repositories/interfaces";

export class DexieWeightRepository implements WeightRepository {
  private get table() {
    return getDB().weights;
  }

  async getById(id: string): Promise<WeightEntry | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<WeightEntry[]> {
    return this.table.orderBy("timestamp").reverse().toArray();
  }

  async getByKitten(kittenId: string): Promise<WeightEntry[]> {
    const all = await this.table.where("kittenId").equals(kittenId).toArray();
    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getLatestForKitten(kittenId: string): Promise<WeightEntry | undefined> {
    const all = await this.getByKitten(kittenId);
    return all[0];
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<WeightEntry[]> {
    const all = await this.getByKitten(kittenId);
    return all.filter((w) => w.timestamp >= since);
  }

  async create(entry: WeightEntry): Promise<WeightEntry> {
    await this.table.add(entry);
    return entry;
  }

  async update(
    id: string,
    partial: Partial<Omit<WeightEntry, "id">>
  ): Promise<WeightEntry> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`WeightEntry ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
