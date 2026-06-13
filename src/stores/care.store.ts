"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { getRepositories } from "@/db/index";
import type {
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
  Alert,
  KittenSummary,
} from "@/domain/types";
import { computeAllAlerts, buildKittenSummary } from "@/services/alert.service";
import { fireAlertNotifications } from "@/lib/notifications";
import { useNotificationStore } from "@/stores/notification.store";
import type { CreateFeedingInput, CreateWeightEntryInput, CreateEliminationEntryInput, CreateMedicationInput, CreateMedicationAdministrationInput, CreateHealthObservationInput } from "@/domain/validation";
import { useKittenStore } from "@/stores/kitten.store";

interface CareStore {
  // State
  feedings: Feeding[];
  weights: WeightEntry[];
  eliminations: EliminationEntry[];
  medications: Medication[];
  administrations: MedicationAdministration[];
  healthObservations: HealthObservation[];
  alerts: Alert[];
  summaries: KittenSummary[];
  summariesLoaded: boolean;
  loading: boolean;
  error: string | null;

  // Load operations
  loadFeedingsForKitten(kittenId: string): Promise<void>;
  loadWeightsForKitten(kittenId: string): Promise<void>;
  loadEliminationsForKitten(kittenId: string): Promise<void>;
  loadMedicationsForKitten(kittenId: string): Promise<void>;
  loadHealthForKitten(kittenId: string): Promise<void>;
  refreshAlerts(): Promise<void>;
  refreshSummaries(): Promise<void>;

  // Feed
  addFeeding(input: CreateFeedingInput): Promise<Feeding>;
  updateFeeding(id: string, partial: Partial<Omit<Feeding, "id">>): Promise<void>;
  deleteFeeding(id: string): Promise<void>;

  // Weight
  addWeight(input: CreateWeightEntryInput): Promise<WeightEntry>;
  updateWeight(id: string, partial: Partial<Omit<WeightEntry, "id">>): Promise<void>;
  deleteWeight(id: string): Promise<void>;

  // Elimination
  addElimination(input: CreateEliminationEntryInput): Promise<EliminationEntry>;
  updateElimination(id: string, partial: Partial<Omit<EliminationEntry, "id">>): Promise<void>;
  deleteElimination(id: string): Promise<void>;

  // Medication
  addMedication(input: CreateMedicationInput): Promise<Medication>;
  updateMedication(id: string, partial: Partial<Omit<Medication, "id">>): Promise<void>;
  deleteMedication(id: string): Promise<void>;
  administerMedication(input: CreateMedicationAdministrationInput): Promise<MedicationAdministration>;
  deleteAdministration(id: string): Promise<void>;

  // Health
  addHealthObservation(input: CreateHealthObservationInput): Promise<HealthObservation>;
  updateHealthObservation(id: string, partial: Partial<Omit<HealthObservation, "id">>): Promise<void>;
  deleteHealthObservation(id: string): Promise<void>;
}

