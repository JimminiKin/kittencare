import type {
  Kitten,
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";

// Generic base repository interface — designed to support future cloud sync
export interface Repository<T extends { id: string }> {
  getById(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: string, partial: Partial<Omit<T, "id">>): Promise<T>;
  delete(id: string): Promise<void>;
}

// ── Kitten ───────────────────────────────────────────────────────────────────

export interface KittenRepository extends Repository<Kitten> {
  getByStatus(status: Kitten["status"]): Promise<Kitten[]>;
  getActive(): Promise<Kitten[]>;
}

// ── Feeding ──────────────────────────────────────────────────────────────────

export interface FeedingRepository extends Repository<Feeding> {
  getByKitten(kittenId: string): Promise<Feeding[]>;
  getByKittenSince(kittenId: string, since: Date): Promise<Feeding[]>;
  getRecentForKitten(kittenId: string, limit: number): Promise<Feeding[]>;
  getForKittenInRange(
    kittenId: string,
    start: Date,
    end: Date
  ): Promise<Feeding[]>;
}

// ── Weight ───────────────────────────────────────────────────────────────────

export interface WeightRepository extends Repository<WeightEntry> {
  getByKitten(kittenId: string): Promise<WeightEntry[]>;
  getLatestForKitten(kittenId: string): Promise<WeightEntry | undefined>;
  getByKittenSince(kittenId: string, since: Date): Promise<WeightEntry[]>;
}

// ── Elimination ──────────────────────────────────────────────────────────────

export interface EliminationRepository extends Repository<EliminationEntry> {
  getByKitten(kittenId: string): Promise<EliminationEntry[]>;
  getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<EliminationEntry[]>;
}

// ── Medication ───────────────────────────────────────────────────────────────

export interface MedicationRepository extends Repository<Medication> {
  getByKitten(kittenId: string): Promise<Medication[]>;
  getActiveForKitten(kittenId: string): Promise<Medication[]>;
}

// ── Medication Administration ─────────────────────────────────────────────────

export interface MedicationAdministrationRepository
  extends Repository<MedicationAdministration> {
  getByMedication(medicationId: string): Promise<MedicationAdministration[]>;
  getLatestForMedication(
    medicationId: string
  ): Promise<MedicationAdministration | undefined>;
  getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<MedicationAdministration[]>;
}

// ── Health Observation ───────────────────────────────────────────────────────

export interface HealthObservationRepository
  extends Repository<HealthObservation> {
  getByKitten(kittenId: string): Promise<HealthObservation[]>;
  getByKittenSince(
    kittenId: string,
    since: Date
  ): Promise<HealthObservation[]>;
}

// ── Combined repos (injected together for convenience) ────────────────────────

export interface Repositories {
  kittens: KittenRepository;
  feedings: FeedingRepository;
  weights: WeightRepository;
  eliminations: EliminationRepository;
  medications: MedicationRepository;
  administrations: MedicationAdministrationRepository;
  health: HealthObservationRepository;
}
