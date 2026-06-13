"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NumericStepper } from "@/components/shared/numeric-stepper";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useKittens } from "@/hooks/use-kittens";
import { useKittenCare } from "@/hooks/use-kitten-care";
import { useCareStore } from "@/stores/care.store";
import { useTranslations } from "@/i18n/context";
import type { EnergyLevel, HydrationLevel, AppetiteLevel } from "@/domain/types";
import { cn } from "@/lib/utils";

interface HealthLogViewProps {
  defaultKittenId?: string;
}

type OptionSet<T extends string> = { value: T; label: string; emoji: string; color: string }[];

function OptionPicker<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: OptionSet<T>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base font-semibold">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-sm font-medium transition-all",
              value === opt.value ? opt.color : "border-border bg-background text-muted-foreground"
            )}
          >
            <span className="text-xl">{opt.emoji}</span>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function HealthLogView({ defaultKittenId }: HealthLogViewProps) {
  const router = useRouter();
  const { data: kittens = [] } = useKittens();
  const { addHealthObservation } = useCareStore();
  const t = useTranslations("health");
  const tc = useTranslations("common");

  const ENERGY_OPTIONS: OptionSet<EnergyLevel> = [
    { value: "normal", label: t("energyNormal"), emoji: "⚡", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "low", label: t("energyLow"), emoji: "🔋", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "lethargic", label: t("energyLethargic"), emoji: "😴", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  const HYDRATION_OPTIONS: OptionSet<HydrationLevel> = [
    { value: "normal", label: t("hydrationNormal"), emoji: "💧", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "mild-concern", label: t("hydrationMild"), emoji: "⚠️", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "concerning", label: t("hydrationConcerning"), emoji: "🚨", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  const APPETITE_OPTIONS: OptionSet<AppetiteLevel> = [
    { value: "normal", label: t("appetiteNormal"), emoji: "😋", color: "border-green-400 bg-green-50 text-green-800" },
    { value: "reduced", label: t("appetiteReduced"), emoji: "😐", color: "border-amber-400 bg-amber-50 text-amber-800" },
    { value: "poor", label: t("appetitePoor"), emoji: "😟", color: "border-red-400 bg-red-50 text-red-800" },
  ];

  const activeKittens = kittens.filter((k) => k.status === "active");
  const [kittenId, setKittenId] = useState(defaultKittenId ?? "");
  const { healthObservations } = useKittenCare(kittenId || activeKittens[0]?.id || "");
  const [energy, setEnergy] = useState<EnergyLevel>("normal");
  const [hydration, setHydration] = useState<HydrationLevel>("normal");
  const [appetite, setAppetite] = useState<AppetiteLevel>("normal");
  const [tempEnabled, setTempEnabled] = useState(false);
  const [tempF, setTempF] = useState(101);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!kittenId && activeKittens.length > 0) {
      setKittenId(defaultKittenId ?? activeKittens[0].id);
    }
  }, [activeKittens, kittenId, defaultKittenId]);

  const handleSave = async () => {
    if (!kittenId) return;
    setSaving(true);
    try {
      await addHealthObservation({
        kittenId,
        timestamp: new Date(),
        energy,
        hydration,
        appetite,
        temperature: tempEnabled ? tempF : undefined,
        notes: notes.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => router.push(defaultKittenId ? `/kittens/${kittenId}` : "/"), 800);
    } finally {
      setSaving(false);
    }
  };

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

  const kittenObs = healthObservations;

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

      <OptionPicker label={t("energy")} options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} />
      <OptionPicker label={t("hydration")} options={HYDRATION_OPTIONS} value={hydration} onChange={setHydration} />
      <OptionPicker label={t("appetite")} options={APPETITE_OPTIONS} value={appetite} onChange={setAppetite} />

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <Label className="text-base font-semibold flex-1">{t("temperature")}</Label>
          <button
            type="button"
            onClick={() => setTempEnabled(!tempEnabled)}
            className={cn(
              "text-sm px-3 py-1 rounded-full border-2 transition-colors",
              tempEnabled ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
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

      <div className="space-y-2">
        <Label>{t("notes")}</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} rows={2} />
      </div>

      <Button size="xl" className="w-full text-lg font-bold" onClick={handleSave} disabled={saving || !kittenId}>
        {saving ? tc("saving") : t("save")}
      </Button>

      {kittenObs.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-semibold text-base border-t pt-4">{t("recentTitle")}</h3>
          {kittenObs.slice(0, 5).map((obs) => (
            <Card key={obs.id}>
              <CardContent className="p-3 text-sm space-y-1">
                <p className="text-xs text-muted-foreground">{format(obs.timestamp, "MMM d, h:mm a")}</p>
                <div className="flex gap-4">
                  <span>{t("energy")}: <strong>{obs.energy}</strong></span>
                  <span>{t("hydration")}: <strong>{obs.hydration}</strong></span>
                  <span>{t("appetite")}: <strong>{obs.appetite}</strong></span>
                </div>
                {obs.temperature && <p>{t("tempDisplay", { value: obs.temperature })}</p>}
                {obs.notes && <p className="text-muted-foreground">{obs.notes}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