export const useCareStore = create<CareStore>((set, get) => ({
  feedings: [],
  weights: [],
  eliminations: [],
  medications: [],
  administrations: [],
  healthObservations: [],
  alerts: [],
  summaries: [],
  summariesLoaded: false,
  loading: false,
  error: null,

  loadFeedingsForKitten: async (kittenId) => {
    const feedings = await getRepositories().feedings.getByKitten(kittenId);
    set({ feedings });
  },

  loadWeightsForKitten: async (kittenId) => {
    const weights = await getRepositories().weights.getByKitten(kittenId);
    set({ weights });
  },

  loadEliminationsForKitten: async (kittenId) => {
    const eliminations = await getRepositories().eliminations.getByKitten(kittenId);
    set({ eliminations });
  },

  loadMedicationsForKitten: async (kittenId) => {
    const [medications, administrations] = await Promise.all([
      getRepositories().medications.getByKitten(kittenId),
      getRepositories().administrations.getByKittenSince(kittenId, new Date(0)),
    ]);
    set({ medications, administrations });
  },

  loadHealthForKitten: async (kittenId) => {
    const healthObservations = await getRepositories().health.getByKitten(kittenId);
    set({ healthObservations });
  },

  refreshAlerts: async () => {
    const alerts = await computeAllAlerts(getRepositories());
    set({ alerts });
    if (useNotificationStore.getState().enabled) {
      fireAlertNotifications(alerts).catch(() => {});
    }
  },

  refreshSummaries: async () => {
    const repos = getRepositories();
    const stored = useKittenStore.getState().kittens.filter((k) => k.status === "active");
    const kittens = stored.length > 0 ? stored : await repos.kittens.getActive();
    const results = await Promise.allSettled(kittens.map((k) => buildKittenSummary(k, repos)));
    const summaries = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    set({ summaries, summariesLoaded: true });
  },

  addFeeding: async (input) => {
    const feeding: Feeding = { ...input, id: uuid() };
    await getRepositories().feedings.create(feeding);
    set((s) => ({ feedings: [feeding, ...s.feedings] }));
    return feeding;
  },

  updateFeeding: async (id, partial) => {
    await getRepositories().feedings.update(id, partial);
    set((s) => ({ feedings: s.feedings.map((f) => (f.id === id ? { ...f, ...partial } : f)) }));
  },

  deleteFeeding: async (id) => {
    await getRepositories().feedings.delete(id);
    set((s) => ({ feedings: s.feedings.filter((f) => f.id !== id) }));
  },

  addWeight: async (input) => {
    const entry: WeightEntry = { ...input, id: uuid() };
    await getRepositories().weights.create(entry);
    set((s) => ({ weights: [entry, ...s.weights] }));
    return entry;
  },

  updateWeight: async (id, partial) => {
    await getRepositories().weights.update(id, partial);
    set((s) => ({ weights: s.weights.map((w) => (w.id === id ? { ...w, ...partial } : w)) }));
  },

  deleteWeight: async (id) => {
    await getRepositories().weights.delete(id);
    set((s) => ({ weights: s.weights.filter((w) => w.id !== id) }));
  },

  addElimination: async (input) => {
    const entry: EliminationEntry = { ...input, id: uuid() };
    await getRepositories().eliminations.create(entry);
    set((s) => ({ eliminations: [entry, ...s.eliminations] }));
    return entry;
  },

  updateElimination: async (id, partial) => {
    await getRepositories().eliminations.update(id, partial);
    set((s) => ({ eliminations: s.eliminations.map((e) => (e.id === id ? { ...e, ...partial } : e)) }));
  },

  deleteElimination: async (id) => {
    await getRepositories().eliminations.delete(id);
    set((s) => ({ eliminations: s.eliminations.filter((e) => e.id !== id) }));
  },

  addMedication: async (input) => {
    const medication: Medication = { ...input, id: uuid() };
    await getRepositories().medications.create(medication);
    set((s) => ({ medications: [medication, ...s.medications] }));
    return medication;
  },

  updateMedication: async (id, partial) => {
    await getRepositories().medications.update(id, partial);
    set((s) => ({
      medications: s.medications.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    }));
  },

  deleteMedication: async (id) => {
    await getRepositories().medications.delete(id);
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }));
  },

  administerMedication: async (input) => {
    const admin: MedicationAdministration = { ...input, id: uuid() };
    await getRepositories().administrations.create(admin);
    set((s) => ({ administrations: [admin, ...s.administrations] }));
    return admin;
  },

  deleteAdministration: async (id) => {
    await getRepositories().administrations.delete(id);
    set((s) => ({ administrations: s.administrations.filter((a) => a.id !== id) }));
  },

  addHealthObservation: async (input) => {
    const obs: HealthObservation = { ...input, id: uuid() };
    await getRepositories().health.create(obs);
    set((s) => ({ healthObservations: [obs, ...s.healthObservations] }));
    return obs;
  },

  updateHealthObservation: async (id, partial) => {
    await getRepositories().health.update(id, partial);
    set((s) => ({ healthObservations: s.healthObservations.map((h) => (h.id === id ? { ...h, ...partial } : h)) }));
  },

  deleteHealthObservation: async (id) => {
    await getRepositories().health.delete(id);
    set((s) => ({ healthObservations: s.healthObservations.filter((h) => h.id !== id) }));
  },
}));
