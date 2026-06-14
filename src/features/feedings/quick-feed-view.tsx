"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NumericStepper } from "@/components/shared/numeric-stepper";
import { PastTimePicker } from "@/components/shared/past-time-picker";
import { useKittens } from "@/hooks/use-kittens";
import { useCareStore } from "@/stores/care.store";
import { useTranslations } from "@/i18n/context";
import { getRepositories } from "@/db/index";
import type { FeedingMethod, FoodType } from "@/domain/types";
import { cn } from "@/lib/utils";

interface QuickFeedViewProps {
  defaultKittenId?: string;
}

export function QuickFeedView({ defaultKittenId }: QuickFeedViewProps) {
  const router = useRouter();
  const { data: kittens = [] } = useKittens();
  const { addFeeding, addElimination } = useCareStore();
  const t = useTranslations("feeding");
  const tc = useTranslations("common");

  const activeKittens = kittens.filter((k) => k.status === "active");

  const [kittenId, setKittenId] = useState(defaultKittenId ?? activeKittens[0]?.id ?? "");
  const [foodType, setFoodType] = useState<FoodType>("formula");
  const [amountMl, setAmountMl] = useState(8);
  const [amountGrams, setAmountGrams] = useState(10);
  const [method, setMethod] = useState<FeedingMethod>("bottle");
  const [pee, setPee] = useState(false);
  const [poo, setPoo] = useState(false);
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FOOD_TYPES: { value: FoodType; label: string; emoji: string }[] = [
    { value: "formula", label: t("formula"), emoji: "🍼" },
    { value: "wet", label: t("wet"), emoji: "🥫" },
    { value: "solid", label: t("solid"), emoji: "🌾" },
  ];

  const METHODS: { value: FeedingMethod; label: string; emoji: string }[] = [
    { value: "bottle", label: t("bottle"), emoji: "🍼" },
    { value: "syringe", label: t("syringe"), emoji: "💉" },
    { value: "tube", label: t("tube"), emoji: "🩺" },
  ];

  useEffect(() => {
    if (!kittenId && activeKittens.length > 0) {
      setKittenId(defaultKittenId ?? activeKittens[0].id);
    }
  }, [activeKittens, kittenId, defaultKittenId]);

  useEffect(() => {
    if (!kittenId) return;
    getRepositories().feedings.getRecentForKitten(kittenId, 1).then((recent) => {
      const last = recent[0];
      if (!last) return;
      if (last.foodType) setFoodType(last.foodType);
      if (!last.foodType || last.foodType === "formula") {
        if (last.amountConsumedMl) setAmountMl(last.amountConsumedMl);
        if (last.method) setMethod(last.method);
      } else {
        if (last.amountConsumedGrams) setAmountGrams(last.amountConsumedGrams);
      }
    });
  }, [kittenId]);

  const handleSave = async () => {
    if (!kittenId) return;
    setSaving(true);
    setError(null);
    try {
      await addFeeding({
        kittenId,
        timestamp,
        foodType,
        notes: notes.trim() || undefined,
        ...(foodType === "formula"
          ? { method, amountConsumedMl: amountMl }
          : { amountConsumedGrams: amountGrams }),
      });
      if (pee || poo) {
        await addElimination({ kittenId, timestamp, pee, poo });
      }
      setSaved(true);
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feeding");
    } finally {
      setSaving(false);
    }
  };

  if (activeKittens.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
        <div className="text-5xl">🐱</div>
        <p className="font-semibold">{tc("loading")}</p>
        <p className="text-sm text-muted-foreground">No active kittens found. Try refreshing.</p>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
          <Check className="h-10 w-10 text-green-600" />
        </div>
        <p className="text-xl font-bold text-green-700">{t("saved")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activeKittens.length > 1 && (
        <div className="space-y-2">
          <Label>{t("kitten")}</Label>
          <Select value={kittenId} onValueChange={setKittenId}>
            <SelectTrigger className="h-14 text-base">
              <SelectValue placeholder={t("selectKitten")} />
            </SelectTrigger>
            <SelectContent>
              {activeKittens.map((k) => (
                <SelectItem key={k.id} value={k.id}>{k.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-base font-semibold">{t("foodType")}</Label>
        <div className="grid grid-cols-3 gap-2">
          {FOOD_TYPES.map((ft) => (
            <button
              key={ft.value}
              type="button"
              onClick={() => setFoodType(ft.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-sm font-medium transition-all",
                foodType === ft.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground"
              )}
            >
              <span className="text-2xl">{ft.emoji}</span>
              {ft.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-base font-semibold">{t("amountConsumed")}</Label>
        <div className="flex justify-center">
          {foodType === "formula" ? (
            <NumericStepper
              value={amountMl}
              onChange={setAmountMl}
              min={0}
              max={50}
              step={1}
              unit="ml"
              size="lg"
            />
          ) : (
            <NumericStepper
              value={amountGrams}
              onChange={setAmountGrams}
              min={0}
              max={200}
              step={1}
              unit="g"
              size="lg"
            />
          )}
        </div>
      </div>

      {foodType === "formula" && (
        <div className="space-y-2">
          <Label className="text-base font-semibold">{t("method")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setMethod(m.value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border-2 p-4 text-sm font-medium transition-all",
                  method === m.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                <span className="text-2xl">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-base font-semibold">{t("elimination")}</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPee(!pee)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border-2 p-4 text-base font-medium transition-all",
              pee
                ? "border-sky-400 bg-sky-50 text-sky-700"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            <span className="text-2xl">💧</span>
            {t("pee")}
          </button>
          <button
            type="button"
            onClick={() => setPoo(!poo)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-2xl border-2 p-4 text-base font-medium transition-all",
              poo
                ? "border-amber-400 bg-amber-50 text-amber-700"
                : "border-border bg-background text-muted-foreground"
            )}
          >
            <span className="text-2xl">💩</span>
            {t("poo")}
          </button>
        </div>
      </div>

      <PastTimePicker value={timestamp} onChange={setTimestamp} />

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">{t("notes")}</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={2}
        />
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}

      <Button
        size="xl"
        className="w-full text-lg font-bold"
        onClick={handleSave}
        disabled={saving || !kittenId}
      >
        {saving ? tc("saving") : t("save")}
      </Button>
    </div>
  );
}
