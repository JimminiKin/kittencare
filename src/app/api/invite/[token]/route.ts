import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("household_invites")
    .select("id, invited_email, expires_at, accepted_at, invited_by, households(name)")
    .eq("token", token)
    .single();

  if (error || !data) {
    return Response.json({ error: "notFound" }, { status: 404 });
  }
  if (data.accepted_at) {
    return Response.json({ error: "alreadyAccepted" }, { status: 410 });
  }
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return Response.json({ error: "notFound" }, { status: 410 });
  }

  const household = data.households as unknown as { name: string } | null;

  let invitedByName: string | null = null;
  if (data.invited_by) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", data.invited_by)
      .single();
    invitedByName = profile?.display_name ?? null;
  }

  return Response.json({
    householdName: household?.name ?? "Household",
    invitedBy: invitedByName,
    invitedEmail: data.invited_email,
  });
}
