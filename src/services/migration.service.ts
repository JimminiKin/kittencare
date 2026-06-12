import { getSupabaseClient } from "@/lib/supabase/client";
import { getRepositories } from "@/db/index";

const KEY = "kittencare-migrated";

export function isMigrated(userId: string): boolean {
  return localStorage.getItem(`${KEY}-${userId}`) === "1";
}

export function markMigrated(userId: string): void {
  localStorage.setItem(`${KEY}-${userId}`, "1");
}

function iso(d: Date | undefined): string | null {
  return d ? d.toISOString() : null;
}

function isoDate(d: Date | undefined): string | null {
  return d ? d.toISOString().split("T")[0] : null;
}

export async function migrateLocalToCloud(
  userId: string
): Promise<{ count: number; error: string | null }> {
  const supabase = getSupabaseClient();
  const repos = getRepositories();

  // Resolve the user's household
  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) return { count: 0, error: "No household found" };
  const hid = membership.household_id;

  // Load everything from IndexedDB in parallel
  const [kittens, feedings, weights, eliminations, medications, admins, health] =
    await Promise.all([
      repos.kittens.getAll(),
      repos.feedings.getAll(),
      repos.weights.getAll(),
      repos.eliminations.getAll(),
      repos.medications.getAll(),
      repos.administrations.getAll(),
      repos.health.getAll(),
    ]);

  const total =
    kittens.length + feedings.length + weights.length +
    eliminations.length + medications.length + admins.length + health.length;

  if (total === 0) {
    markMigrated(userId);
    return { count: 0, error: null };
  }

  // 1. Kittens first — everything else references them
  if (kittens.length > 0) {
    const { error } = await supabase.from("kittens").upsert(
      kittens.map((k) => ({
        id: k.id,
        household_id: hid,
        created_by: userId,
        name: k.name,
        photo: k.photo ?? null,
        birth_date: isoDate(k.birthDate),
        estimated_age_days: k.estimatedAgeDays ?? null,
        sex: k.sex ?? null,
        intake_date: isoDate(k.intakeDate),
        status: k.status,
        notes: k.notes ?? null,
      })),
      { onConflict: "id" }
    );
    if (error) return { count: 0, error: error.message };
  }

  // 2. Events that only reference kittens — run in parallel
  const eventResults = await Promise.all([
    feedings.length > 0
      ? supabase.from("feedings").upsert(
          feedings.map((f) => ({
            id: f.id,
            kitten_id: f.kittenId,
            household_id: hid,
            recorded_by: userId,
            timestamp: iso(f.timestamp),
            food_type: f.foodType ?? "formula",
            method: f.method ?? null,
            formula_type: f.formulaType ?? null,
            amount_offered_ml: f.amountOfferedMl ?? null,
            amount_consumed_ml: f.amountConsumedMl ?? null,
            amount_consumed_grams: f.amountConsumedGrams ?? null,
            notes: f.notes ?? null,
          })),
          { onConflict: "id" }
        )
      : null,

    weights.length > 0
      ? supabase.from("weight_entries").upsert(
          weights.map((w) => ({
            id: w.id,
            kitten_id: w.kittenId,
            household_id: hid,
            recorded_by: userId,
            timestamp: iso(w.timestamp),
            weight_grams: w.weightGrams,
          })),
          { onConflict: "id" }
        )
      : null,

    eliminations.length > 0
      ? supabase.from("elimination_entries").upsert(
          eliminations.map((e) => ({
            id: e.id,
            kitten_id: e.kittenId,
            household_id: hid,
            recorded_by: userId,
            timestamp: iso(e.timestamp),
            pee: e.pee,
            poo: e.poo,
            poo_consistency: e.pooConsistency ?? null,
            poo_color: e.pooColor ?? null,
            notes: e.notes ?? null,
          })),
          { onConflict: "id" }
        )
      : null,

    medications.length > 0
      ? supabase.from("medications").upsert(
          medications.map((m) => ({
            id: m.id,
            kitten_id: m.kittenId,
            household_id: hid,
            created_by: userId,
            name: m.name,
            dosage: m.dosage,
            frequency_hours: m.frequencyHours,
            start_date: iso(m.startDate),
            end_date: iso(m.endDate) ?? null,
            notes: m.notes ?? null,
          })),
          { onConflict: "id" }
        )
      : null,

    health.length > 0
      ? supabase.from("health_observations").upsert(
          health.map((h) => ({
            id: h.id,
            kitten_id: h.kittenId,
            household_id: hid,
            recorded_by: userId,
            timestamp: iso(h.timestamp),
            energy: h.energy,
            hydration: h.hydration,
            appetite: h.appetite,
            temperature: h.temperature ?? null,
            notes: h.notes ?? null,
          })),
          { onConflict: "id" }
        )
      : null,
  ]);

  for (const r of eventResults) {
    if (r?.error) return { count: 0, error: r.error.message };
  }

  // 3. Administrations last — depend on medications
  if (admins.length > 0) {
    const { error } = await supabase.from("medication_administrations").upsert(
      admins.map((a) => ({
        id: a.id,
        medication_id: a.medicationId,
        kitten_id: a.kittenId,
        household_id: hid,
        recorded_by: userId,
        timestamp: iso(a.timestamp),
      })),
      { onConflict: "id" }
    );
    if (error) return { count: 0, error: error.message };
  }

  markMigrated(userId);
  return { count: total, error: null };
}
