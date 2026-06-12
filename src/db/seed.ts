import { v4 as uuid } from "uuid";
import { subDays, subHours, subMinutes } from "date-fns";
import { getRepositories } from "@/db/index";
import type {
  Kitten,
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
} from "@/domain/types";

export async function seedDatabase() {
  const repos = getRepositories();
  const existing = await repos.kittens.getAll();
  if (existing.length > 0) return; // already seeded

  const now = new Date();

  // ── Kittens ──────────────────────────────────────────────────────────────
  const mochi: Kitten = {
    id: uuid(),
    name: "Mochi",
    sex: "female",
    estimatedAgeDays: 12,
    intakeDate: subDays(now, 5),
    status: "active",
    notes: "Found behind dumpster. Very vocal. Thriving on KMR formula.",
    createdAt: subDays(now, 5),
    updatedAt: now,
  };

  const biscuit: Kitten = {
    id: uuid(),
    name: "Biscuit",
    sex: "male",
    estimatedAgeDays: 9,
    intakeDate: subDays(now, 3),
    status: "active",
    notes: "Litter mate of Gravy. Smaller than average. Watch weight carefully.",
    createdAt: subDays(now, 3),
    updatedAt: now,
  };

  const gravy: Kitten = {
    id: uuid(),
    name: "Gravy",
    sex: "male",
    estimatedAgeDays: 9,
    intakeDate: subDays(now, 3),
    status: "active",
    notes: "Litter mate of Biscuit. Good eater.",
    createdAt: subDays(now, 3),
    updatedAt: now,
  };

  await repos.kittens.create(mochi);
  await repos.kittens.create(biscuit);
  await repos.kittens.create(gravy);

  // ── Weight entries ───────────────────────────────────────────────────────
  const mochiWeights: WeightEntry[] = [
    { id: uuid(), kittenId: mochi.id, timestamp: subDays(now, 5), weightGrams: 168 },
    { id: uuid(), kittenId: mochi.id, timestamp: subDays(now, 4), weightGrams: 181 },
    { id: uuid(), kittenId: mochi.id, timestamp: subDays(now, 3), weightGrams: 195 },
    { id: uuid(), kittenId: mochi.id, timestamp: subDays(now, 2), weightGrams: 211 },
    { id: uuid(), kittenId: mochi.id, timestamp: subDays(now, 1), weightGrams: 226 },
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 2), weightGrams: 238 },
  ];

  const biscuitWeights: WeightEntry[] = [
    { id: uuid(), kittenId: biscuit.id, timestamp: subDays(now, 3), weightGrams: 102 },
    { id: uuid(), kittenId: biscuit.id, timestamp: subDays(now, 2), weightGrams: 110 },
    { id: uuid(), kittenId: biscuit.id, timestamp: subDays(now, 1), weightGrams: 118 },
    { id: uuid(), kittenId: biscuit.id, timestamp: subHours(now, 3), weightGrams: 121 },
  ];

  const gravyWeights: WeightEntry[] = [
    { id: uuid(), kittenId: gravy.id, timestamp: subDays(now, 3), weightGrams: 145 },
    { id: uuid(), kittenId: gravy.id, timestamp: subDays(now, 2), weightGrams: 158 },
    { id: uuid(), kittenId: gravy.id, timestamp: subDays(now, 1), weightGrams: 172 },
    { id: uuid(), kittenId: gravy.id, timestamp: subHours(now, 1), weightGrams: 186 },
  ];

  for (const w of [...mochiWeights, ...biscuitWeights, ...gravyWeights]) {
    await repos.weights.create(w);
  }

  // ── Feedings (last 24h for Mochi) ────────────────────────────────────────
  const feedingTimes = [23, 20, 17, 14, 11, 8, 5, 2];
  for (const hoursAgo of feedingTimes) {
    const feeding: Feeding = {
      id: uuid(),
      kittenId: mochi.id,
      timestamp: subHours(now, hoursAgo),
      foodType: "formula",
      method: "bottle",
      formulaType: "KMR",
      amountOfferedMl: 10,
      amountConsumedMl: hoursAgo < 6 ? 9 : 8,
    };
    await repos.feedings.create(feeding);
  }

  for (const hoursAgo of [22, 18, 14, 10, 6, 2]) {
    const f: Feeding = {
      id: uuid(),
      kittenId: biscuit.id,
      timestamp: subHours(now, hoursAgo),
      foodType: "formula",
      method: "syringe",
      formulaType: "KMR",
      amountOfferedMl: 6,
      amountConsumedMl: 5,
    };
    await repos.feedings.create(f);
  }

  for (const hoursAgo of [21, 17, 13, 9, 5, 1]) {
    const f: Feeding = {
      id: uuid(),
      kittenId: gravy.id,
      timestamp: subHours(now, hoursAgo),
      foodType: "formula",
      method: "bottle",
      formulaType: "KMR",
      amountOfferedMl: 8,
      amountConsumedMl: 8,
    };
    await repos.feedings.create(f);
  }

  // ── Eliminations ─────────────────────────────────────────────────────────
  const mochiElims: EliminationEntry[] = [
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 22), pee: true, poo: false },
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 19), pee: true, poo: true, pooConsistency: "normal", pooColor: "yellow-brown" },
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 13), pee: true, poo: false },
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 7), pee: true, poo: true, pooConsistency: "soft", pooColor: "yellow" },
    { id: uuid(), kittenId: mochi.id, timestamp: subHours(now, 1), pee: true, poo: false },
  ];

  for (const e of mochiElims) {
    await repos.eliminations.create(e);
  }

  // ── Medication ───────────────────────────────────────────────────────────
  const med: Medication = {
    id: uuid(),
    kittenId: biscuit.id,
    name: "Amoxicillin",
    dosage: "0.1ml",
    frequencyHours: 12,
    startDate: subDays(now, 2),
    endDate: subDays(now, -5),
    notes: "URI treatment. Give with food.",
  };
  await repos.medications.create(med);

  const admin: MedicationAdministration = {
    id: uuid(),
    medicationId: med.id,
    kittenId: biscuit.id,
    timestamp: subHours(now, 11),
  };
  await repos.administrations.create(admin);
}
