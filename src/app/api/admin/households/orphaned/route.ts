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

async function findOrphanedIds(admin: ReturnType<typeof getSupabaseAdmin>): Promise<string[]> {
  // All households
  const { data: all } = await admin.from("households").select("id");
  // Households that have at least one member
  const { data: withMembers } = await admin
    .from("household_members")
    .select("household_id");

  const populated = new Set((withMembers ?? []).map((r: any) => r.household_id));
  return (all ?? []).map((r: any) => r.id).filter((id: string) => !populated.has(id));
}

export async function GET(req: NextRequest) {
  const user = await getAdminUser(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const ids = await findOrphanedIds(admin);
  return Response.json({ count: ids.length, ids });
}

export async function DELETE(req: NextRequest) {
  const user = await getAdminUser(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();
  const ids = await findOrphanedIds(admin);

  if (ids.length === 0) return Response.json({ deleted: 0 });

  const { error } = await admin.from("households").delete().in("id", ids);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ deleted: ids.length });
}
