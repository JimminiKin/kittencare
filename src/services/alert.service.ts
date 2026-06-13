import { v4 as uuid } from "uuid";
import { subHours } from "date-fns";
import type { Alert, Kitten, KittenSummary } from "@/domain/types";
import type { Repositories } from "@/repositories/interfaces";

// Feeding interval thresholds by approximate age (days)
const FEEDING_INTERVAL_HOURS = {
  newborn: 2,   // 0-7 days
  young: 3,     // 7-14 days
  older: 4,     // 14+ days
};

function getFeedingIntervalHours(estimatedAgeDays?: number): number {
  if (!estimatedAgeDays || estimatedAgeDays <= 7) return FEEDING_INTERVAL_HOURS.newborn;
  if (estimatedAgeDays <= 14) return FEEDING_INTERVAL_HOURS.young;
  return FEEDING_INTERVAL_HOURS.older;
}

export async function computeAlertsForKitten(
  kitten: Kitten,
  repos: Repositories
): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const yesterday = subHours(now, 24);

  // ── Weight alerts ──────────────────────────────────────────────────────────
  const weights = await repos.weights.getByKitten(kitten.id);
  if (weights.length >= 2) {
    const latest = weights[0];
    const previous = weights[1];
    if (latest.weightGrams < previous.weightGrams) {
      alerts.push({
        id: uuid(),
        kittenId: kitten.id,
        kittenName: kitten.name,
        type: "weight_loss",
        severity: "critical",
        params: { kittenName: kitten.name, lostGrams: previous.weightGrams - latest.weightGrams },
        timestamp: now,
      });
    }

    const recentWeights = weights.filter((w) => w.timestamp >= yesterday);
    if (recentWeights.length > 0) {
      const maxRecent = Math.max(...recentWeights.map((w) => w.weightGrams));
      const minRecent = Math.min(...recentWeights.map((w) => w.weightGrams));
      if (maxRecent - minRecent < 5 && recentWeights.length >= 2) {
        alerts.push({
          id: uuid(),
          kittenId: kitten.id,
          kittenName: kitten.name,
          type: "no_weight_gain",
          severity: "warning",
          params: { kittenName: kitten.name },
          timestamp: now,
        });
      }
    }
  }

  // ── Feeding alerts ─────────────────────────────────────────────────────────
  const intervalHours = getFeedingIntervalHours(kitten.estimatedAgeDays);
  const recentFeedings = await repos.feedings.getByKittenSince(
    kitten.id,
    subHours(now, intervalHours + 1)
  );

  if (recentFeedings.length === 0) {
    const allFeedings = await repos.feedings.getRecentForKitten(kitten.id, 1);
    if (allFeedings.length === 0 || allFeedings[0].timestamp < subHours(now, intervalHours)) {
      alerts.push({
        id: uuid(),
        kittenId: kitten.id,
        kittenName: kitten.name,
        type: "missed_feeding",
        severity: "warning",
        params: { kittenName: kitten.name, hours: intervalHours },
        timestamp: now,
      });
    }
  }

  // Check rolling 24h intake vs 7-day rolling daily average
  const last24hFeedings = await repos.feedings.getByKittenSince(
    kitten.id,
    subHours(now, 24)
  );
  const weekFeedings = await repos.feedings.getByKittenSince(
    kitten.id,
    subHours(now, 168)
  );

  const isFormula = (f: { foodType?: string }) => !f.foodType || f.foodType === "formula";
  if (weekFeedings.length > 0) {
    const weekTotal = weekFeedings.filter(isFormula).reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0);
    const weekDailyAvg = weekTotal / 7;
    const last24hTotal = last24hFeedings.filter(isFormula).reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0);

    if (weekDailyAvg > 0 && last24hTotal < weekDailyAvg * 0.6) {
      alerts.push({
        id: uuid(),
        kittenId: kitten.id,
        kittenName: kitten.name,
        type: "low_daily_intake",
        severity: "warning",
        params: { kittenName: kitten.name, todayMl: last24hTotal, avgMl: Math.round(weekDailyAvg) },
        timestamp: new Date(),
      });
    }
  }

  // ── Medication alerts ──────────────────────────────────────────────────────
  const activeMeds = await repos.medications.getActiveForKitten(kitten.id);
  for (const med of activeMeds) {
    const latest = await repos.administrations.getLatestForMedication(med.id);
    const dueAt = latest
      ? new Date(latest.timestamp.getTime() + med.frequencyHours * 3600 * 1000)
      : med.startDate;

    if (dueAt <= now) {
      const overdueMs = now.getTime() - dueAt.getTime();
      const overdueHours = overdueMs / 3600000;
      alerts.push({
        id: uuid(),
        kittenId: kitten.id,
        kittenName: kitten.name,
        type: overdueHours > 1 ? "medication_overdue" : "medication_due",
        severity: overdueHours > 1 ? "critical" : "warning",
        params: overdueHours > 1
          ? { kittenName: kitten.name, medicationName: med.name, overdueHours: Math.round(overdueHours) }
          : { kittenName: kitten.name, medicationName: med.name },
        timestamp: now,
      });
    }
  }

  return alerts;
}

export async function computeAllAlerts(
  repos: Repositories
): Promise<Alert[]> {
  const kittens = await repos.kittens.getActive();
  const alertGroups = await Promise.all(
    kittens.map((k) => computeAlertsForKitten(k, repos))
  );
  return alertGroups.flat();
}

export async function buildKittenSummary(
  kitten: Kitten,
  repos: Repositories
): Promise<KittenSummary> {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const [latestWeight, prevWeight, todayFeedings, todayEliminations, activeMeds, alerts] =
    await Promise.all([
      repos.weights.getLatestForKitten(kitten.id),
      repos.weights.getByKitten(kitten.id).then((ws) => ws[1]),
      repos.feedings.getByKittenSince(kitten.id, startOfDay),
      repos.eliminations.getByKittenSince(kitten.id, startOfDay),
      repos.medications.getActiveForKitten(kitten.id),
      computeAlertsForKitten(kitten, repos),
    ]);

  return {
    kitten,
    currentWeightGrams: latestWeight?.weightGrams,
    weightChangeGrams:
      latestWeight && prevWeight
        ? latestWeight.weightGrams - prevWeight.weightGrams
        : undefined,
    feedingsToday: todayFeedings.length,
    totalConsumedMlToday: todayFeedings
      .filter((f) => !f.foodType || f.foodType === "formula")
      .reduce((s, f) => s + (f.amountConsumedMl ?? 0), 0),
    totalConsumedGramsToday: todayFeedings
      .filter((f) => f.foodType === "wet" || f.foodType === "solid")
      .reduce((s, f) => s + (f.amountConsumedGrams ?? 0), 0),
    eliminationsToday: todayEliminations.length,
    activeMedications: activeMeds.length,
    alerts,
  };
}
