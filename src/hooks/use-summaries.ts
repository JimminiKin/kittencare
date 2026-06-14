"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getRepositories } from "@/db/index";
import { qk } from "@/lib/query-keys";
import { useKittens } from "@/hooks/use-kittens";
import { buildKittenSummary, buildKittenSummaryFromData } from "@/services/alert.service";
import { useNotificationStore } from "@/stores/notification.store";
import { fireAlertNotifications } from "@/lib/notifications";
import type {
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  KittenSummary,
} from "@/domain/types";

export function useSummaries() {
  const qc = useQueryClient();
  const { data: kittens } = useKittens();
  const repos = getRepositories();

  return useQuery<KittenSummary[]>({
    queryKey: qk.summaries(),
    queryFn: async () => {
      const active = kittens?.filter((k) => k.status === "active") ?? [];
      const results = await Promise.allSettled(
        active.map((k) => {
          // Use already-cached care data if available — zero extra queries
          const feedings      = qc.getQueryData<Feeding[]>(qk.feedings(k.id));
          const weights       = qc.getQueryData<WeightEntry[]>(qk.weights(k.id));
          const eliminations  = qc.getQueryData<EliminationEntry[]>(qk.eliminations(k.id));
          const medications   = qc.getQueryData<Medication[]>(qk.medications(k.id));
          const admins        = qc.getQueryData<MedicationAdministration[]>(qk.admins(k.id));

          if (feedings && weights && eliminations && medications && admins) {
            return Promise.resolve(
              buildKittenSummaryFromData(k, feedings, weights, eliminations, medications, admins)
            );
          }
          return buildKittenSummary(k, repos);
        })
      );
      return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    },
    enabled: kittens !== undefined,
    staleTime: 0,
  });
}

export function useAlerts() {
  const { data: summaries = [] } = useSummaries();
  const notificationsEnabled = useNotificationStore((s) => s.enabled);

  // Fire push notifications when alerts change
  if (notificationsEnabled && summaries.length > 0) {
    const alerts = summaries.flatMap((s) => s.alerts);
    if (alerts.length > 0) fireAlertNotifications(alerts).catch(() => {});
  }

  return summaries.flatMap((s) => s.alerts);
}
