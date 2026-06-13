"use client";

import { useQuery } from "@tanstack/react-query";
import { getRepositories } from "@/db/index";
import { qk } from "@/lib/query-keys";
import type { Kitten } from "@/domain/types";

export function useKittens() {
  return useQuery<Kitten[]>({
    queryKey: qk.kittens(),
    queryFn: () => getRepositories().kittens.getAll(),
  });
}

export function useKitten(id: string | undefined) {
  const { data: kittens } = useKittens();
  return kittens?.find((k) => k.id === id);
}
