"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { getRepositories } from "@/db/index";
import { getQueryClient } from "@/lib/query-client";
import { qk } from "@/lib/query-keys";
import type { Kitten } from "@/domain/types";
import type { CreateKittenInput } from "@/domain/validation";

const qc = () => getQueryClient();

interface KittenStore {
  selectedKittenId: string | null;
  selectKitten(id: string | null): void;

  addKitten(input: CreateKittenInput): Promise<Kitten>;
  updateKitten(id: string, partial: Partial<Omit<Kitten, "id">>): Promise<void>;
  archiveKitten(id: string, status: Kitten["status"]): Promise<void>;
  deleteKitten(id: string): Promise<void>;
}

export const useKittenStore = create<KittenStore>((set) => ({
  selectedKittenId: null,
  selectKitten: (id) => set({ selectedKittenId: id }),

  addKitten: async (input) => {
    const now = new Date();
    const kitten: Kitten = { ...input, id: uuid(), status: input.status ?? "active", createdAt: now, updatedAt: now };
    await getRepositories().kittens.create(kitten);
    qc().setQueryData<Kitten[]>(qk.kittens(), (old = []) => [kitten, ...old]);
    qc().invalidateQueries({ queryKey: qk.summaries() });
    return kitten;
  },

  updateKitten: async (id, partial) => {
    const updated = { ...partial, updatedAt: new Date() };
    await getRepositories().kittens.update(id, updated);
    qc().setQueryData<Kitten[]>(qk.kittens(), (old = []) =>
      old.map((k) => (k.id === id ? { ...k, ...updated } : k))
    );
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  archiveKitten: async (id, status) => {
    await getRepositories().kittens.update(id, { status, updatedAt: new Date() });
    qc().setQueryData<Kitten[]>(qk.kittens(), (old = []) =>
      old.map((k) => (k.id === id ? { ...k, status } : k))
    );
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },

  deleteKitten: async (id) => {
    const repos = getRepositories();
    const [feedings, weights, eliminations, medications, health, administrations] = await Promise.all([
      repos.feedings.getByKitten(id),
      repos.weights.getByKitten(id),
      repos.eliminations.getByKitten(id),
      repos.medications.getByKitten(id),
      repos.health.getByKitten(id),
      repos.administrations.getByKittenSince(id, new Date(0)),
    ]);
    await Promise.all([
      ...feedings.map((f) => repos.feedings.delete(f.id)),
      ...weights.map((w) => repos.weights.delete(w.id)),
      ...eliminations.map((e) => repos.eliminations.delete(e.id)),
      ...medications.map((m) => repos.medications.delete(m.id)),
      ...health.map((h) => repos.health.delete(h.id)),
      ...administrations.map((a) => repos.administrations.delete(a.id)),
    ]);
    await repos.kittens.delete(id);
    qc().setQueryData<Kitten[]>(qk.kittens(), (old = []) => old.filter((k) => k.id !== id));
    qc().removeQueries({ queryKey: qk.feedings(id) });
    qc().removeQueries({ queryKey: qk.weights(id) });
    qc().removeQueries({ queryKey: qk.eliminations(id) });
    qc().removeQueries({ queryKey: qk.medications(id) });
    qc().removeQueries({ queryKey: qk.admins(id) });
    qc().removeQueries({ queryKey: qk.health(id) });
    qc().invalidateQueries({ queryKey: qk.summaries() });
  },
}));
