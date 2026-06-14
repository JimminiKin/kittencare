"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { formatWeight } from "@/lib/utils";
import { getRepositories } from "@/db/index";

interface WeightEntryViewProps {
  defaultKittenId?: string;
}

export function WeightEntryView({ defaultKittenId }: WeightEntryViewProps) {
  const router = useRouter();
  const { data: kittens = [] } = useKittens();
  const { addWeight } = useCareStore();
  const t = useTranslations("weight");
  const tc = useTranslations("common");

  const activeKittens = kittens.filter((k) => k.status === "active");

  const [kittenId, setKittenId] = useState(defaultKittenId ?? activeKittens[0]?.id ?? "");
  const [weightGrams, setWeightGrams] = useState(150);
  const [lastWeight, setLastWeight] = useState<number | null>(null);
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!kittenId && activeKittens.length > 0) {
      setKittenId(defaultKittenId ?? activeKittens[0].id);
    }
  }, [activeKittens, kittenId, defaultKittenId]);

  useEffect(() => {
    if (!kittenId) return;
    getRepositories().weights.getLatestForKitten(kittenId).then((w) => {
      if (w) {
        setLastWeight(w.weightGrams);
        setWeightGrams(w.weightGrams);
      } else {
        setLastWeight(null);
      }
    });
  }, [kittenId]);

  const handleSave = async () => {
    if (!kittenId) return;
    setSaving(true);
    try {
      await addWeight({ kittenId, timestamp, weightGrams });
      setSaved(true);
      setTimeout(() => router.push("/"), 800);
    } finally {
      setSaving(false);
    }
  };

  const diff = lastWeight !== null ? weightGrams - lastWeight : null;

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
    <div className="space-y-8">
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

      {lastWeight !== null && (
        <div className="rounded-2xl bg-muted p-4 text-center">
          <p className="text-sm text-muted-foreground">{t("previous")}</p>
          <p className="text-2xl font-bold">{formatWeight(lastWeight)}</p>
        </div>
      )}

      <div className="space-y-4">
        <Label className="text-base font-semibold block text-center">{t("current")}</Label>
        <div className="flex justify-center">
          <NumericStepper
            value={weightGrams}
            onChange={setWeightGrams}
            min={1}
            max={5000}
            step={1}
            unit="g"
            size="lg"
          />
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

      {diff !== null && (
        <div
          className={`rounded-2xl p-4 text-center text-2xl font-bold ${
            diff > 0
              ? "bg-green-50 text-green-700"
              : diff < 0
              ? "bg-red-50 text-red-700"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {diff > 0 ? `+${diff}g` : diff < 0 ? `${diff}g` : t("noChange")}
        </div>
      )}

      <PastTimePicker value={timestamp} onChange={setTimestamp} />

      <Button size="xl" className="w-full text-lg font-bold" onClick={handleSave} disabled={saving || !kittenId}>
        {saving ? tc("saving") : t("save")}
      </Button>
    </div>
  );
}
