"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";

export function ResetView() {
  const router = useRouter();
  const { isRecovery, updatePassword } = useAuthStore();
  const t = useTranslations("auth");

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError(t("passwordsDoNotMatch"));
      return;
    }
    setLoading(true);
    setError(null);
    const err = await updatePassword(newPassword);
    setLoading(false);
    if (err) { setError(err); return; }
    setSuccess(true);
    setTimeout(() => router.push("/"), 2000);
  }

  if (!isRecovery) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
        <div className="text-5xl">⏳</div>
        <p className="text-muted-foreground">{t("resetLinkInvalid")}</p>
        <Button variant="outline" onClick={() => router.push("/auth")}>
          {t("backToSignIn")}
        </Button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
        <div className="text-5xl">✅</div>
        <p className="font-medium">{t("passwordUpdated")}</p>
        <p className="text-sm text-muted-foreground">{t("redirecting")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <div className="text-5xl mb-2">🔑</div>
        <h1 className="text-2xl font-bold">{t("resetPasswordTitle")}</h1>
      </div>

      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-password">{t("newPassword")}</Label>
            <Input
              id="new-password"
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
            <Label htmlFor="confirm-password">{t("confirmPassword")}</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t("updatingPassword") : t("updatePassword")}
          </Button>
        </form>
      </div>
    </div>
  );
}
