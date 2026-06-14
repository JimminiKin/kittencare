import { v4 as uuid } from "uuid";
import { subHours } from "date-fns";
import type {
  Alert,
  Feeding,
  WeightEntry,
  EliminationEntry,
  Medication,
  MedicationAdministration,
  Kitten,
  KittenSummary,
} from "@/domain/types";
import type { Repositories } from "@/repositories/interfaces";

// Feeding intervals by age bracket (foster kitten guidelines)
function getFeedingIntervalHours(estimatedAgeDays?: number): number {
  if (!estimatedAgeDays || estimatedAgeDays <= 7) return 2;  // 0–1 week: every 2h
  if (estimatedAgeDays <= 14) return 3;                      // 1–2 weeks: every 3h
  if (estimatedAgeDays <= 21) return 4;                      // 2–3 weeks: every 4h
  if (estimatedAgeDays <= 28) return 5;                      // 3–4 weeks: every 5h
  return 6;                                                  // 4+ weeks: every 6h (transitioning)
}

// ── Pure alert computation (no I/O) ──────────────────────────────────────────
// Both the Supabase-backed and in-memory variants converge here.

function alertsFromData({
  kitten,
  now,
  intervalHours,
  sortedWeightsDesc,
  weekFeedings,
  last24hFeedings,
  activeMeds,
  getLatestAdmin,
}: {
  kitten: Kitten;
  now: Date;
  intervalHours: number;
  sortedWeightsDesc: WeightEntry[];
  weekFeedings: Feeding[];
  last24hFeedings: Feeding[];
  activeMeds: Medication[];
  getLatestAdmin: (medId: string) => MedicationAdministration | null | undefined;
}): Alert[] {
  const alerts: Alert[] = [];
  const yesterday = subHours(now, 24);

  // Weight alerts
  if (sortedWeightsDesc.length >= 2) {
    const [latest, previous] = sortedWeightsDesc;
    if (latest.weightGrams < previous.weightGrams) {
      alerts.push({
        id: uuid(), kittenId: kitten.id, kittenName: kitten.name,
        type: "weight_loss", severity: "critical", category: "warning",
        params: { kittenName: kitten.name, lostGrams: previous.weightGrams - latest.weightGrams },
        timestamp: now,
      });
    }
    const recentWt = sortedWeightsDesc.filter((w) => w.timestamp >= yesterday);
    if (recentWt.length >= 2) {
      const max = Math.max(...recentWt.map((w) => w.weightGrams));
      const min = Math.min(...recentWt.map((w) => w.weightGrams));
      if (max - min < 5) {
        alerts.push({
          id: uuid(), kittenId: kitten.id, kittenName: kitten.name,
          type: "no_weight_gain", severity: "warning", category: "warning",
          params: { kittenName: kitten.name }, timestamp: now,
        });
      }
    }
  }

  // Feeding alerts: mirrors medication_due / medication_overdue logic
  const lastFeeding = weekFeedings.reduce<Feeding | undefined>(
    (best, f) => (!best || f.timestamp > best.timestamp ? f : best),
    undefined,
  );
  const feedingDueAt = lastFeeding
    ? new Date(lastFeeding.timestamp.getTime() + intervalHours * 3_600_000)
    : new Date(0); // no feeding recorded → always overdue
  if (feedingDueAt <= now) {
    const overdueHours = (now.getTime() - feedingDueAt.getTime()) / 3_600_000;
    alerts.push({
      id: uuid(), kittenId: kitten.id, kittenName: kitten.name,
      type: overdueHours > 1 ? "feeding_overdue" : "feeding_due",
      severity: overdueHours > 1 ? "critical" : "warning",
      category: "action",
      params: overdueHours > 1
        ? { kittenName: kitten.name, overdueHours: Math.round(overdueHours) }
        : { kittenName: kitten.name },
      timestamp: now,
    });
  }

  const isFormula = (f: Feeding) => !f.foodType || f.foodType === "formula";
  if (weekFeedings.length > 0) {
    const weekAvg =
      weekFeedings.filter(isFormula).reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0) / 7;
    const todayMl = last24hFeedings
      .filter(isFormula)
      .reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0);
    if (weekAvg > 0 && todayMl < weekAvg * 0.6) {
      alerts.push({
        id: uuid(), kittenId: kitten.id, kittenName: kitten.name,
        type: "low_daily_intake", severity: "warning", category: "warning",
        params: { kittenName: kitten.name, todayMl, avgMl: Math.round(weekAvg) },
        timestamp: now,
      });
    }
  }

  // Medication alerts
  for (const med of activeMeds) {
    const latestAdmin = getLatestAdmin(med.id);
    const dueAt = latestAdmin
      ? new Date(latestAdmin.timestamp.getTime() + med.frequencyHours * 3_600_000)
      : med.startDate;
    if (dueAt <= now) {
      const overdueHours = (now.getTime() - dueAt.getTime()) / 3_600_000;
      alerts.push({
        id: uuid(), kittenId: kitten.id, kittenName: kitten.name,
        type: overdueHours > 1 ? "medication_overdue" : "medication_due",
        severity: overdueHours > 1 ? "critical" : "warning",
        category: "action",
        params:
          overdueHours > 1
            ? { kittenName: kitten.name, medicationName: med.name, overdueHours: Math.round(overdueHours) }
            : { kittenName: kitten.name, medicationName: med.name },
        timestamp: now,
      });
    }
  }

  return alerts;
}

