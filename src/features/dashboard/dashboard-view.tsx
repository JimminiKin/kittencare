"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Plus, RefreshCw, HelpCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/shared/alert-banner";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import { DashboardCard } from "./dashboard-card";
import { useQueryClient } from "@tanstack/react-query";
import { useSummaries } from "@/hooks/use-summaries";
import { useKittens } from "@/hooks/use-kittens";
import { qk } from "@/lib/query-keys";
import { useTranslations } from "@/i18n/context";
import { useOnboardingStore } from "@/stores/onboarding.store";
import type { KittenSummary } from "@/domain/types";

function urgencyScore(s: KittenSummary): number {
  if (s.alerts.some((a) => a.type === "feeding_overdue")) return 0;
  if (s.alerts.some((a) => a.severity === "critical")) return 1;
  if (s.alerts.some((a) => a.type === "feeding_due")) return 2;
  if (s.alerts.length > 0) return 3;
  return 4;
}

function sortByUrgency(summaries: KittenSummary[]): KittenSummary[] {
  return [...summaries].sort((a, b) => {
    const diff = urgencyScore(a) - urgencyScore(b);
    if (diff !== 0) return diff;
    // Within same urgency band, soonest feeding due first
    const ta = a.nextFeedingDueAt?.getTime() ?? Infinity;
    const tb = b.nextFeedingDueAt?.getTime() ?? Infinity;
    return ta - tb;
  });
}

const BellToggle = dynamic(
  () => import("./bell-toggle").then((m) => m.BellToggle),
  { ssr: false }
);

export function DashboardView() {
  const qc = useQueryClient();
  const { data: kittens = [], isLoading: kittensLoading } = useKittens();
  const { data: summaries = [], isLoading: summariesLoading } = useSummaries();
  const t = useTranslations("dashboard");
  const tK = useTranslations("kitten");
  const tO = useTranslations("onboarding");
  const { setOpen: openOnboarding } = useOnboardingStore();

  const activeCount = kittens.filter((k) => k.status === "active").length;
  const archived = kittens.filter((k) => k.status !== "active");
  const summariesPending = !kittensLoading && activeCount > 0 && summariesLoading;

  const allAlerts = summaries.flatMap((s) => s.alerts);

  return (
    <div className="space-y-5">
      {allAlerts.length > 0 && <AlertBanner alerts={allAlerts} />}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">
            {(summariesPending ? activeCount : summaries.length) === 1
              ? t("activeOne", { count: summariesPending ? activeCount : summaries.length })
              : t("activeMany", { count: summariesPending ? activeCount : summaries.length })}
          </h2>
        </div>
        <div className="flex gap-2 items-center">
          <BellToggle />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => openOnboarding(true)}
            aria-label={tO("helpButton")}
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => { qc.invalidateQueries({ queryKey: qk.kittens() }); qc.invalidateQueries({ queryKey: qk.summaries() }); }}
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

      {kittensLoading || summariesPending ? (
        <div className="space-y-3">
          {Array.from({ length: activeCount || 2 }).map((_, i) => (
            <div key={i} className="h-36 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : summaries.length === 0 && archived.length === 0 ? (
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
        <>
          {summaries.length > 0 && (
            <div className="space-y-3">
              {sortByUrgency(summaries).map((s) => (
                <DashboardCard key={s.kitten.id} summary={s} />
              ))}
            </div>
          )}
          {archived.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-base font-semibold text-muted-foreground">
                {tK("archivedCount", { count: archived.length })}
              </h2>
              <div className="space-y-2 opacity-60">
                {archived.map((k) => (
                  <Link key={k.id} href={`/kittens/${k.id}`}>
                    <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card">
                      <KittenAvatar name={k.name} photo={k.photo} size="md" />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold">{k.name}</span>
                        <p className="text-sm text-muted-foreground capitalize">
                          {tK(`status${k.status.charAt(0).toUpperCase()}${k.status.slice(1)}` as Parameters<typeof tK>[0])}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {(summaries.length > 0 || summariesPending) && (
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
