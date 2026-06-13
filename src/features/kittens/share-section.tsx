"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Link2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getShareTokensForKitten,
  createShareToken,
  revokeShareToken,
  type ShareField,
  type ShareToken,
} from "@/services/share.service";
import { useAuthStore } from "@/stores/auth.store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useTranslations } from "@/i18n/context";

const ALL_FIELDS: { key: ShareField; label: string }[] = [
  { key: "weight", label: "share.fieldWeight" },
  { key: "feedings", label: "share.fieldFeedings" },
  { key: "medications", label: "share.fieldMedications" },
  { key: "health", label: "share.fieldHealth" },
];

const EXPIRY_OPTIONS = [
  { label: "share.expiry7d", days: 7 },
  { label: "share.expiry30d", days: 30 },
  { label: "share.expiry90d", days: 90 },
  { label: "share.expiryNever", days: null },
];

const _shareLoading = new Set<string>();

interface Props {
  kittenId: string;
  kittenName: string;
}

export function ShareSection({ kittenId, kittenName }: Props) {
  const { user, role } = useAuthStore();
  const isOwner = role === "owner";
  const t = useTranslations("share");
  const tc = useTranslations("common");

  const [tokens, setTokens] = useState<ShareToken[]>([]);
  const [fields, setFields] = useState<ShareField[]>(["weight", "feedings", "medications", "health"]);
  const [expiryDays, setExpiryDays] = useState<number | null>(30);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<ShareToken | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const list = await getShareTokensForKitten(kittenId);
    setTokens(list);
  }, [kittenId]);

  useEffect(() => {
    if (!user) return;
    if (_shareLoading.has(kittenId)) return;
    _shareLoading.add(kittenId);
    reload().finally(() => _shareLoading.delete(kittenId));
  }, [user, kittenId, reload]);

  if (!user) return null;

  function toggleField(f: ShareField) {
    setFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  }

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
      const expiresAt = expiryDays
        ? new Date(Date.now() + expiryDays * 86400000)
        : null;
      const token = await createShareToken(kittenId, hm.household_id, fields, expiresAt);
      if (token) {
        const link = `${window.location.origin}/share/${token}`;
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
    await revokeShareToken(revokeTarget.id);
    setRevokeTarget(null);
    reload();
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(link);
    setCopied(token);
    setTimeout(() => setCopied(null), 2500);
  }

  return (
    <div className="pt-4 border-t space-y-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("title")}
      </p>
      <p className="text-xs text-muted-foreground">{t("description")}</p>

      {isOwner && (
        <>
          {/* Field toggles */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">{t("fields")}</p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_FIELDS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`field-${key}`}
                    checked={fields.includes(key)}
                    onCheckedChange={() => toggleField(key)}
                  />
                  <Label htmlFor={`field-${key}`} className="text-sm cursor-pointer">
                    {t(label.replace("share.", "") as any)}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Expiry */}
          <div className="flex gap-2 flex-wrap">
            {EXPIRY_OPTIONS.map(({ label, days }) => (
              <button
                key={label}
                type="button"
                onClick={() => setExpiryDays(days)}
                className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                  expiryDays === days
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {t(label.replace("share.", "") as any)}
              </button>
            ))}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={generating || fields.length === 0}
            className="w-full"
          >
            {generating ? (
              tc("loading")
            ) : (
              <><Link2 className="h-3.5 w-3.5 mr-2" />{t("generateLink")}</>
            )}
          </Button>
        </>
      )}

      {/* Existing tokens */}
      {tokens.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{t("activeLinks")}</p>
          {tokens.map((tok) => (
            <div key={tok.id} className="flex items-center gap-2 border rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">
                  {tok.fields.join(", ")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {tok.expiresAt
                    ? t("expires", { date: format(new Date(tok.expiresAt), "MMM d, yyyy") })
                    : t("noExpiry")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => copyLink(tok.token)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Copy link"
              >
                {copied === tok.token
                  ? <Check className="h-3.5 w-3.5 text-green-600" />
                  : <Copy className="h-3.5 w-3.5" />}
              </button>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => setRevokeTarget(tok)}
                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-muted-foreground hover:text-red-500"
                  aria-label="Revoke"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
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
