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

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const admin = getSupabaseAdmin();

  let query = admin
    .from("kittens")
    .select("id, name, status, photo, household_id, households(id, name)")
    .order("name");

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  const { data, error } = await query.limit(50);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const kittens = (data ?? []).map((k: any) => ({
    id: k.id,
    name: k.name,
    status: k.status,
    photo: k.photo,
    householdId: k.household_id,
    householdName: k.households?.name ?? "Unknown",
  }));

  return Response.json({ kittens });
}
