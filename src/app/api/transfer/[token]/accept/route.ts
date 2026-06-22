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

  // Recipient must already have a household
  const { data: recipientMembership } = await admin
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!recipientMembership) {
    return Response.json({ error: "noHousehold" }, { status: 422 });
  }

  // Prevent transferring to the same household
  if (recipientMembership.household_id === transfer.household_id) {
    return Response.json({ error: "sameHousehold" }, { status: 422 });
  }

  // Fetch the source kitten profile
  const { data: sourceKitten } = await admin
    .from("kittens")
    .select("name, photo, birth_date, estimated_age_days, sex, intake_date, notes")
    .eq("id", transfer.kitten_id)
    .single();

  if (!sourceKitten) return Response.json({ error: "notFound" }, { status: 404 });

  // Create kitten in recipient's household (fresh start — no history)
  const { error: insertError } = await admin.from("kittens").insert({
    household_id: recipientMembership.household_id,
    created_by: user.id,
    name: sourceKitten.name,
    photo: sourceKitten.photo,
    birth_date: sourceKitten.birth_date,
    estimated_age_days: sourceKitten.estimated_age_days,
    sex: sourceKitten.sex,
    intake_date: sourceKitten.intake_date,
    notes: sourceKitten.notes,
    status: "active",
  });

  if (insertError) return Response.json({ error: insertError.message }, { status: 500 });

  // Mark original kitten as transferred
  await admin
    .from("kittens")
    .update({ status: "transferred" })
    .eq("id", transfer.kitten_id);

  // Mark transfer as accepted
  await admin
    .from("kitten_transfers")
    .update({ accepted_at: new Date().toISOString(), accepted_by: user.id })
    .eq("id", transfer.id);

  return Response.json({ success: true });
}
