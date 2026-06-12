"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Scale, Droplets, Pill, Activity, Edit, Archive, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { KittenAvatar } from "@/components/shared/kitten-avatar";
import { AlertBanner } from "@/components/shared/alert-banner";
import { WeightChart } from "@/components/charts/weight-chart";
import { FeedingChart } from "@/components/charts/feeding-chart";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  FeedingEditDialog,
  WeightEditDialog,
  EliminationEditDialog,
  HealthEditDialog,
} from "@/components/shared/event-edit-dialogs";
import { useKittenStore } from "@/stores/kitten.store";
import { useCareStore } from "@/stores/care.store";
import { buildKittenSummary } from "@/services/alert.service";
import { getRepositories } from "@/db/index";
import { formatWeight, formatWeightChange } from "@/lib/utils";
import { useFormatAge } from "@/lib/use-format-age";
import { useTranslations } from "@/i18n/context";
import type {
  KittenSummary,
  Feeding,
  WeightEntry,
  EliminationEntry,
  MedicationAdministration,
  HealthObservation,
} from "@/domain/types";

type TimelineEvent =
  | { id: string; timestamp: Date; type: "feeding"; label: string; data: Feeding }
  | { id: string; timestamp: Date; type: "weight"; label: string; data: WeightEntry }
  | { id: string; timestamp: Date; type: "elimination"; label: string; data: EliminationEntry }
  | { id: string; timestamp: Date; type: "medication"; label: string; data: MedicationAdministration }
  | { id: string; timestamp: Date; type: "health"; label: string; data: HealthObservation };

interface KittenDetailViewProps {
  kittenId: string;
}

export function KittenDetailView({ kittenId }: KittenDetailViewProps) {
  const router = useRouter();
  const { getKittenById, archiveKitten, deleteKitten } = useKittenStore();
  const {
    feedings,
    weights,
    eliminations,
    administrations,
    healthObservations,
    loadFeedingsForKitten,
    loadWeightsForKitten,
    loadEliminationsForKitten,
    loadMedicationsForKitten,
    loadHealthForKitten,
    deleteFeeding,
    deleteWeight,
    deleteElimination,
    deleteAdministration,
    deleteHealthObservation,
  } = useCareStore();

  const [summary, setSummary] = useState<KittenSummary | null>(null);
  const [editTarget, setEditTarget] = useState<TimelineEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimelineEvent | null>(null);
  const [deletingKitten, setDeletingKitten] = useState(false);

  const t = useTranslations("detail");
  const tk = useTranslations("kitten");
  const tc = useTranslations("common");
  const tz = useTranslations("dangerZone");
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

  const timeline: TimelineEvent[] = [
    ...feedings.slice(0, 10).map((f) => {
      const isFormula = !f.foodType || f.foodType === "formula";
      return {
        id: f.id,
        timestamp: f.timestamp,
        type: "feeding" as const,
        label: isFormula
          ? `🍼 ${t("eventFeeding", { amount: f.amountConsumedMl ?? 0, method: f.method ?? "" })}`
          : f.foodType === "wet"
          ? `🥫 ${t("eventFeedingWet", { amount: f.amountConsumedGrams ?? 0 })}`
          : `🌾 ${t("eventFeedingSolid", { amount: f.amountConsumedGrams ?? 0 })}`,
        data: f,
      };
    }),
    ...weights.slice(0, 5).map((w) => ({
      id: w.id,
      timestamp: w.timestamp,
      type: "weight" as const,
      label: `⚖️ ${t("eventWeight", { weight: formatWeight(w.weightGrams) })}`,
      data: w,
    })),
    ...eliminations.slice(0, 5).map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      type: "elimination" as const,
      label: e.pee && e.poo
        ? `💧💩 ${t("eventPeeAndPoo")}`
        : e.pee
        ? `💧 ${t("eventPee")}`
        : `💩 ${t("eventPoo")}`,
      data: e,
    })),
    ...administrations.slice(0, 5).map((a) => ({
      id: a.id,
      timestamp: a.timestamp,
      type: "medication" as const,
      label: `💊 ${t("eventMedication")}`,
      data: a,
    })),
    ...healthObservations.slice(0, 5).map((h) => ({
      id: h.id,
      timestamp: h.timestamp,
      type: "health" as const,
      label: `🩺 ${t("eventHealth", { energy: h.energy, hydration: h.hydration })}`,
      data: h,
    })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

  const handleDeleteEvent = async () => {
    if (!deleteTarget) return;
    switch (deleteTarget.type) {
      case "feeding": await deleteFeeding(deleteTarget.id); break;
      case "weight": await deleteWeight(deleteTarget.id); break;
      case "elimination": await deleteElimination(deleteTarget.id); break;
      case "medication": await deleteAdministration(deleteTarget.id); break;
      case "health": await deleteHealthObservation(deleteTarget.id); break;
    }
    setDeleteTarget(null);
  };

  const handleDeleteKitten = async () => {
    await deleteKitten(kitten.id);
    router.push("/kittens");
  };

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
            sub={[
              summary.totalConsumedMlToday > 0 ? `${summary.totalConsumedMlToday}ml` : null,
              summary.totalConsumedGramsToday > 0 ? `${summary.totalConsumedGramsToday}g` : null,
            ].filter(Boolean).join(" · ") || "0ml"}
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
                  <span className="text-sm flex-1">{event.label}</span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {event.type !== "medication" && (
                      <button
                        type="button"
                        onClick={() => setEditTarget(event)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        aria-label={tc("edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(event)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={tc("delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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

      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground mb-3">{tz("deleteKittenPrompt")}</p>
        <Button
          variant="destructive"
          className="w-full"
          onClick={() => setDeletingKitten(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {tz("deleteKittenButton")}
        </Button>
      </div>

      {/* Edit dialogs */}
      <FeedingEditDialog
        feeding={editTarget?.type === "feeding" ? editTarget.data : null}
        open={editTarget?.type === "feeding"}
        onClose={() => setEditTarget(null)}
      />
      <WeightEditDialog
        entry={editTarget?.type === "weight" ? editTarget.data : null}
        open={editTarget?.type === "weight"}
        onClose={() => setEditTarget(null)}
      />
      <EliminationEditDialog
        entry={editTarget?.type === "elimination" ? editTarget.data : null}
        open={editTarget?.type === "elimination"}
        onClose={() => setEditTarget(null)}
      />
      <HealthEditDialog
        observation={editTarget?.type === "health" ? editTarget.data : null}
        open={editTarget?.type === "health"}
        onClose={() => setEditTarget(null)}
      />

      {/* Delete event confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteEvent}
        title={tz("deleteEventTitle")}
        body={tz("deleteEventBody")}
        confirmLabel={tc("delete")}
        danger
      />

      {/* Delete kitten confirm */}
      <ConfirmDialog
        open={deletingKitten}
        onClose={() => setDeletingKitten(false)}
        onConfirm={handleDeleteKitten}
        title={tz("deleteKittenTitle", { name: kitten.name })}
        body={tz("deleteKittenBody", { name: kitten.name })}
        confirmLabel={tz("deleteKittenConfirm")}
        danger
      />
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
