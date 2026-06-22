"use client";

import { useState } from "react";
import { Copy, Check, ArrowRightLeft, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getTransfersForKitten,
  createTransferToken,
  revokeTransfer,
  type KittenTransfer,
} from "@/services/kitten-transfer.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/context";
import { qk } from "@/lib/query-keys";

interface Props {
  kittenId: string;
  kittenName: string;
}

export function TransferSection({ kittenId, kittenName }: Props) {
  const qc = useQueryClient();
  const { user, role } = useAuthStore();
  const isOwner = role === "owner";
  const t = useTranslations("transfer");
  const tc = useTranslations("common");

  const { data: transfers = [] } = useQuery({
    queryKey: qk.kittenTransfers(kittenId),
    queryFn: () => getTransfersForKitten(kittenId),
    enabled: !!user && isOwner,
    staleTime: 60_000,
  });

  const reload = () => qc.invalidateQueries({ queryKey: qk.kittenTransfers(kittenId) });

  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<KittenTransfer | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user || !isOwner) return null;

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const { data: hm } = await getSupabaseClient()
        .from("household_members")
        .select("household_id")
        .eq("user_id", user!.id)
        .limit(1)
        .single();
      if (!hm) throw new Error("No household");
      const token = await createTransferToken(kittenId, hm.household_id, user!.id);
      if (token) {
        const link = `${window.location.origin}/transfer/${token}`;
        await navigator.clipboard.writeText(link);
        setCopied(token);
        setTimeout(() => setCopied(null), 3000);
        reload();
      }
    } catch (e: any) {
      setError(e?.message?.includes("violates row-level")
        ? t("ownerOnly")
        : e?.message ?? "Error");
    }
    setGenerating(false);
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    await revokeTransfer(revokeTarget.id);
    setRevokeTarget(null);
    reload();
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/transfer/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sectionTitle")}
      </p>
      <p className="text-xs text-muted-foreground">{t("sectionDescription")}</p>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          tc("loading")
        ) : (
          <><ArrowRightLeft className="h-3.5 w-3.5 mr-2" />{t("generateLink")}</>
        )}
      </Button>

      {transfers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{t("pendingLinks")}</p>
          {transfers.map((tr) => (
            <div key={tr.id} className="flex items-center gap-2 border rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{t("pendingLabel")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("expires", { date: format(new Date(tr.expiresAt), "MMM d, yyyy") })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyLink(tr.token)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Copy link"
              >
                {copied === tr.token
                  ? <Check className="h-3.5 w-3.5 text-green-600" />
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => setRevokeTarget(tr)}
                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                aria-label="Revoke"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
        title={t("revokeTitle")}
        body={t("revokeBody", { name: kittenName })}
        confirmLabel={t("revoke")}
        danger
      />
    </div>
  );
}
