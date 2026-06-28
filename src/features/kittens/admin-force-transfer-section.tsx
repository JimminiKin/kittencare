"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSessionContext } from "@/lib/current-session";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "@/i18n/context";

interface Household { id: string; name: string }

async function fetchAllHouseholds(token: string): Promise<Household[]> {
  const res = await fetch("/api/admin/households", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load households");
  const { households } = await res.json();
  return households;
}

interface Props {
  kittenId: string;
  kittenName: string;
  onTransferred?: () => void;
}

export function AdminForceTransferSection({ kittenId, kittenName, onTransferred }: Props) {
  const sourceHouseholdId = (() => { try { return getSessionContext().householdId; } catch { return ""; } })();
  const { user, isAdmin } = useAuthStore();
  const t = useTranslations("adminTransfer");
  const tc = useTranslations("common");

  const [targetId, setTargetId] = useState<string>("");
  const [confirming, setConfirming] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: households = [] } = useQuery({
    queryKey: ["admin", "households"],
    queryFn: async () => {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) return [];
      return fetchAllHouseholds(session.access_token);
    },
    enabled: !!user && isAdmin,
    staleTime: 60_000,
  });

  if (!user || !isAdmin) return null;

  const targetHousehold = households.find((h) => h.id === targetId);
  const eligibleHouseholds = households.filter((h) => h.id !== sourceHouseholdId);

  async function handleConfirm() {
    setTransferring(true);
    setError(null);
    try {
      const { data: { session } } = await getSupabaseClient().auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const res = await fetch(`/api/admin/kittens/${kittenId}/force-transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ targetHouseholdId: targetId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Transfer failed");

      setConfirming(false);
      onTransferred?.();
    } catch (e: any) {
      setError(e?.message ?? "Transfer failed");
    } finally {
      setTransferring(false);
    }
  }

  return (
    <div className="pt-4 border-t space-y-4 border-orange-200">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-3.5 w-3.5 text-orange-500" />
        <p className="text-xs font-semibold uppercase tracking-wide text-orange-500">
          {t("sectionTitle")}
        </p>
      </div>
      <p className="text-xs text-muted-foreground">{t("sectionDescription")}</p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex gap-2">
        <Select value={targetId} onValueChange={setTargetId}>
          <SelectTrigger className="flex-1 text-sm h-9">
            <SelectValue placeholder={t("selectHousehold")} />
          </SelectTrigger>
          <SelectContent>
            {eligibleHouseholds.map((h) => (
              <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="destructive"
          disabled={!targetId || transferring}
          onClick={() => setConfirming(true)}
          className="shrink-0"
        >
          {t("forceTransfer")}
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={handleConfirm}
        title={t("confirmTitle")}
        body={t("confirmBody", { name: kittenName, household: targetHousehold?.name ?? "" })}
        confirmLabel={transferring ? tc("loading") : t("forceTransfer")}
        danger
      />
    </div>
  );
}
