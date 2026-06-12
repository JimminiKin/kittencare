import { getDB } from "@/db/database";
import type { Feeding } from "@/domain/types";
import type { FeedingRepository } from "@/repositories/interfaces";

export class DexieFeedingRepository implements FeedingRepository {
  private get table() {
    return getDB().feedings;
  }

  async getById(id: string): Promise<Feeding | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<Feeding[]> {
    return this.table.orderBy("timestamp").reverse().toArray();
  }

  async getByKitten(kittenId: string): Promise<Feeding[]> {
    return this.table
      .where("kittenId")
      .equals(kittenId)
      .reverse()
      .sortBy("timestamp")
      .then((r) => r.reverse());
  }

  async getByKittenSince(kittenId: string, since: Date): Promise<Feeding[]> {
    const all = await this.getByKitten(kittenId);
    return all.filter((f) => f.timestamp >= since);
  }

  async getRecentForKitten(kittenId: string, limit: number): Promise<Feeding[]> {
    const all = await this.getByKitten(kittenId);
    return all.slice(0, limit);
  }

  async getForKittenInRange(
    kittenId: string,
    start: Date,
    end: Date
  ): Promise<Feeding[]> {
    const all = await this.getByKitten(kittenId);
    return all.filter((f) => f.timestamp >= start && f.timestamp <= end);
  }

  async create(feeding: Feeding): Promise<Feeding> {
    await this.table.add(feeding);
    return feeding;
  }

  async update(id: string, partial: Partial<Omit<Feeding, "id">>): Promise<Feeding> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`Feeding ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
