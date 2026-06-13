"use client";

import { useQueries } from "@tanstack/react-query";
import { getRepositories } from "@/db/index";
import { qk } from "@/lib/query-keys";
import type {
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";

export function useKittenCare(kittenId: string) {
  const results = useQueries({
    queries: [
      {
        queryKey: qk.feedings(kittenId),
        queryFn: (): Promise<Feeding[]> => getRepositories().feedings.getByKitten(kittenId),
        enabled: !!kittenId,
      },
      {
        queryKey: qk.weights(kittenId),
        queryFn: (): Promise<WeightEntry[]> => getRepositories().weights.getByKitten(kittenId),
        enabled: !!kittenId,
      },
      {
        queryKey: qk.eliminations(kittenId),
        queryFn: (): Promise<EliminationEntry[]> => getRepositories().eliminations.getByKitten(kittenId),
        enabled: !!kittenId,
      },
      {
        queryKey: qk.medications(kittenId),
        queryFn: (): Promise<Medication[]> => getRepositories().medications.getByKitten(kittenId),
        enabled: !!kittenId,
      },
      {
        queryKey: qk.admins(kittenId),
        queryFn: (): Promise<MedicationAdministration[]> =>
          getRepositories().administrations.getByKittenSince(kittenId, new Date(0)),
        enabled: !!kittenId,
      },
      {
        queryKey: qk.health(kittenId),
        queryFn: (): Promise<HealthObservation[]> => getRepositories().health.getByKitten(kittenId),
        enabled: !!kittenId,
      },
    ],
  });

  return {
    feedings:           (results[0].data ?? []) as Feeding[],
    weights:            (results[1].data ?? []) as WeightEntry[],
    eliminations:       (results[2].data ?? []) as EliminationEntry[],
    medications:        (results[3].data ?? []) as Medication[],
    administrations:    (results[4].data ?? []) as MedicationAdministration[],
    healthObservations: (results[5].data ?? []) as HealthObservation[],
    isLoading: results.some((r) => r.isLoading),
  };
}
