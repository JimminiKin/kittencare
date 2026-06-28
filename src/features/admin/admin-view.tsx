"use client";

import { useState, useCallback } from "react";
import { Search, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface AdminKitten {
  id: string;
  name: string;
  status: string;
  photo?: string;
  householdId: string;
  householdName: string;
}

interface Household { id: string; name: string }

async function getToken() {
  const { data: { session } } = await getSupabaseClient().auth.getSession();
  return session?.access_token ?? null;
}

async function searchKittens(q: string, token: string): Promise<AdminKitten[]> {
  const res = await fetch(`/api/admin/kittens?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const { kittens } = await res.json();
  return kittens;
}

async function fetchHouseholds(token: string): Promise<Household[]> {
  const res = await fetch("/api/admin/households", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const { households } = await res.json();
  return households;
}

export function AdminView() {
  const { user, isAdmin } = useAuthStore();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [transferTarget, setTransferTarget] = useState<AdminKitten | null>(null);
  const [targetHouseholdId, setTargetHouseholdId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const { data: kittens = [], isFetching, refetch } = useQuery({
    queryKey: ["admin", "kittens", submitted],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      return searchKittens(submitted, token);
    },
    enabled: !!user && isAdmin,
    staleTime: 30_000,
  });

  const { data: households = [] } = useQuery({
    queryKey: ["admin", "households"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) return [];
      return fetchHouseholds(token);
    },
    enabled: !!user && isAdmin,
    staleTime: 60_000,
  });

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query);
  }, [query]);

  async function handleForceTransfer() {
    if (!transferTarget || !targetHouseholdId) return;
    setTransferring(true);
    setTransferError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`/api/admin/kittens/${transferTarget.id}/force-transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ targetHouseholdId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transfer failed");
      setSuccessId(transferTarget.id);
      setTransferTarget(null);
      setTargetHouseholdId("");
      refetch();
    } catch (e: any) {
      setTransferError(e?.message ?? "Transfer failed");
    } finally {
      setTransferring(false);
    }
  }

  if (!isAdmin) {
    return <p className="text-center text-muted-foreground py-16">Access denied.</p>;
  }

  const eligibleHouseholds = transferTarget
    ? households.filter((h) => h.id !== transferTarget.householdId)
    : households;

  const targetHousehold = households.find((h) => h.id === targetHouseholdId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Search and transfer kittens across all households.</p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by kitten name…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline" disabled={isFetching}>
          {isFetching ? "Searching…" : "Search"}
        </Button>
      </form>

      {successId && (
        <p className="text-sm text-green-600">Transfer complete.</p>
      )}

      {kittens.length === 0 && submitted && !isFetching && (
        <p className="text-sm text-muted-foreground text-center py-8">No kittens found.</p>
      )}

      {kittens.length === 0 && !submitted && (
        <p className="text-sm text-muted-foreground text-center py-8">Search for a kitten to get started.</p>
      )}

      <div className="space-y-2">
        {kittens.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-3 rounded-xl border p-3"
          >
            <KittenAvatar name={k.name} photo={k.photo} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{k.name}</p>
              <p className="text-xs text-muted-foreground truncate">{k.householdName}</p>
            </div>
            <Badge variant={k.status === "active" ? "default" : "secondary"} className="text-xs shrink-0">
              {k.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0 h-8 px-2"
              onClick={() => { setTransferTarget(k); setTargetHouseholdId(""); setTransferError(null); setSuccessId(null); }}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Transfer dialog */}
      {transferTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-background rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-xl">
            <div>
              <p className="font-semibold">Force transfer</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Moving <span className="font-medium text-foreground">{transferTarget.name}</span> from{" "}
                <span className="font-medium text-foreground">{transferTarget.householdName}</span>
              </p>
            </div>

            <Select value={targetHouseholdId} onValueChange={setTargetHouseholdId}>
              <SelectTrigger>
                <SelectValue placeholder="Select target household…" />
              </SelectTrigger>
              <SelectContent>
                {eligibleHouseholds.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {transferError && <p className="text-xs text-destructive">{transferError}</p>}

            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!targetHouseholdId || transferring}
                onClick={handleForceTransfer}
              >
                {transferring ? "Transferring…" : "Transfer"}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setTransferTarget(null); setTransferError(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
