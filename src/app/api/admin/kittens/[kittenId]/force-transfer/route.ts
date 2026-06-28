import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function getAdminUser(authHeader: string | null) {
  if (!authHeader) return null;
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (error || !user) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  return profile?.is_admin === true ? user : null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kittenId: string }> }
) {
  const { kittenId } = await params;

  const user = await getAdminUser(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { targetHouseholdId } = await req.json();
  if (!targetHouseholdId) {
    return Response.json({ error: "targetHouseholdId required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: sourceKitten } = await admin
    .from("kittens")
    .select("name, photo, birth_date, estimated_age_days, sex, intake_date, notes, household_id, status")
    .eq("id", kittenId)
    .single();

  if (!sourceKitten) return Response.json({ error: "notFound" }, { status: 404 });
  if (sourceKitten.household_id === targetHouseholdId) {
    return Response.json({ error: "sameHousehold" }, { status: 422 });
  }

  const { data: newKitten, error: kittenInsertError } = await admin
    .from("kittens")
    .insert({
      household_id: targetHouseholdId,
      created_by: user.id,
      name: sourceKitten.name,
      photo: sourceKitten.photo,
      birth_date: sourceKitten.birth_date,
      estimated_age_days: sourceKitten.estimated_age_days,
      sex: sourceKitten.sex,
      intake_date: sourceKitten.intake_date,
      notes: sourceKitten.notes,
      status: "active",
    })
    .select("id")
    .single();

  if (kittenInsertError || !newKitten) {
    return Response.json({ error: kittenInsertError?.message ?? "insert failed" }, { status: 500 });
  }

  const newKittenId = newKitten.id;

  const [
    { data: feedings },
    { data: weights },
    { data: eliminations },
    { data: medications },
    { data: health },
  ] = await Promise.all([
    admin.from("feedings").select("*").eq("kitten_id", kittenId),
    admin.from("weight_entries").select("*").eq("kitten_id", kittenId),
    admin.from("elimination_entries").select("*").eq("kitten_id", kittenId),
    admin.from("medications").select("*").eq("kitten_id", kittenId),
    admin.from("health_observations").select("*").eq("kitten_id", kittenId),
  ]);

  if (feedings?.length) {
    await admin.from("feedings").insert(
      feedings.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest, kitten_id: newKittenId, household_id: targetHouseholdId,
      }))
    );
  }

  if (weights?.length) {
    await admin.from("weight_entries").insert(
      weights.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest, kitten_id: newKittenId, household_id: targetHouseholdId,
      }))
    );
  }

  if (eliminations?.length) {
    await admin.from("elimination_entries").insert(
      eliminations.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest, kitten_id: newKittenId, household_id: targetHouseholdId,
      }))
    );
  }

  if (medications?.length) {
    const medIdMap = new Map<string, string>();
    for (const med of medications as any[]) {
      const { id: oldMedId, kitten_id: _k, household_id: _h, ...medRest } = med;
      const { data: newMed } = await admin
        .from("medications")
        .insert({ ...medRest, kitten_id: newKittenId, household_id: targetHouseholdId })
        .select("id")
        .single();
      if (newMed) medIdMap.set(oldMedId, newMed.id);
    }

    const { data: admins } = await admin
      .from("medication_administrations")
      .select("*")
      .eq("kitten_id", kittenId);

    if (admins?.length) {
      await admin.from("medication_administrations").insert(
        admins
          .filter((a: any) => medIdMap.has(a.medication_id))
          .map(({ id: _id, kitten_id: _k, household_id: _h, medication_id, ...rest }: any) => ({
            ...rest,
            kitten_id: newKittenId,
            household_id: targetHouseholdId,
            medication_id: medIdMap.get(medication_id),
          }))
      );
    }
  }

  if (health?.length) {
    await admin.from("health_observations").insert(
      health.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest, kitten_id: newKittenId, household_id: targetHouseholdId,
      }))
    );
  }

  await admin
    .from("kittens")
    .update({ status: "transferred" })
    .eq("id", kittenId);

  return Response.json({ success: true, newKittenId });
}
