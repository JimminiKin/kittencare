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
  const { data, error } = await admin
    .from("households")
    .select("id, name")
    .order("name");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ households: data });
}
