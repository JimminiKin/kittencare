"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth.store";

let _cache: Map<string, string> | null = null;
let _loading = false;

export function useProfiles(): Map<string, string> {
  const { user } = useAuthStore();
  const [profiles, setProfiles] = useState<Map<string, string>>(_cache ?? new Map());

  useEffect(() => {
    if (!user) { _cache = null; _loading = false; setProfiles(new Map()); return; }
    if (_cache) { setProfiles(_cache); return; }
    if (_loading) return; // StrictMode second mount: skip, first fetch is already in-flight
    _loading = true;

    getSupabaseClient()
      .from("household_members")
      .select("user_id, profiles(display_name)")
      .then(({ data, error }) => {
        if (error) { _loading = false; return; }
        const map = new Map<string, string>();
        for (const row of data ?? []) {
          const profile = row.profiles as unknown as { display_name: string } | null;
          if (profile?.display_name) map.set(row.user_id, profile.display_name);
        }
        _cache = map;
        _loading = false;
        setProfiles(map);
      });
  }, [user?.id]);

  return profiles;
}
