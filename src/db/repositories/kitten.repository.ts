import { getDB } from "@/db/database";
import type { Kitten } from "@/domain/types";
import type { KittenRepository } from "@/repositories/interfaces";

export class DexieKittenRepository implements KittenRepository {
  private get table() {
    return getDB().kittens;
  }

  async getById(id: string): Promise<Kitten | undefined> {
    return this.table.get(id);
  }

  async getAll(): Promise<Kitten[]> {
    return this.table.orderBy("createdAt").reverse().toArray();
  }

  async getByStatus(status: Kitten["status"]): Promise<Kitten[]> {
    return this.table.where("status").equals(status).toArray();
  }

  async getActive(): Promise<Kitten[]> {
    return this.getByStatus("active");
  }

  async create(kitten: Kitten): Promise<Kitten> {
    await this.table.add(kitten);
    return kitten;
  }

  async update(id: string, partial: Partial<Omit<Kitten, "id">>): Promise<Kitten> {
    await this.table.update(id, partial);
    const updated = await this.table.get(id);
    if (!updated) throw new Error(`Kitten ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
  }
}
