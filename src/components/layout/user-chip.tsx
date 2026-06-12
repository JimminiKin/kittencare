"use client";

import Link from "next/link";
import { UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";

export function UserChip() {
  const { user, loading } = useAuthStore();
  const t = useTranslations("auth");

  if (loading) return null;

  if (!user) {
    return (
      <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
        <Link href="/auth">{t("signIn")}</Link>
      </Button>
    );
  }

  const displayName: string = user.user_metadata?.display_name ?? user.email ?? "";
  const parts = displayName.trim().split(/\s+/);
  const initials = (parts.length > 1
    ? parts[0][0] + parts[parts.length - 1][0]
    : displayName.slice(0, 2)
  ).toUpperCase();

  return (
    <Button variant="ghost" size="icon-sm" asChild>
      <Link href="/account" aria-label={displayName}>
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
          {initials || <UserCircle className="h-4 w-4" />}
        </div>
      </Link>
    </Button>
  );
}
