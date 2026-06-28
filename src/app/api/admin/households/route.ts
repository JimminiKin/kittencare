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

export async function GET(req: NextRequest) {
  const user = await getAdminUser(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();

  const [{ data: households, error }, { data: kittenCounts }, { data: memberCounts }] =
    await Promise.all([
      admin.from("households").select("id, name").order("name"),
      admin.from("kittens").select("household_id").eq("status", "active"),
      admin.from("household_members").select("household_id"),
    ]);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const kittenMap = new Map<string, number>();
  for (const r of kittenCounts ?? []) {
    kittenMap.set(r.household_id, (kittenMap.get(r.household_id) ?? 0) + 1);
  }
  const memberMap = new Map<string, number>();
  for (const r of memberCounts ?? []) {
    memberMap.set(r.household_id, (memberMap.get(r.household_id) ?? 0) + 1);
  }

  const result = (households ?? []).map((h: any) => ({
    id: h.id,
    name: h.name,
    kittenCount: kittenMap.get(h.id) ?? 0,
    memberCount: memberMap.get(h.id) ?? 0,
  }));

  return Response.json({ households: result });
}
