"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Crown, UserMinus, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  getHouseholdInfo,
  getPendingInvites,
  createInvite,
  revokeInvite,
  removeMember,
  transferOwnership,
  leaveHousehold,
  type HouseholdInfo,
  type PendingInvite,
} from "@/services/household.service";
import { useTranslations } from "@/i18n/context";

function Avatar({ name, size = "sm" }: { name: string; size?: "sm" | "md" }) {
  const parts = name.trim().split(/\s+/);
  const initials = (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : name.slice(0, 2)
  ).toUpperCase();
  return (
    <div
      className={`rounded-full bg-primary/15 text-primary font-bold flex items-center justify-center shrink-0 ${
        size === "md" ? "h-10 w-10 text-sm" : "h-8 w-8 text-xs"
      }`}
    >
      {initials}
    </div>
  );
}

type Confirm =
  | { type: "remove"; userId: string; name: string }
  | { type: "makeOwner"; userId: string; name: string }
  | { type: "revoke"; inviteId: string; email: string }
  | { type: "leave" };

export function HouseholdSection({ user }: { user: User }) {
  const router = useRouter();
  const t = useTranslations("household");
  const tc = useTranslations("common");

  const [info, setInfo] = useState<HouseholdInfo | null>(null);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const h = await getHouseholdInfo(user.id);
    setInfo(h);
    if (h?.myRole === "owner") {
      const p = await getPendingInvites(h.id);
      setInvites(p);
    }
    setLoading(false);
  }, [user.id]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleGenerateLink() {
    if (!info) return;
    setGeneratingLink(true);
    const token = await createInvite(info.id, inviteEmail.trim(), user.id);
    setGeneratingLink(false);
    if (!token) return;
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    refresh();
  }

  async function handleConfirm() {
    if (!confirm || !info) return;
    if (confirm.type === "remove") {
      await removeMember(info.id, confirm.userId);
    } else if (confirm.type === "makeOwner") {
      await transferOwnership(info.id, confirm.userId, user.id);
    } else if (confirm.type === "revoke") {
      await revokeInvite(confirm.inviteId);
    } else if (confirm.type === "leave") {
      await leaveHousehold(info.id, user.id);
      router.push("/");
      return;
    }
    setConfirm(null);
    refresh();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-2">{tc("loading")}</p>;
  }

  if (!info) return null;

  const isOwner = info.myRole === "owner";
  const otherMembers = info.members.filter((m) => m.userId !== user.id);
  const canLeave = !isOwner || otherMembers.length === 0;

  return (
    <div className="space-y-4">
      {/* Household name */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          {t("title")} · {info.name}
        </p>

        {/* Members */}
        <div className="space-y-2">
          {info.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3">
              <Avatar name={m.displayName} />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">
                  {m.displayName}
                  {m.userId === user.id && (
                    <span className="text-muted-foreground font-normal"> ({tc("you") ?? "you"})</span>
                  )}
                </span>
              </div>
              {m.role === "owner" && (
                <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              {isOwner && m.userId !== user.id && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setConfirm({ type: "makeOwner", userId: m.userId, name: m.displayName })}
                  >
                    <Crown className="h-3 w-3 mr-1" />
                    {t("makeOwner")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setConfirm({ type: "remove", userId: m.userId, name: m.displayName })}
                  >
                    <UserMinus className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite section (owner only) */}
      {isOwner && (
        <>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("invite")}
            </p>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t("inviteEmailPlaceholder")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="shrink-0"
              >
                {copied ? (
                  <><Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />{t("linkCopied")}</>
                ) : generatingLink ? (
                  t("generating")
                ) : (
                  <><Copy className="h-3.5 w-3.5 mr-1.5" />{t("generateLink")}</>
                )}
              </Button>
            </div>
          </div>

          {/* Pending invites */}
          {invites.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("pendingInvites")}
              </p>
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate text-muted-foreground">{inv.invitedEmail}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {t("inviteExpires", { date: new Date(inv.expiresAt).toLocaleDateString() })}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-destructive hover:text-destructive shrink-0"
                    onClick={() => setConfirm({ type: "revoke", inviteId: inv.id, email: inv.invitedEmail })}
                  >
                    {t("revoke")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Leave */}
      <Separator />
      {canLeave ? (
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
          onClick={() => setConfirm({ type: "leave" })}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" />
          {t("leave")}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">{t("ownerMustTransfer")}</p>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirm?.type === "remove"}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={t("removeTitle", { name: confirm?.type === "remove" ? confirm.name : "" })}
        body={t("removeBody", { name: confirm?.type === "remove" ? confirm.name : "" })}
        confirmLabel={t("remove")}
        danger
      />
      <ConfirmDialog
        open={confirm?.type === "makeOwner"}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={t("transferTitle", { name: confirm?.type === "makeOwner" ? confirm.name : "" })}
        body={t("transferBody")}
        confirmLabel={t("makeOwner")}
      />
      <ConfirmDialog
        open={confirm?.type === "revoke"}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={t("revokeTitle")}
        body={t("revokeBody")}
        confirmLabel={t("revoke")}
        danger
      />
      <ConfirmDialog
        open={confirm?.type === "leave"}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        title={t("leaveTitle")}
        body={t("leaveBody")}
        confirmLabel={t("leave")}
        danger
      />
    </div>
  );
}
