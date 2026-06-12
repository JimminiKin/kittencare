import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const admin = getSupabaseAdmin();

  const { data: { user }, error: authError } = await admin.auth.getUser(
    authHeader.replace("Bearer ", "")
  );
  if (authError || !user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json();

  const { data: invite } = await admin
    .from("household_invites")
    .select("id, household_id, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (!invite) return Response.json({ error: "notFound" }, { status: 404 });
  if (invite.accepted_at) return Response.json({ error: "alreadyAccepted" }, { status: 410 });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return Response.json({ error: "notFound" }, { status: 410 });
  }

  // Idempotent: skip insert if already a member
  const { data: existing } = await admin
    .from("household_members")
    .select("user_id")
    .eq("household_id", invite.household_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: memberError } = await admin
      .from("household_members")
      .insert({ household_id: invite.household_id, user_id: user.id, role: "member" });
    if (memberError) return Response.json({ error: memberError.message }, { status: 500 });
  }

  await admin
    .from("household_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  return Response.json({ success: true });
}
