"use client";

import { create } from "zustand";
import { v4 as uuid } from "uuid";
import { getRepositories } from "@/db/index";
import type { Kitten } from "@/domain/types";
import type { CreateKittenInput } from "@/domain/validation";

interface KittenStore {
  kittens: Kitten[];
  loading: boolean;
  error: string | null;
  selectedKittenId: string | null;

  // Actions
  fetchKittens(): Promise<void>;
  addKitten(input: CreateKittenInput): Promise<Kitten>;
  updateKitten(id: string, partial: Partial<Omit<Kitten, "id">>): Promise<void>;
  archiveKitten(id: string, status: Kitten["status"]): Promise<void>;
  deleteKitten(id: string): Promise<void>;
  selectKitten(id: string | null): void;

  // Computed
  activeKittens(): Kitten[];
  getKittenById(id: string): Kitten | undefined;
}

export const useKittenStore = create<KittenStore>((set, get) => ({
  kittens: [],
  loading: false,
  error: null,
  selectedKittenId: null,

  fetchKittens: async () => {
    set({ loading: true, error: null });
    try {
      const kittens = await getRepositories().kittens.getAll();
      set({ kittens, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  addKitten: async (input) => {
    const now = new Date();
    const kitten: Kitten = {
      ...input,
      id: uuid(),
      status: input.status ?? "active",
      createdAt: now,
      updatedAt: now,
    };
    await getRepositories().kittens.create(kitten);
    set((s) => ({ kittens: [kitten, ...s.kittens] }));
    return kitten;
  },

  updateKitten: async (id, partial) => {
    const updated = { ...partial, updatedAt: new Date() };
    await getRepositories().kittens.update(id, updated);
    set((s) => ({
      kittens: s.kittens.map((k) => (k.id === id ? { ...k, ...updated } : k)),
    }));
  },

  archiveKitten: async (id, status) => {
    await getRepositories().kittens.update(id, { status, updatedAt: new Date() });
    set((s) => ({
      kittens: s.kittens.map((k) => (k.id === id ? { ...k, status } : k)),
    }));
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
    set((s) => ({ kittens: s.kittens.filter((k) => k.id !== id) }));
  },

  selectKitten: (id) => set({ selectedKittenId: id }),

  activeKittens: () => get().kittens.filter((k) => k.status === "active"),
  getKittenById: (id) => get().kittens.find((k) => k.id === id),
}));
