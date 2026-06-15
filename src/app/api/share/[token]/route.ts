import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data: share } = await admin
    .from("share_tokens")
    .select("*, kittens(*)")
    .eq("token", token)
    .single();

  if (!share) return Response.json({ error: "notFound" }, { status: 404 });
  if (share.expires_at && new Date(share.expires_at) < new Date()) {
    return Response.json({ error: "expired" }, { status: 410 });
  }

  const kitten = share.kittens as any;
  const fields: string[] = share.fields ?? [];
  const kid = share.kitten_id;

  const [weights, feedings, medications, admins, health] = await Promise.all([
    fields.includes("weight")
      ? admin.from("weight_entries").select("id, timestamp, weight_grams").eq("kitten_id", kid).order("timestamp", { ascending: false }).limit(30)
      : null,
    fields.includes("feedings")
      ? admin.from("feedings").select("id, timestamp, food_type, method, amount_consumed_ml, amount_consumed_grams").eq("kitten_id", kid).order("timestamp", { ascending: false }).limit(20)
      : null,
    fields.includes("medications")
      ? admin.from("medications").select("id, name, dosage, frequency_hours, end_date, notes").eq("kitten_id", kid)
      : null,
    fields.includes("medications")
      ? admin.from("medication_administrations").select("medication_id, timestamp").eq("kitten_id", kid).order("timestamp", { ascending: false }).limit(50)
      : null,
    fields.includes("health")
      ? admin.from("health_observations").select("id, timestamp, energy, hydration, appetite, temperature, notes").eq("kitten_id", kid).order("timestamp", { ascending: false }).limit(10)
      : null,
  ]);

  // Attach last admin timestamp to each medication
  const adminsData = admins?.data ?? [];
  const medsWithLast = (medications?.data ?? []).map((m: any) => ({
    ...m,
    lastGiven: adminsData.find((a: any) => a.medication_id === m.id)?.timestamp ?? null,
  }));

  return Response.json({
    kitten: {
      name: kitten.name,
      estimatedAgeDays: kitten.estimated_age_days ?? null,
      birthDate: kitten.birth_date ?? null,
      updatedAt: kitten.updated_at ?? null,
      sex: kitten.sex ?? null,
      notes: kitten.notes ?? null,
    },
    fields,
    generatedAt: new Date().toISOString(),
    expiresAt: share.expires_at ?? null,
    weights: weights?.data ?? undefined,
    feedings: feedings?.data ?? undefined,
    medications: fields.includes("medications") ? medsWithLast : undefined,
    health: health?.data ?? undefined,
  });
}
