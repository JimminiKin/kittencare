"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";
import { HouseholdSection } from "./household-section";

export function AccountView() {
  const router = useRouter();
  const { user, signOut, updateProfile, updatePassword } = useAuthStore();
  const t = useTranslations("auth");
  const tc = useTranslations("common");

  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <div className="text-5xl">🐱</div>
        <div>
          <p className="font-semibold text-lg">{t("localMode")}</p>
          <p className="text-sm text-muted-foreground mt-1">{t("localModeHint")}</p>
        </div>
        <Button asChild>
          <Link href="/auth">{t("signInToSync")}</Link>
        </Button>
      </div>
    );
  }

  const displayName = user.user_metadata?.display_name ?? user.email ?? "";

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordError(t("passwordsDoNotMatch"));
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    const err = await updatePassword(newPassword);
    setPasswordLoading(false);
    if (err) { setPasswordError(err); return; }
    setPasswordSuccess(true);
    setNewPassword("");
    setConfirmPassword("");
    setTimeout(() => { setChangingPassword(false); setPasswordSuccess(false); }, 2000);
  }

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 py-4">
        <AvatarUpload
          currentUrl={user.user_metadata?.avatar_url}
          name={displayName}
          storagePath={`users/${user.id}`}
          onUploaded={(url) => void updateProfile({ avatar_url: url })}
          size="xl"
        />
        <div className="text-center">
          <p className="font-semibold text-lg">{displayName}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <Separator />

      <HouseholdSection user={user} />

      <Separator />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("changePassword")}</p>
          {!changingPassword && (
            <Button variant="outline" size="sm" onClick={() => setChangingPassword(true)}>
              {t("changePassword")}
            </Button>
          )}
        </div>
        {changingPassword && (
          passwordSuccess ? (
            <p className="text-sm text-center text-muted-foreground py-1">{t("passwordUpdated")}</p>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="acc-new-pw">{t("newPassword")}</Label>
                <Input
                  id="acc-new-pw"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="acc-confirm-pw">{t("confirmPassword")}</Label>
                <Input
                  id="acc-confirm-pw"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={passwordLoading}>
                  {passwordLoading ? t("updatingPassword") : t("updatePassword")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setChangingPassword(false); setPasswordError(null); setNewPassword(""); setConfirmPassword(""); }}
                >
                  {tc("cancel")}
                </Button>
              </div>
            </form>
          )
        )}
      </div>

      <Separator />

      <Button
        variant="outline"
        className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {t("signOut")}
      </Button>
    </div>
  );
}
