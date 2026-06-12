"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/shared/alert-banner";
import { DashboardCard } from "./dashboard-card";
import { useCareStore } from "@/stores/care.store";
import { useKittenStore } from "@/stores/kitten.store";
import { useTranslations } from "@/i18n/context";
import { UserChip } from "@/components/layout/user-chip";

const BellToggle = dynamic(
  () => import("./bell-toggle").then((m) => m.BellToggle),
  { ssr: false }
);

export function DashboardView() {
  const { summaries, refreshSummaries, refreshAlerts } = useCareStore();
  const { loading } = useKittenStore();
  const t = useTranslations("dashboard");

  useEffect(() => {
    refreshSummaries();
    refreshAlerts();
  }, [refreshSummaries, refreshAlerts]);

  const allAlerts = summaries.flatMap((s) => s.alerts);

  return (
    <div className="space-y-5">
      {allAlerts.length > 0 && <AlertBanner alerts={allAlerts} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {summaries.length === 1
              ? t("activeOne", { count: summaries.length })
              : t("activeMany", { count: summaries.length })}
          </h2>
        </div>
        <div className="flex gap-2 items-center">
          <UserChip />
          <BellToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { refreshSummaries(); refreshAlerts(); }}
            aria-label={t("refresh")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" asChild>
            <Link href="/kittens/new">
              <Plus className="h-4 w-4" />
              {t("addKitten")}
            </Link>
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="text-6xl">🐱</div>
          <div>
            <p className="font-semibold text-lg">{t("empty")}</p>
            <p className="text-sm text-muted-foreground">{t("emptyDetail")}</p>
          </div>
          <Button asChild size="lg">
            <Link href="/kittens/new">
              <Plus className="h-5 w-5" />
              {t("addFirst")}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <DashboardCard key={s.kitten.id} summary={s} />
          ))}
        </div>
      )}

      {summaries.length > 0 && (
        <div className="fixed bottom-24 right-4 flex flex-col gap-3">
          <Button
            size="xl"
            asChild
            className="h-16 w-16 rounded-full shadow-xl text-xl p-0"
          >
            <Link href="/feed" aria-label={t("addKitten")}>
              🍼
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