function buildSummaryFromParts({
  kitten,
  now,
  startOfDay,
  intervalHours,
  allWeights,
  weekFeedings,
  todayEliminations,
  activeMeds,
  getLatestAdmin,
}: {
  kitten: Kitten;
  now: Date;
  startOfDay: Date;
  intervalHours: number;
  allWeights: WeightEntry[];
  weekFeedings: Feeding[];
  todayEliminations: EliminationEntry[];
  activeMeds: Medication[];
  getLatestAdmin: (medId: string) => MedicationAdministration | null | undefined;
}): KittenSummary {
  const sortedWeights = [...allWeights].sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  );
  const todayFeedings = weekFeedings.filter((f) => f.timestamp >= startOfDay);
  const last24hFeedings = weekFeedings.filter((f) => f.timestamp >= subHours(now, 24));

  const alerts = alertsFromData({
    kitten, now, intervalHours,
    sortedWeightsDesc: sortedWeights,
    weekFeedings, last24hFeedings,
    activeMeds, getLatestAdmin,
  });

  const lastFeeding = weekFeedings.reduce<Feeding | undefined>(
    (best, f) => (!best || f.timestamp > best.timestamp ? f : best),
    undefined,
  );
  const nextFeedingDueAt = lastFeeding
    ? new Date(lastFeeding.timestamp.getTime() + intervalHours * 3_600_000)
    : undefined;

  const isFormula = (f: Feeding) => !f.foodType || f.foodType === "formula";
  return {
    kitten,
    currentWeightGrams: sortedWeights[0]?.weightGrams,
    weightChangeGrams:
      sortedWeights[0] && sortedWeights[1]
        ? sortedWeights[0].weightGrams - sortedWeights[1].weightGrams
        : undefined,
    feedingsToday: todayFeedings.length,
    totalConsumedMlToday: todayFeedings
      .filter(isFormula)
      .reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0),
    totalConsumedGramsToday: todayFeedings
      .filter((f) => f.foodType === "wet" || f.foodType === "solid")
      .reduce((s, f) => s + (f.amountConsumedGrams ?? 0), 0),
    eliminationsToday: todayEliminations.length,
    activeMedications: activeMeds,
    alerts,
    nextFeedingDueAt,
  };
}

// ── Supabase-backed (used by refreshSummaries / computeAllAlerts) ─────────────
// Was: ~11 sequential queries per kitten.
// Now: 4 parallel queries + N parallel med-admin queries per kitten.

export async function buildKittenSummary(
  kitten: Kitten,
  repos: Repositories,
): Promise<KittenSummary> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const intervalHours = getFeedingIntervalHours(kitten.estimatedAgeDays);

  // Batch 1: all independent queries in parallel
  const [allWeights, weekFeedings, todayEliminations, activeMeds] = await Promise.all([
    repos.weights.getByKitten(kitten.id),
    repos.feedings.getByKittenSince(kitten.id, subHours(now, 168)),
    repos.eliminations.getByKittenSince(kitten.id, startOfDay),
    repos.medications.getActiveForKitten(kitten.id),
  ]);

  // Batch 2: med admins (depends on knowing which meds are active)
  const latestAdmins = await Promise.all(
    activeMeds.map((m) => repos.administrations.getLatestForMedication(m.id)),
  );
  const adminMap = new Map(activeMeds.map((m, i) => [m.id, latestAdmins[i]]));

  return buildSummaryFromParts({
    kitten, now, startOfDay, intervalHours,
    allWeights, weekFeedings, todayEliminations, activeMeds,
    getLatestAdmin: (id) => adminMap.get(id),
  });
}

export async function computeAllAlerts(repos: Repositories): Promise<Alert[]> {
  const kittens = await repos.kittens.getActive();
  const summaries = await Promise.all(kittens.map((k) => buildKittenSummary(k, repos)));
  return summaries.flatMap((s) => s.alerts);
}

// ── In-memory variant (no Supabase — used by detail view) ────────────────────
// The detail view loads all care data into the store first; this computes the
// summary synchronously from those arrays, making zero additional queries.

export function buildKittenSummaryFromData(
  kitten: Kitten,
  feedings: Feeding[],
  weights: WeightEntry[],
  eliminations: EliminationEntry[],
  medications: Medication[],
  administrations: MedicationAdministration[],
): KittenSummary {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const intervalHours = getFeedingIntervalHours(kitten.estimatedAgeDays);

  const activeMeds = medications.filter((m) => !m.endDate || m.endDate > now);
  const weekFeedings = feedings.filter((f) => f.timestamp >= subHours(now, 168));
  const todayEliminations = eliminations.filter((e) => e.timestamp >= startOfDay);

  // Build latest-admin-per-med map from all loaded administrations
  const latestByMedId = new Map<string, MedicationAdministration>();
  for (const a of administrations) {
    const existing = latestByMedId.get(a.medicationId);
    if (!existing || a.timestamp > existing.timestamp) latestByMedId.set(a.medicationId, a);
  }

  return buildSummaryFromParts({
    kitten, now, startOfDay, intervalHours,
    allWeights: weights, weekFeedings, todayEliminations, activeMeds,
    getLatestAdmin: (id) => latestByMedId.get(id),
  });
}
