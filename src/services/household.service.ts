import { getSupabaseClient } from "@/lib/supabase/client";

export interface HouseholdMember {
  userId: string;
  displayName: string;
  role: "owner" | "member";
  joinedAt: string;
}

export interface HouseholdInfo {
  id: string;
  name: string;
  myRole: "owner" | "member";
  members: HouseholdMember[];
}

export interface PendingInvite {
  id: string;
  invitedEmail: string;
  expiresAt: string;
}

export async function getHouseholdInfo(userId: string): Promise<HouseholdInfo | null> {
  const supabase = getSupabaseClient();

  const { data: mine } = await supabase
    .from("household_members")
    .select("household_id, role, households(id, name)")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!mine) return null;

  const hid = mine.household_id;
  const household = mine.households as unknown as { id: string; name: string } | null;

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, role, joined_at, profiles(display_name)")
    .eq("household_id", hid);

  return {
    id: hid,
    name: household?.name ?? "My Household",
    myRole: mine.role as "owner" | "member",
    members: (members ?? []).map((m: any) => ({
      userId: m.user_id,
      displayName: m.profiles?.display_name ?? "Unknown",
      role: m.role,
      joinedAt: m.joined_at,
    })),
  };
}

export async function getPendingInvites(householdId: string): Promise<PendingInvite[]> {
  const { data } = await getSupabaseClient()
    .from("household_invites")
    .select("id, invited_email, expires_at")
    .eq("household_id", householdId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString());

  return (data ?? []).map((r: any) => ({
    id: r.id,
    invitedEmail: r.invited_email,
    expiresAt: r.expires_at,
  }));
}

export async function createInvite(
  householdId: string,
  invitedEmail: string,
  invitedBy: string
): Promise<string | null> {
  const { data } = await getSupabaseClient()
    .from("household_invites")
    .insert({ household_id: householdId, invited_email: invitedEmail, invited_by: invitedBy })
    .select("token")
    .single();
  return data?.token ?? null;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await getSupabaseClient().from("household_invites").delete().eq("id", inviteId);
}

export async function removeMember(householdId: string, userId: string): Promise<void> {
  await getSupabaseClient()
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", userId);
}

export async function transferOwnership(
  householdId: string,
  newOwnerId: string,
  currentUserId: string
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase
    .from("household_members")
    .update({ role: "owner" })
    .eq("household_id", householdId)
    .eq("user_id", newOwnerId);
  await supabase
    .from("household_members")
    .update({ role: "member" })
    .eq("household_id", householdId)
    .eq("user_id", currentUserId);
}

export async function renameHousehold(householdId: string, newName: string): Promise<void> {
  await getSupabaseClient()
    .from("households")
    .update({ name: newName.trim() })
    .eq("id", householdId);
}

export async function leaveHousehold(householdId: string, userId: string): Promise<void> {
  await getSupabaseClient()
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", userId);
}
