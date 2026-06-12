"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Scale, Droplets, Pill, Activity, Edit, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import { AlertBanner } from "@/components/shared/alert-banner";
import { WeightChart } from "@/components/charts/weight-chart";
import { FeedingChart } from "@/components/charts/feeding-chart";
import { useKittenStore } from "@/stores/kitten.store";
import { useCareStore } from "@/stores/care.store";
import { buildKittenSummary } from "@/services/alert.service";
import { getRepositories } from "@/db/index";
import { formatWeight, formatWeightChange } from "@/lib/utils";
import { useFormatAge } from "@/lib/use-format-age";
import { useTranslations } from "@/i18n/context";
import type { KittenSummary } from "@/domain/types";

interface KittenDetailViewProps {
  kittenId: string;
}

export function KittenDetailView({ kittenId }: KittenDetailViewProps) {
  const { getKittenById, archiveKitten } = useKittenStore();
  const {
    feedings,
    weights,
    eliminations,
    medications,
    administrations,
    healthObservations,
    loadFeedingsForKitten,
    loadWeightsForKitten,
    loadEliminationsForKitten,
    loadMedicationsForKitten,
    loadHealthForKitten,
  } = useCareStore();

  const [summary, setSummary] = useState<KittenSummary | null>(null);
  const t = useTranslations("detail");
  const tk = useTranslations("kitten");
  const tc = useTranslations("common");
  const formatAge = useFormatAge();

  const kitten = getKittenById(kittenId);

  useEffect(() => {
    if (!kittenId) return;
    loadFeedingsForKitten(kittenId);
    loadWeightsForKitten(kittenId);
    loadEliminationsForKitten(kittenId);
    loadMedicationsForKitten(kittenId);
    loadHealthForKitten(kittenId);
  }, [kittenId, loadFeedingsForKitten, loadWeightsForKitten, loadEliminationsForKitten, loadMedicationsForKitten, loadHealthForKitten]);

  useEffect(() => {
    if (!kitten) return;
    buildKittenSummary(kitten, getRepositories()).then(setSummary);
  }, [kitten, feedings, weights]);

  if (!kitten) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        {tc("loading")}
      </div>
    );
  }

  type TimelineEvent = { id: string; timestamp: Date; type: string; label: string };
  const timeline: TimelineEvent[] = [
    ...feedings.slice(0, 10).map((f) => ({
      id: f.id,
      timestamp: f.timestamp,
      type: "feeding",
      label: `🍼 ${t("eventFeeding", { amount: f.amountConsumedMl, method: f.method })}`,
    })),
    ...weights.slice(0, 5).map((w) => ({
      id: w.id,
      timestamp: w.timestamp,
      type: "weight",
      label: `⚖️ ${t("eventWeight", { weight: formatWeight(w.weightGrams) })}`,
    })),
    ...eliminations.slice(0, 5).map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      type: "elimination",
      label: e.pee && e.poo
        ? `💧💩 ${t("eventPeeAndPoo")}`
        : e.pee
        ? `💧 ${t("eventPee")}`
        : `💩 ${t("eventPoo")}`,
    })),
    ...administrations.slice(0, 5).map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      type: "medication",
      label: `💊 ${t("eventMedication")}`,
    })),
    ...healthObservations.slice(0, 5).map((h) => ({
      id: h.id,
      timestamp: h.timestamp,
      type: "health",
      label: `🩺 ${t("eventHealth", { energy: h.energy, hydration: h.hydration })}`,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  return (
    <div className="space-y-4">
      {summary && summary.alerts.length > 0 && (
        <AlertBanner alerts={summary.alerts} />
      )}

      <div className="flex items-center gap-4">
        <KittenAvatar name={kitten.name} photo={kitten.photo} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{kitten.name}</h1>
            <Badge variant={kitten.status === "active" ? "success" : "secondary"} className="capitalize">
              {tk(`status${kitten.status.charAt(0).toUpperCase()}${kitten.status.slice(1)}` as Parameters<typeof tk>[0])}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {formatAge(kitten.estimatedAgeDays, kitten.birthDate)}
            {kitten.sex && kitten.sex !== "unknown" && ` · ${tk(`sex${kitten.sex.charAt(0).toUpperCase()}${kitten.sex.slice(1)}Label` as Parameters<typeof tk>[0])}`}
          </p>
          {kitten.intakeDate && (
            <p className="text-xs text-muted-foreground">
              {tk("inFosterSince", { date: format(kitten.intakeDate, "MMM d, yyyy") })}
            </p>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href={`/kittens/${kitten.id}/edit`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-4 gap-2">
          <StatTile
            icon={<Scale className="h-4 w-4 text-violet-500" />}
            label={t("weightLabel")}
            value={summary.currentWeightGrams ? formatWeight(summary.currentWeightGrams) : "—"}
            sub={summary.weightChangeGrams !== undefined ? formatWeightChange(summary.weightChangeGrams) : undefined}
            subColor={summary.weightChangeGrams !== undefined && summary.weightChangeGrams < 0 ? "text-red-500" : "text-green-600"}
          />
          <StatTile
            icon={<span className="text-base">🍼</span>}
            label={t("feedingsLabel")}
            value={String(summary.feedingsToday)}
            sub={`${summary.totalConsumedMlToday}ml`}
          />
          <StatTile
            icon={<Droplets className="h-4 w-4 text-sky-500" />}
            label={t("elimLabel")}
            value={String(summary.eliminationsToday)}
            sub={t("todayLabel")}
          />
          <StatTile
            icon={<Pill className="h-4 w-4 text-rose-500" />}
            label={t("medsLabel")}
            value={String(summary.activeMedications)}
            sub={t("activeLabel")}
          />
        </div>
      )}

      <Tabs defaultValue="timeline">
        <TabsList className="w-full">
          <TabsTrigger value="timeline" className="flex-1">{t("timeline")}</TabsTrigger>
          <TabsTrigger value="weight" className="flex-1">{t("weightTab")}</TabsTrigger>
          <TabsTrigger value="intake" className="flex-1">{t("intakeTab")}</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-1 mt-3">
          {timeline.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">{t("noEvents")}</p>
          ) : (
            timeline.map((event, i) => (
              <div key={event.id}>
                <div className="flex items-center gap-3 py-2.5">
                  <span className="text-xs text-muted-foreground w-16 shrink-0 text-right">
                    {format(event.timestamp, "h:mm a")}
                  </span>
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span className="text-sm">{event.label}</span>
                </div>
                {i < timeline.length - 1 && <Separator />}
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="weight" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("weightTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <WeightChart entries={weights} kitten={kitten} height={240} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intake" className="mt-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("dailyIntake")}</CardTitle>
            </CardHeader>
            <CardContent>
              <FeedingChart feedings={feedings} days={7} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button asChild variant="outline" className="h-14">
          <Link href={`/feed?kittenId=${kitten.id}`}>🍼 {t("logFeeding")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-14">
          <Link href={`/weight?kittenId=${kitten.id}`}>⚖️ {t("logWeight")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-14">
          <Link href={`/health?kittenId=${kitten.id}`}><Activity className="h-4 w-4 mr-2" />{t("healthLog")}</Link>
        </Button>
        <Button asChild variant="outline" className="h-14">
          <Link href={`/medications?kittenId=${kitten.id}`}><Pill className="h-4 w-4 mr-2" />{t("medications")}</Link>
        </Button>
      </div>

      {kitten.status === "active" && (
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-3">{tk("archivePrompt")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["adopted", "transferred", "deceased"] as const).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="capitalize text-muted-foreground"
                onClick={() => archiveKitten(kitten.id, s)}
              >
                <Archive className="h-3 w-3 mr-1" />
                {tk(`status${s.charAt(0).toUpperCase()}${s.slice(1)}` as Parameters<typeof tk>[0])}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  subColor = "text-muted-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5 text-center flex flex-col items-center gap-1">
      {icon}
      <div className="font-bold text-lg leading-none">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      {sub && <div className={`text-xs ${subColor}`}>{sub}</div>}
    </div>
  );
}
