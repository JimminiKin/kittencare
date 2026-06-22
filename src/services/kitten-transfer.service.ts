import { getSupabaseClient } from "@/lib/supabase/client";

export interface KittenTransfer {
  id: string;
  token: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export async function getTransfersForKitten(kittenId: string): Promise<KittenTransfer[]> {
  const { data } = await getSupabaseClient()
    .from("kitten_transfers")
    .select("id, token, expires_at, accepted_at, created_at")
    .eq("kitten_id", kittenId)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    token: r.token,
    expiresAt: r.expires_at,
    acceptedAt: r.accepted_at ?? null,
    createdAt: r.created_at,
  }));
}

export async function createTransferToken(
  kittenId: string,
  householdId: string,
  createdBy: string
): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from("kitten_transfers")
    .insert({ kitten_id: kittenId, household_id: householdId, created_by: createdBy })
    .select("token")
    .single();

  if (error) throw new Error(error.message);
  return data?.token ?? null;
}

export async function revokeTransfer(id: string): Promise<void> {
  await getSupabaseClient().from("kitten_transfers").delete().eq("id", id);
}
