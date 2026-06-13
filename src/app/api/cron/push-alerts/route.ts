import { NextRequest } from "next/server";
import webpush from "web-push";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { buildKittenSummaryFromData } from "@/services/alert.service";
import {
  rowToKitten,
  rowToFeeding,
  rowToWeight,
  rowToMedication,
  rowToAdministration,
  rowToElimination,
} from "@/db/repositories/supabase/mappers";
import type { Alert } from "@/domain/types";

export const dynamic = "force-dynamic";

const COOLDOWN_MS = 2 * 60 * 60 * 1000;

// Vercel cron passes Authorization: Bearer <CRON_SECRET>.
// Skip auth check when no secret is configured (local dev).
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

function alertBody(alert: Alert): string {
  let msg = alert.type.replace(/_/g, " ");
  for (const [k, v] of Object.entries(alert.params)) {
    msg = msg.replaceAll(`{${k}}`, String(v));
  }
  return msg;
}

function alertUrl(alert: Alert): string {
  const base = `/kittens/${alert.kittenId}`;
  if (alert.type === "missed_feeding" || alert.type === "low_daily_intake")
    return `/feed?kittenId=${alert.kittenId}`;
  if (alert.type === "weight_loss" || alert.type === "no_weight_gain")
    return `/weight?kittenId=${alert.kittenId}`;
  if (alert.type === "medication_due" || alert.type === "medication_overdue")
    return `/medications?kittenId=${alert.kittenId}`;
  return base;
}

export async function POST(req: NextRequest) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL ?? "admin@example.com"}`,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  if (!isAuthorized(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const now = new Date();
  const cooldownSince = new Date(now.getTime() - COOLDOWN_MS).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();

  // ── 1. Load all active kittens ──────────────────────────────────────────────
  const { data: kittenRows } = await admin
    .from("kittens")
    .select("*")
    .eq("status", "active");

  if (!kittenRows?.length) return Response.json({ sent: 0 });

  const kittens = kittenRows.map(rowToKitten);
  const kittenIds = kittenRows.map((r) => r.id as string);

  // ── 2. Bulk-fetch care data for all kittens in parallel ─────────────────────
  const [feedRows, weightRows, elimRows, medRows, adminRows, logRows, subRows] =
    await Promise.all([
      admin.from("feedings").select("*").in("kitten_id", kittenIds).gte("timestamp", weekAgo),
      admin.from("weight_entries").select("*").in("kitten_id", kittenIds),
      admin.from("elimination_entries").select("*").in("kitten_id", kittenIds)
        .gte("timestamp", new Date(now.setHours(0, 0, 0, 0)).toISOString()),
      admin.from("medications").select("*").in("kitten_id", kittenIds),
      admin.from("medication_administrations").select("*").in("kitten_id", kittenIds),
      // Alerts sent within the cooldown window
      admin.from("push_alert_log").select("kitten_id, alert_type")
        .in("kitten_id", kittenIds).gte("pushed_at", cooldownSince),
      // Push subscriptions for all household members of these kittens
      admin.from("push_subscriptions").select("user_id, endpoint, p256dh, auth_key, household_members!inner(household_id)")
        .in("household_members.household_id",
          [...new Set(kittenRows.map((r) => r.household_id as string))]),
    ]);

  // ── 3. Build lookup maps ────────────────────────────────────────────────────
  const cooledDown = new Set(
    (logRows.data ?? []).map((l) => `${l.kitten_id}:${l.alert_type}`)
  );

  // Map householdId → subscriptions
  type SubRow = { endpoint: string; p256dh: string; auth_key: string; household_members: { household_id: string }[] | { household_id: string } };
  const householdSubs = new Map<string, SubRow[]>();
  for (const sub of (subRows.data ?? []) as SubRow[]) {
    const hids = Array.isArray(sub.household_members)
      ? sub.household_members.map((h) => h.household_id)
      : [sub.household_members.household_id];
    for (const hid of hids) {
      const arr = householdSubs.get(hid) ?? [];
      arr.push(sub);
      householdSubs.set(hid, arr);
    }
  }

  // ── 4. Compute alerts per kitten and send push ──────────────────────────────
  let sent = 0;
  const logInserts: { kitten_id: string; alert_type: string }[] = [];

  for (const kitten of kittens) {
    const row = kittenRows.find((r) => r.id === kitten.id)!;
    const householdId = row.household_id as string;

    const feedings = (feedRows.data ?? [])
      .filter((r) => r.kitten_id === kitten.id)
      .map(rowToFeeding);
    const weights = (weightRows.data ?? [])
      .filter((r) => r.kitten_id === kitten.id)
      .map(rowToWeight);
    const eliminations = (elimRows.data ?? [])
      .filter((r) => r.kitten_id === kitten.id)
      .map(rowToElimination);
    const medications = (medRows.data ?? [])
      .filter((r) => r.kitten_id === kitten.id)
      .map(rowToMedication);
    const administrations = (adminRows.data ?? [])
      .filter((r) => r.kitten_id === kitten.id)
      .map(rowToAdministration);

    const { alerts } = buildKittenSummaryFromData(
      kitten, feedings, weights, eliminations, medications, administrations
    );

    const subs = householdSubs.get(householdId) ?? [];
    if (!subs.length) continue;

    for (const alert of alerts) {
      const key = `${alert.kittenId}:${alert.type}`;
      if (cooledDown.has(key)) continue;

      const payload = JSON.stringify({
        title: alert.kittenName,
        body: alertBody(alert),
        icon: "/icon.svg",
        tag: key,
        url: alertUrl(alert),
      });

      await Promise.allSettled(
        subs.map((sub) =>
          webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload
          )
        )
      );

      cooledDown.add(key);
      logInserts.push({ kitten_id: alert.kittenId, alert_type: alert.type });
      sent++;
    }
  }

  // ── 5. Log sent alerts for cooldown tracking ─────────────────────────────────
  if (logInserts.length) {
    await admin.from("push_alert_log").insert(logInserts);
  }

  return Response.json({ sent });
}
