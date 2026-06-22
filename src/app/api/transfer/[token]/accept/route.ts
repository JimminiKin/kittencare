import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await admin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: transfer } = await admin
    .from("kitten_transfers")
    .select("id, kitten_id, household_id, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (!transfer) return Response.json({ error: "notFound" }, { status: 404 });
  if (transfer.accepted_at) return Response.json({ error: "alreadyAccepted" }, { status: 410 });
  if (new Date(transfer.expires_at) < new Date()) {
    return Response.json({ error: "notFound" }, { status: 410 });
  }

  const { data: recipientMembership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!recipientMembership) {
    return Response.json({ error: "noHousehold" }, { status: 422 });
  }

  if (recipientMembership.household_id === transfer.household_id) {
    return Response.json({ error: "sameHousehold" }, { status: 422 });
  }

  const newHhId = recipientMembership.household_id;
  const oldKittenId = transfer.kitten_id;

  const { data: sourceKitten } = await admin
    .from("kittens")
    .select("name, photo, birth_date, estimated_age_days, sex, intake_date, notes")
    .eq("id", oldKittenId)
    .single();

  if (!sourceKitten) return Response.json({ error: "notFound" }, { status: 404 });

  // Create kitten in recipient's household
  const { data: newKitten, error: kittenInsertError } = await admin
    .from("kittens")
    .insert({
      household_id: newHhId,
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

  // Fetch all care history in parallel
  const [
    { data: feedings },
    { data: weights },
    { data: eliminations },
    { data: medications },
    { data: health },
  ] = await Promise.all([
    admin.from("feedings").select("*").eq("kitten_id", oldKittenId),
    admin.from("weight_entries").select("*").eq("kitten_id", oldKittenId),
    admin.from("elimination_entries").select("*").eq("kitten_id", oldKittenId),
    admin.from("medications").select("*").eq("kitten_id", oldKittenId),
    admin.from("health_observations").select("*").eq("kitten_id", oldKittenId),
  ]);

  // Copy feedings
  if (feedings?.length) {
    await admin.from("feedings").insert(
      feedings.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest,
        kitten_id: newKittenId,
        household_id: newHhId,
      }))
    );
  }

  // Copy weight entries
  if (weights?.length) {
    await admin.from("weight_entries").insert(
      weights.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest,
        kitten_id: newKittenId,
        household_id: newHhId,
      }))
    );
  }

  // Copy elimination entries
  if (eliminations?.length) {
    await admin.from("elimination_entries").insert(
      eliminations.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest,
        kitten_id: newKittenId,
        household_id: newHhId,
      }))
    );
  }

  // Copy medications and build old→new ID map for administrations
  if (medications?.length) {
    const medIdMap = new Map<string, string>();

    for (const med of medications as any[]) {
      const { id: oldMedId, kitten_id: _k, household_id: _h, ...medRest } = med;
      const { data: newMed } = await admin
        .from("medications")
        .insert({ ...medRest, kitten_id: newKittenId, household_id: newHhId })
        .select("id")
        .single();
      if (newMed) medIdMap.set(oldMedId, newMed.id);
    }

    // Copy administrations with remapped medication IDs
    const { data: admins } = await admin
      .from("medication_administrations")
      .select("*")
      .eq("kitten_id", oldKittenId);

    if (admins?.length) {
      await admin.from("medication_administrations").insert(
        admins
          .filter((a: any) => medIdMap.has(a.medication_id))
          .map(({ id: _id, kitten_id: _k, household_id: _h, medication_id, ...rest }: any) => ({
            ...rest,
            kitten_id: newKittenId,
            household_id: newHhId,
            medication_id: medIdMap.get(medication_id),
          }))
      );
    }
  }

  // Copy health observations
  if (health?.length) {
    await admin.from("health_observations").insert(
      health.map(({ id: _id, kitten_id: _k, household_id: _h, ...rest }: any) => ({
        ...rest,
        kitten_id: newKittenId,
        household_id: newHhId,
      }))
    );
  }

  // Mark original kitten as transferred
  await admin
    .from("kittens")
    .update({ status: "transferred" })
    .eq("id", oldKittenId);

  // Mark transfer as accepted
  await admin
    .from("kitten_transfers")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", transfer.id);

  return Response.json({ success: true });
}
