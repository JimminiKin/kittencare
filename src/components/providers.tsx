"use client";

import { useMemo } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { get, set, del } from "idb-keyval";
import { getQueryClient } from "@/lib/query-client";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function reviveDates(_key: string, value: unknown) {
  if (typeof value === "string" && ISO_DATE_RE.test(value)) return new Date(value);
  return value;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const persister = useMemo(
    () =>
      createAsyncStoragePersister({
        storage: { getItem: get, setItem: set, removeItem: del },
        deserialize: (str) => JSON.parse(str, reviveDates),
      }),
    []
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          // Don't persist "summaries" — it's derived data computed at runtime from
          // kittens + care data. A stale empty cache causes a flash of the empty
          // state on load before the background refetch completes.
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" && q.queryKey[0] !== "summaries",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

// Fallback for contexts where persistence isn't needed (e.g. public share pages)
export function QueryProviderOnly({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>
      {children}
    </QueryClientProvider>
  );
}
