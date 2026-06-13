import { getSupabaseClient } from "@/lib/supabase/client";

export type ShareField = "weight" | "feedings" | "medications" | "health";

export interface ShareToken {
  id: string;
  token: string;
  fields: ShareField[];
  expiresAt: string | null;
  createdAt: string;
}

export async function getShareTokensForKitten(kittenId: string): Promise<ShareToken[]> {
  const { data } = await getSupabaseClient()
    .from("share_tokens")
    .select("id, token, fields, expires_at, created_at")
    .eq("kitten_id", kittenId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((r: any) => ({
    id: r.id,
    token: r.token,
    fields: r.fields as ShareField[],
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
  }));
}

export async function createShareToken(
  kittenId: string,
  householdId: string,
  fields: ShareField[],
  expiresAt: Date | null
): Promise<string | null> {
  const { data, error } = await getSupabaseClient()
    .from("share_tokens")
    .insert({
      kitten_id: kittenId,
      household_id: householdId,
      fields,
      expires_at: expiresAt?.toISOString() ?? null,
    })
    .select("token")
    .single();

  if (error) throw new Error(error.message);
  return data?.token ?? null;
}

export async function revokeShareToken(id: string): Promise<void> {
  await getSupabaseClient().from("share_tokens").delete().eq("id", id);
}
