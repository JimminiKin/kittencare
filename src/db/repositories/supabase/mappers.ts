import type {
  Kitten,
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";

// Helpers
export function ts(s: string | null | undefined): Date {
  return new Date(s ?? 0);
}
export function tsOpt(s: string | null | undefined): Date | undefined {
  return s ? new Date(s) : undefined;
}
export function localDate(s: string | null | undefined): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function isoDate(d: Date | undefined): string | null {
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ── Row → Domain ─────────────────────────────────────────────────────────────

export function rowToKitten(r: any): Kitten {
  return {
    id: r.id,
    name: r.name,
    photo: r.photo ?? undefined,
    birthDate: localDate(r.birth_date),
    estimatedAgeDays: r.estimated_age_days ?? undefined,
    sex: r.sex ?? undefined,
    intakeDate: localDate(r.intake_date),
    status: r.status,
    notes: r.notes ?? undefined,
    createdAt: ts(r.created_at),
    updatedAt: ts(r.updated_at),
  };
}

export function rowToFeeding(r: any): Feeding {
  return {
    id: r.id,
    kittenId: r.kitten_id,
    timestamp: ts(r.timestamp),
    foodType: r.food_type ?? undefined,
    method: r.method ?? undefined,
    formulaType: r.formula_type ?? undefined,
    amountOfferedMl: r.amount_offered_ml ?? undefined,
    amountConsumedMl: r.amount_consumed_ml ?? undefined,
    amountConsumedGrams: r.amount_consumed_grams ?? undefined,
    notes: r.notes ?? undefined,
    recordedBy: r.recorded_by ?? undefined,
  };
}

export function rowToWeight(r: any): WeightEntry {
  return {
    id: r.id,
    kittenId: r.kitten_id,
    timestamp: ts(r.timestamp),
    weightGrams: Number(r.weight_grams),
    recordedBy: r.recorded_by ?? undefined,
  };
}

export function rowToElimination(r: any): EliminationEntry {
  return {
    id: r.id,
    kittenId: r.kitten_id,
    timestamp: ts(r.timestamp),
    pee: r.pee,
    poo: r.poo,
    pooConsistency: r.poo_consistency ?? undefined,
    pooColor: r.poo_color ?? undefined,
    notes: r.notes ?? undefined,
    recordedBy: r.recorded_by ?? undefined,
  };
}

export function rowToMedication(r: any): Medication {
  return {
    id: r.id,
    kittenId: r.kitten_id,
    name: r.name,
    dosage: r.dosage,
    frequencyHours: Number(r.frequency_hours),
    startDate: ts(r.start_date),
    endDate: tsOpt(r.end_date),
    notes: r.notes ?? undefined,
  };
}

export function rowToAdministration(r: any): MedicationAdministration {
  return {
    id: r.id,
    medicationId: r.medication_id,
    kittenId: r.kitten_id,
    timestamp: ts(r.timestamp),
    recordedBy: r.recorded_by ?? undefined,
  };
}

export function rowToHealth(r: any): HealthObservation {
  return {
    id: r.id,
    kittenId: r.kitten_id,
    timestamp: ts(r.timestamp),
    energy: r.energy,
    hydration: r.hydration,
    appetite: r.appetite,
    temperature: r.temperature ?? undefined,
    notes: r.notes ?? undefined,
    recordedBy: r.recorded_by ?? undefined,
  };
}
