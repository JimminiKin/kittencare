import { getDB } from "@/db/database";
import type { EliminationEntry } from "@/domain/types";
import type { EliminationRepository } from "@/repositories/interfaces";

export class DexieEliminationRepository implements EliminationRepository {
  private get table() {
    return getDB().eliminations;
  }

  async getById(id: string): Promise<EliminationEntry | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<EliminationEntry[]> {
    return this.table.orderBy("timestamp").reverse().toArray();
  }

  async getByKitten(kittenId: string): Promise<EliminationEntry[]> {
    const all = await this.table.where("kittenId").equals(kittenId).toArray();
    return all.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<EliminationEntry[]> {
    const all = await this.getByKitten(kittenId);
    return all.filter((e) => e.timestamp >= since);
  }

  async create(entry: EliminationEntry): Promise<EliminationEntry> {
    await this.table.add(entry);
    return entry;
  }

  async update(
    id: string,
    partial: Partial<Omit<EliminationEntry, "id">>
  ): Promise<EliminationEntry> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`EliminationEntry ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
