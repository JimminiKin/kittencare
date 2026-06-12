"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NumericStepper } from "@/components/shared/numeric-stepper";
import { PastTimePicker } from "@/components/shared/past-time-picker";
import { useCareStore } from "@/stores/care.store";
import { useTranslations } from "@/i18n/context";
import type {
  Feeding,
  WeightEntry,
  EliminationEntry,
  HealthObservation,
  FoodType,
  FeedingMethod,
  EnergyLevel,
  HydrationLevel,
  AppetiteLevel,
} from "@/domain/types";
import { cn } from "@/lib/utils";

// ── Feeding ──────────────────────────────────────────────────────────────────

export function FeedingEditDialog({
  feeding,
  open,
  onClose,
}: {
  feeding: Feeding | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateFeeding } = useCareStore();
  const t = useTranslations("feeding");
  const tc = useTranslations("common");

  const [foodType, setFoodType] = useState<FoodType>("formula");
  const [amountMl, setAmountMl] = useState(8);
  const [amountGrams, setAmountGrams] = useState(10);
  const [method, setMethod] = useState<FeedingMethod>("bottle");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!feeding) return;
    setFoodType(feeding.foodType ?? "formula");
    setAmountMl(feeding.amountConsumedMl ?? 8);
    setAmountGrams(feeding.amountConsumedGrams ?? 10);
    setMethod(feeding.method ?? "bottle");
    setTimestamp(feeding.timestamp);
  }, [feeding]);

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

  const handleSave = async () => {
    if (!feeding) return;
    setSaving(true);
    try {
      await updateFeeding(feeding.id, {
        timestamp,
        foodType,
        ...(foodType === "formula"
          ? { method, amountConsumedMl: amountMl, amountConsumedGrams: undefined }
          : { amountConsumedGrams: amountGrams, method: undefined, amountConsumedMl: undefined }),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tc("editRecord")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="font-semibold">{t("foodType")}</Label>
            <div className="grid grid-cols-3 gap-2">
              {FOOD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  type="button"
                  onClick={() => setFoodType(ft.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm font-medium transition-all",
                    foodType === ft.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  <span className="text-xl">{ft.emoji}</span>
                  {ft.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-semibold">{t("amountConsumed")}</Label>
            <div className="flex justify-center">
              {foodType === "formula" ? (
                <NumericStepper value={amountMl} onChange={setAmountMl} min={0} max={50} step={1} unit="ml" />
              ) : (
                <NumericStepper value={amountGrams} onChange={setAmountGrams} min={0} max={200} step={1} unit="g" />
              )}
            </div>
          </div>

          {foodType === "formula" && (
            <div className="space-y-2">
              <Label className="font-semibold">{t("method")}</Label>
              <div className="grid grid-cols-3 gap-2">
                {METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm font-medium transition-all",
                      method === m.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <PastTimePicker value={timestamp} onChange={setTimestamp} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Weight ───────────────────────────────────────────────────────────────────

export function WeightEditDialog({
  entry,
  open,
  onClose,
}: {
  entry: WeightEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateWeight } = useCareStore();
  const t = useTranslations("weight");
  const tc = useTranslations("common");

  const [weightGrams, setWeightGrams] = useState(150);
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setWeightGrams(entry.weightGrams);
    setTimestamp(entry.timestamp);
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await updateWeight(entry.id, { weightGrams, timestamp });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc("editRecord")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-3">
            <Label className="font-semibold">{t("current")}</Label>
            <div className="flex justify-center">
              <NumericStepper value={weightGrams} onChange={setWeightGrams} min={1} max={5000} step={1} unit="g" />
            </div>
            <div className="flex justify-center gap-3">
              {[-10, -5, +5, +10].map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWeightGrams((w) => Math.max(1, w + d))}
                  className="w-14"
                >
                  {d > 0 ? `+${d}` : d}
                </Button>
              ))}
            </div>
          </div>

          <PastTimePicker value={timestamp} onChange={setTimestamp} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Elimination ──────────────────────────────────────────────────────────────

export function EliminationEditDialog({
  entry,
  open,
  onClose,
}: {
  entry: EliminationEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateElimination } = useCareStore();
  const t = useTranslations("feeding");
  const tc = useTranslations("common");

  const [pee, setPee] = useState(false);
  const [poo, setPoo] = useState(false);
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entry) return;
    setPee(entry.pee);
    setPoo(entry.poo);
    setTimestamp(entry.timestamp);
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;
    setSaving(true);
    try {
      await updateElimination(entry.id, { pee, poo, timestamp });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tc("editRecord")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-1">
          <div className="space-y-2">
            <Label className="font-semibold">{t("elimination")}</Label>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Health observation ────────────────────────────────────────────────────────

export function HealthEditDialog({
  observation,
  open,
  onClose,
}: {
  observation: HealthObservation | null;
  open: boolean;
  onClose: () => void;
}) {
  const { updateHealthObservation } = useCareStore();
  const t = useTranslations("health");
  const tc = useTranslations("common");

  const [energy, setEnergy] = useState<EnergyLevel>("normal");
  const [hydration, setHydration] = useState<HydrationLevel>("normal");
  const [appetite, setAppetite] = useState<AppetiteLevel>("normal");
  const [tempEnabled, setTempEnabled] = useState(false);
  const [tempF, setTempF] = useState(101);
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!observation) return;
    setEnergy(observation.energy);
    setHydration(observation.hydration);
    setAppetite(observation.appetite);
    setTempEnabled(observation.temperature !== undefined);
    setTempF(observation.temperature ?? 101);
    setNotes(observation.notes ?? "");
    setTimestamp(observation.timestamp);
  }, [observation]);

  const ENERGY_OPTIONS: { value: EnergyLevel; label: string; emoji: string; color: string }[] = [
    { value: "normal", label: t("energyNormal"), emoji: "⚡", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "low", label: t("energyLow"), emoji: "🔋", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "lethargic", label: t("energyLethargic"), emoji: "😴", color: "border-red-400 bg-red-50 text-red-800" },
  ];
  const HYDRATION_OPTIONS: { value: HydrationLevel; label: string; emoji: string; color: string }[] = [
    { value: "normal", label: t("hydrationNormal"), emoji: "💧", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "mild-concern", label: t("hydrationMild"), emoji: "⚠️", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "concerning", label: t("hydrationConcerning"), emoji: "🚨", color: "border-red-400 bg-red-50 text-red-800" },
  ];
  const APPETITE_OPTIONS: { value: AppetiteLevel; label: string; emoji: string; color: string }[] = [
    { value: "normal", label: t("appetiteNormal"), emoji: "😋", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "reduced", label: t("appetiteReduced"), emoji: "😐", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "poor", label: t("appetitePoor"), emoji: "😟", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  function OptionRow<T extends string>({
    label,
    options,
    value,
    onChange,
  }: {
    label: string;
    options: { value: T; label: string; emoji: string; color: string }[];
    value: T;
    onChange: (v: T) => void;
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="font-semibold">{label}</Label>
        <div className="grid grid-cols-3 gap-2">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-2xl border-2 p-2.5 text-xs font-medium transition-all",
                value === opt.value ? opt.color : "border-border bg-background text-muted-foreground"
              )}
            >
              <span className="text-lg">{opt.emoji}</span>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!observation) return;
    setSaving(true);
    try {
      await updateHealthObservation(observation.id, {
        energy,
        hydration,
        appetite,
        temperature: tempEnabled ? tempF : undefined,
        notes: notes.trim() || undefined,
        timestamp,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tc("editRecord")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <OptionRow label={t("energy")} options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} />
          <OptionRow label={t("hydration")} options={HYDRATION_OPTIONS} value={hydration} onChange={setHydration} />
          <OptionRow label={t("appetite")} options={APPETITE_OPTIONS} value={appetite} onChange={setAppetite} />

          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Label className="font-semibold flex-1">{t("temperature")}</Label>
              <button
                type="button"
                onClick={() => setTempEnabled(!tempEnabled)}
                className={cn(
                  "text-sm px-3 py-1 rounded-full border-2 transition-colors",
                  tempEnabled
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                )}
              >
                {tempEnabled ? tc("on") : tc("off")}
              </button>
            </div>
            {tempEnabled && (
              <div className="flex justify-center">
                <NumericStepper value={tempF} onChange={setTempF} min={90} max={110} step={1} unit="°F" />
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
              rows={2}
            />
          </div>

          <PastTimePicker value={timestamp} onChange={setTimestamp} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{tc("cancel")}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? tc("saving") : tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
