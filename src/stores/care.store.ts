"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { getRepositories } from "@/db/index";
import { getQueryClient } from "@/lib/query-client";
import { qk } from "@/lib/query-keys";
import type {
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";
import type {
  CreateFeedingInput,
  CreateWeightEntryInput,
  CreateEliminationEntryInput,
  CreateMedicationInput,
  CreateMedicationAdministrationInput,
  CreateHealthObservationInput,
} from "@/domain/validation";

// After each write, invalidate the relevant per-kitten query and summaries.
// Updates use full invalidation (re-fetch) so the server is always the source
// of truth; adds use setQueryData for an instant optimistic prepend.
const qc = () => getQueryClient();

interface CareStore {
  addFeeding(input: CreateFeedingInput): Promise<Feeding>;
  updateFeeding(id: string, partial: Partial<Omit<Feeding, "id">>): Promise<void>;
  deleteFeeding(id: string): Promise<void>;

  addWeight(input: CreateWeightEntryInput): Promise<WeightEntry>;
  updateWeight(id: string, partial: Partial<Omit<WeightEntry, "id">>): Promise<void>;
  deleteWeight(id: string): Promise<void>;

  addElimination(input: CreateEliminationEntryInput): Promise<EliminationEntry>;
  updateElimination(id: string, partial: Partial<Omit<EliminationEntry, "id">>): Promise<void>;
  deleteElimination(id: string): Promise<void>;

  addMedication(input: CreateMedicationInput): Promise<Medication>;
  updateMedication(id: string, partial: Partial<Omit<Medication, "id">>): Promise<void>;
  deleteMedication(id: string): Promise<void>;
  administerMedication(input: CreateMedicationAdministrationInput): Promise<MedicationAdministration>;
  deleteAdministration(id: string): Promise<void>;

  addHealthObservation(input: CreateHealthObservationInput): Promise<HealthObservation>;
  updateHealthObservation(id: string, partial: Partial<Omit<HealthObservation, "id">>): Promise<void>;
  deleteHealthObservation(id: string): Promise<void>;
}

export const useCareStore = create<CareStore>(() => ({
  // ── Feeding ─────────────────────────────────────────────────────────────────

  addFeeding: async (input) => {
    const feeding: Feeding = { ...input, id: uuid() };
    await getRepositories().feedings.create(feeding);
    qc().setQueryData<Feeding[]>(qk.feedings(feeding.kittenId), (old = []) => [feeding, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return feeding;
  },

  updateFeeding: async (id, partial) => {
    await getRepositories().feedings.update(id, partial);
    qc().invalidateQueries({ queryKey: ["feedings"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  deleteFeeding: async (id) => {
    await getRepositories().feedings.delete(id);
    qc().invalidateQueries({ queryKey: ["feedings"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  // ── Weight ───────────────────────────────────────────────────────────────────

  addWeight: async (input) => {
    const entry: WeightEntry = { ...input, id: uuid() };
    await getRepositories().weights.create(entry);
    qc().setQueryData<WeightEntry[]>(qk.weights(entry.kittenId), (old = []) => [entry, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return entry;
  },

  updateWeight: async (id, partial) => {
    await getRepositories().weights.update(id, partial);
    qc().invalidateQueries({ queryKey: ["weights"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  deleteWeight: async (id) => {
    await getRepositories().weights.delete(id);
    qc().invalidateQueries({ queryKey: ["weights"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  // ── Elimination ──────────────────────────────────────────────────────────────

  addElimination: async (input) => {
    const entry: EliminationEntry = { ...input, id: uuid() };
    await getRepositories().eliminations.create(entry);
    qc().setQueryData<EliminationEntry[]>(qk.eliminations(entry.kittenId), (old = []) => [entry, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return entry;
  },

  updateElimination: async (id, partial) => {
    await getRepositories().eliminations.update(id, partial);
    qc().invalidateQueries({ queryKey: ["eliminations"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  deleteElimination: async (id) => {
    await getRepositories().eliminations.delete(id);
    qc().invalidateQueries({ queryKey: ["eliminations"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  // ── Medication ───────────────────────────────────────────────────────────────

  addMedication: async (input) => {
    const medication: Medication = { ...input, id: uuid() };
    await getRepositories().medications.create(medication);
    qc().setQueryData<Medication[]>(qk.medications(medication.kittenId), (old = []) => [medication, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return medication;
  },

  updateMedication: async (id, partial) => {
    await getRepositories().medications.update(id, partial);
    qc().invalidateQueries({ queryKey: ["medications"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  deleteMedication: async (id) => {
    await getRepositories().medications.delete(id);
    qc().invalidateQueries({ queryKey: ["medications"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  administerMedication: async (input) => {
    const admin: MedicationAdministration = { ...input, id: uuid() };
    await getRepositories().administrations.create(admin);
    qc().setQueryData<MedicationAdministration[]>(qk.admins(admin.kittenId), (old = []) => [admin, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return admin;
  },

  deleteAdministration: async (id) => {
    await getRepositories().administrations.delete(id);
    qc().invalidateQueries({ queryKey: ["admins"] });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  // ── Health ───────────────────────────────────────────────────────────────────

  addHealthObservation: async (input) => {
    const obs: HealthObservation = { ...input, id: uuid() };
    await getRepositories().health.create(obs);
    qc().setQueryData<HealthObservation[]>(qk.health(obs.kittenId), (old = []) => [obs, ...old]);
    return obs;
  },

  updateHealthObservation: async (id, partial) => {
    await getRepositories().health.update(id, partial);
    qc().invalidateQueries({ queryKey: ["health"] });
  },

  deleteHealthObservation: async (id) => {
    await getRepositories().health.delete(id);
    qc().invalidateQueries({ queryKey: ["health"] });
  },
}));
