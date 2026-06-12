import Dexie, { type Table } from "dexie";
import type {
  Kitten,
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";

export class KittenTrackDB extends Dexie {
  kittens!: Table<Kitten, string>;
  feedings!: Table<Feeding, string>;
  weights!: Table<WeightEntry, string>;
  eliminations!: Table<EliminationEntry, string>;
  medications!: Table<Medication, string>;
  administrations!: Table<MedicationAdministration, string>;
  health!: Table<HealthObservation, string>;

  constructor() {
    super("KittenTrackDB");

    this.version(1).stores({
      kittens: "id, status, createdAt",
      feedings: "id, kittenId, timestamp",
      weights: "id, kittenId, timestamp",
      eliminations: "id, kittenId, timestamp",
      medications: "id, kittenId, startDate",
      administrations: "id, medicationId, kittenId, timestamp",
      health: "id, kittenId, timestamp",
    });
  }
}

// Singleton instance
let _db: KittenTrackDB | null = null;

export function getDB(): KittenTrackDB {
  if (!_db) {
    _db = new KittenTrackDB();
  }
  return _db;
}
