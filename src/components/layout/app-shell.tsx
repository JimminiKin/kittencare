"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { useKittenStore } from "@/stores/kitten.store";
import { useAuthStore } from "@/stores/auth.store";
import { I18nProvider } from "@/i18n/context";
import { MigrationBanner } from "@/components/shared/migration-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { fetchKittens } = useKittenStore();
  const { init: initAuth } = useAuthStore();
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/share");

  useEffect(() => {
    if (isPublic) return;
    fetchKittens();
  }, [fetchKittens, isPublic]);

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  if (isPublic) {
    return <I18nProvider>{children}</I18nProvider>;
  }

  return (
    <I18nProvider>
      <div className="min-h-screen bg-background">
        <MigrationBanner />
        <main className="mx-auto max-w-lg px-4 pt-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </I18nProvider>
  );
}
