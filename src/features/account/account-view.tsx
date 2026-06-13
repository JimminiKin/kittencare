"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";
import { HouseholdSection } from "./household-section";

export function AccountView() {
  const router = useRouter();
  const { user, signOut, updateProfile } = useAuthStore();
  const t = useTranslations("auth");
  const tc = useTranslations("common");

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
          onUploaded={(url) => updateProfile({ avatar_url: url })}
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
