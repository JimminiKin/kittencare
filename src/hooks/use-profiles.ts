"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";

let _cache: Map<string, string> | null = null;

export function useProfiles(): Map<string, string> {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Map<string, string>>(_cache ?? new Map());

  useEffect(() => {
    if (!user) { _cache = null; setProfiles(new Map()); return; }
    if (_cache) { setProfiles(_cache); return; }

    getSupabaseClient()
      .from("household_members")
      .select("user_id, profiles(display_name)")
      .then(({ data }) => {
        const map = new Map<string, string>();
        for (const row of data ?? []) {
          const profile = row.profiles as unknown as { display_name: string } | null;
          if (profile?.display_name) map.set(row.user_id, profile.display_name);
        }
        _cache = map;
        setProfiles(map);
      });
  }, [user?.id]);

  return profiles;
}
