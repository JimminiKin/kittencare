"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, Droplets, Pill, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import type { KittenSummary } from "@/domain/types";
import { formatWeight, formatWeightChange } from "@/lib/utils";
import { useTranslations } from "@/i18n/context";
import { useFormatAge } from "@/lib/use-format-age";

interface DashboardCardProps {
  summary: KittenSummary;
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function DashboardCard({ summary }: DashboardCardProps) {
  const { kitten, currentWeightGrams, weightChangeGrams, feedingsToday, eliminationsToday, activeMedications, alerts, nextFeedingDueAt } = summary;
  const tc = useTranslations("card");
  const formatAge = useFormatAge();

  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const warningAlerts = alerts.filter((a) => a.severity === "warning");
  const totalAlerts = criticalAlerts.length + warningAlerts.length;

  const WeightTrend = weightChangeGrams === undefined
    ? null
    : weightChangeGrams > 0
    ? TrendingUp
    : weightChangeGrams < 0
    ? TrendingDown
    : Minus;

  const weightColor = weightChangeGrams === undefined
    ? ""
    : weightChangeGrams > 0
    ? "text-green-600"
    : weightChangeGrams < 0
    ? "text-red-600"
    : "text-muted-foreground";

  // Compute feeding countdown
  const now = Date.now();
  let feedingLabel: string;
  let feedingLabelColor: string;
  if (!nextFeedingDueAt) {
    feedingLabel = tc("dueNow");
    feedingLabelColor = "text-red-500";
  } else {
    const diffMs = nextFeedingDueAt.getTime() - now;
    if (diffMs > 0) {
      feedingLabel = tc("nextIn", { time: formatDuration(diffMs) });
      feedingLabelColor = diffMs < 30 * 60_000
        ? "text-amber-500"
        : "text-muted-foreground";
    } else {
      const overdueMs = -diffMs;
      if (overdueMs < 2 * 60_000) {
        feedingLabel = tc("dueNow");
        feedingLabelColor = "text-violet-600";
      } else {
        feedingLabel = tc("overdueBy", { time: formatDuration(overdueMs) });
        feedingLabelColor = overdueMs > 3_600_000 ? "text-red-500" : "text-violet-600";
      }
    }
  }

  return (
    <Link href={`/kittens/${kitten.id}`}>
      <Card className={`transition-all active:scale-[0.98] ${criticalAlerts.length > 0 ? "border-red-300 ring-1 ring-red-200" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <KittenAvatar name={kitten.name} photo={kitten.photo} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg truncate">{kitten.name}</span>
                {criticalAlerts.length > 0 && (
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {formatAge(kitten.estimatedAgeDays, kitten.birthDate)}
                {kitten.sex && kitten.sex !== "unknown" && ` · ${kitten.sex}`}
              </p>
            </div>
            {totalAlerts > 0 && (
              <Badge variant={criticalAlerts.length > 0 ? "critical" : "warning"}>
                {totalAlerts === 1 ? tc("alertOne", { count: totalAlerts }) : tc("alertMany", { count: totalAlerts })}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{tc("weight")}</div>
              <div className="font-bold text-base">
                {currentWeightGrams ? formatWeight(currentWeightGrams) : "—"}
              </div>
              {WeightTrend && weightChangeGrams !== undefined && (
                <div className={`flex items-center justify-center gap-0.5 text-xs ${weightColor}`}>
                  <WeightTrend className="h-3 w-3" />
                  {formatWeightChange(weightChangeGrams)}
                </div>
              )}
            </div>

            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{tc("feedings")}</div>
              <div className="font-bold text-base">{feedingsToday}</div>
              <div className={`text-xs font-medium ${feedingLabelColor}`}>
                {feedingLabel}
              </div>
            </div>

            <div className="rounded-xl bg-muted/50 p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">{tc("elim")}</div>
              <div className="font-bold text-base flex items-center justify-center gap-1">
                <Droplets className="h-3.5 w-3.5 text-sky-500" />
                {eliminationsToday}
              </div>
              {activeMedications > 0 && (
                <div className="flex items-center justify-center gap-0.5 text-xs text-violet-600">
                  <Pill className="h-3 w-3" />
                  {activeMedications === 1 ? tc("medOne", { count: activeMedications }) : tc("medMany", { count: activeMedications })}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
