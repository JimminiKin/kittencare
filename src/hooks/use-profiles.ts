"use client";

import { useQuery } from "@tanstack/react-query";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";
import { qk } from "@/lib/query-keys";

export function useProfiles(): Map<string, string> {
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: qk.profiles(),
    queryFn: async () => {
      const { data, error } = await getSupabaseClient()
        .from("household_members")
        .select("user_id, profiles(display_name)");
      if (error) throw error;
      const record: Record<string, string> = {};
      for (const row of data ?? []) {
        const profile = row.profiles as unknown as { display_name: string } | null;
        if (profile?.display_name) record[row.user_id] = profile.display_name;
      }
      return record;
    },
    select: (record) => new Map(Object.entries(record)),
    enabled: !!user,
    staleTime: 5 * 60_000,
  });

  return data ?? new Map();
}
