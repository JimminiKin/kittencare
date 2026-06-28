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

export async function POST(req: NextRequest) {
  const user = await getAdminUser(req.headers.get("authorization"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });

  const admin = getSupabaseAdmin();

  // Fetch all households with their owner's display name in one query
  const { data: rows, error } = await admin
    .from("household_members")
    .select("household_id, profiles(display_name)")
    .eq("role", "owner")
    .order("joined_at", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Build a map: householdId → first owner's display name
  // (ascending joined_at means first owner row wins for each household)
  const ownerMap = new Map<string, string>();
  for (const row of rows ?? []) {
    if (!ownerMap.has(row.household_id)) {
      const displayName = (row.profiles as any)?.display_name as string | undefined;
      if (displayName) ownerMap.set(row.household_id, displayName);
    }
  }

  let renamed = 0;
  let skipped = 0;

  for (const [householdId, displayName] of ownerMap) {
    const firstName = displayName.trim().split(/\s+/)[0];
    if (!firstName) { skipped++; continue; }
    const newName = `${firstName}'s Household`;
    const { error: updateError } = await admin
      .from("households")
      .update({ name: newName })
      .eq("id", householdId);
    if (updateError) { skipped++; } else { renamed++; }
  }

  return Response.json({ renamed, skipped });
}
