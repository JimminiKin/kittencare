"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";

export function AuthView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const { signInWithPassword, signUpWithPassword, sendMagicLink } = useAuthStore();
  const t = useTranslations("auth");

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  const [signUpName, setSignUpName] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpError, setSignUpError] = useState<string | null>(null);
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);
    const err = await signInWithPassword(signInEmail, signInPassword);
    setSignInLoading(false);
    if (err) { setSignInError(err); return; }
    window.location.href = redirectTo;
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignUpError(null);
    setSignUpLoading(true);
    const err = await signUpWithPassword(signUpEmail, signUpPassword, signUpName);
    setSignUpLoading(false);
    if (err) { setSignUpError(err); return; }
    setSignUpDone(true);
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicError(null);
    setMagicLoading(true);
    const err = await sendMagicLink(magicEmail);
    setMagicLoading(false);
    if (err) { setMagicError(err); return; }
    setMagicSent(true);
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
      <div className="text-center">
        <div className="text-5xl mb-2">🐱</div>
        <h1 className="text-2xl font-bold">Easy Kitty Care</h1>
      </div>

      <div className="w-full max-w-sm">
        <Tabs defaultValue="signin">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">{t("signIn")}</TabsTrigger>
            <TabsTrigger value="signup" className="flex-1">{t("signUp")}</TabsTrigger>
          </TabsList>

          {/* ── Sign in ─────────────────────────────────────────── */}
          <TabsContent value="signin" className="mt-4 space-y-4">
            <form onSubmit={handleSignIn} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="si-email">{t("email")}</Label>
                <Input
                  id="si-email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="si-password">{t("password")}</Label>
                <Input
                  id="si-password"
                  type="password"
                  placeholder={t("passwordPlaceholder")}
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              {signInError && <p className="text-sm text-destructive">{signInError}</p>}
              <Button type="submit" className="w-full" disabled={signInLoading}>
                {signInLoading ? t("signingIn") : t("signInButton")}
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">{t("orMagicLink")}</span>
              <Separator className="flex-1" />
            </div>

            {magicSent ? (
              <p className="text-sm text-center text-muted-foreground">{t("magicLinkSent")}</p>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-2">
                <Input
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                {magicError && <p className="text-sm text-destructive">{magicError}</p>}
                <Button type="submit" variant="outline" className="w-full" disabled={magicLoading}>
                  {magicLoading ? t("sending") : t("sendMagicLink")}
                </Button>
              </form>
            )}
          </TabsContent>

          {/* ── Sign up ─────────────────────────────────────────── */}
          <TabsContent value="signup" className="mt-4">
            {signUpDone ? (
              <div className="text-center space-y-2 py-4">
                <p className="text-2xl">✉️</p>
                <p className="font-medium">{t("checkEmail")}</p>
                <p className="text-sm text-muted-foreground">{t("checkEmailHint")}</p>
              </div>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-name">{t("displayName")}</Label>
                  <Input
                    id="su-name"
                    type="text"
                    placeholder={t("displayNamePlaceholder")}
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">{t("email")}</Label>
                  <Input
                    id="su-email"
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">{t("password")}</Label>
                  <Input
                    id="su-password"
                    type="password"
                    placeholder={t("passwordPlaceholder")}
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                {signUpError && <p className="text-sm text-destructive">{signUpError}</p>}
                <Button type="submit" className="w-full" disabled={signUpLoading}>
                  {signUpLoading ? t("creatingAccount") : t("signUpButton")}
                </Button>
              </form>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
