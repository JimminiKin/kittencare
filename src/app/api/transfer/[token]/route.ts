import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = getSupabaseAdmin();

  const { data, error } = await admin
    .from("kitten_transfers")
    .select("id, expires_at, accepted_at, created_by, kitten_id, kittens(name, photo), households(name)")
    .eq("token", token)
    .single();

  if (error || !data) {
    return Response.json({ error: "notFound" }, { status: 404 });
  }
  if (data.accepted_at) {
    return Response.json({ error: "alreadyAccepted" }, { status: 410 });
  }
  if (new Date(data.expires_at) < new Date()) {
    return Response.json({ error: "notFound" }, { status: 410 });
  }

  const kitten = data.kittens as unknown as { name: string; photo: string | null } | null;
  const household = data.households as unknown as { name: string } | null;

  let transferredByName: string | null = null;
  if (data.created_by) {
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name")
      .eq("id", data.created_by)
      .single();
    transferredByName = profile?.display_name ?? null;
  }

  return Response.json({
    kittenName: kitten?.name ?? "Kitten",
    kittenPhoto: kitten?.photo ?? null,
    fromHousehold: household?.name ?? "Household",
    transferredBy: transferredByName,
  });
}
