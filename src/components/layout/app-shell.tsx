"use client";

import { useEffect } from "react";
import { BottomNav } from "./bottom-nav";
import { useKittenStore } from "@/stores/kitten.store";
import { useAuthStore } from "@/stores/auth.store";
import { seedDatabase } from "@/db/seed";
import { I18nProvider } from "@/i18n/context";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { fetchKittens } = useKittenStore();
  const { init: initAuth } = useAuthStore();

  useEffect(() => {
    seedDatabase().then(() => fetchKittens());
  }, [fetchKittens]);

  useEffect(() => {
    return initAuth();
  }, [initAuth]);

  return (
    <I18nProvider>
      <div className="min-h-screen bg-background">
        <main className="mx-auto max-w-lg px-4 pt-4 pb-24">
          {children}
        </main>
        <BottomNav />
      </div>
    </I18nProvider>
  );
}
