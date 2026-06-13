"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "./bottom-nav";
import { useAuthStore } from "@/stores/auth.store";
import { I18nProvider } from "@/i18n/context";
import { MigrationBanner } from "@/components/shared/migration-banner";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { init: initAuth, ready } = useAuthStore();
  const pathname = usePathname();
  const isPublic = pathname?.startsWith("/share");

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
          {ready ? children : (
            <div className="space-y-5 pt-1">
              <div className="flex items-center justify-between">
                <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="h-8 w-8 rounded-md bg-muted animate-pulse" />
                  <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
                </div>
              </div>
              <div className="h-36 rounded-2xl bg-muted animate-pulse" />
              <div className="h-36 rounded-2xl bg-muted animate-pulse" />
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </I18nProvider>
  );
}
