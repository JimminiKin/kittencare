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
import { useKittenStore } from "@/stores/kitten.store";
import { useCareStore } from "@/stores/care.store";
import { useTranslations } from "@/i18n/context";
import type { FeedingMethod } from "@/domain/types";
import { cn } from "@/lib/utils";

interface QuickFeedViewProps {
  defaultKittenId?: string;
}

export function QuickFeedView({ defaultKittenId }: QuickFeedViewProps) {
  const router = useRouter();
  const { kittens, fetchKittens } = useKittenStore();
  const { addFeeding, addElimination } = useCareStore();
  const t = useTranslations("feeding");
  const tc = useTranslations("common");

  const activeKittens = kittens.filter((k) => k.status === "active");

  const [kittenId, setKittenId] = useState(defaultKittenId ?? activeKittens[0]?.id ?? "");
  const [amountMl, setAmountMl] = useState(8);
  const [method, setMethod] = useState<FeedingMethod>("bottle");
  const [pee, setPee] = useState(false);
  const [poo, setPoo] = useState(false);
  const [notes, setNotes] = useState("");
  const [timestamp, setTimestamp] = useState<Date>(new Date());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const METHODS: { value: FeedingMethod; label: string; emoji: string }[] = [
    { value: "bottle", label: t("bottle"), emoji: "🍼" },
    { value: "syringe", label: t("syringe"), emoji: "💉" },
    { value: "tube", label: t("tube"), emoji: "🩺" },
  ];

  useEffect(() => {
    fetchKittens();
  }, [fetchKittens]);

  useEffect(() => {
    if (!kittenId && activeKittens.length > 0) {
      setKittenId(defaultKittenId ?? activeKittens[0].id);
    }
  }, [activeKittens, kittenId, defaultKittenId]);

  const handleSave = async () => {
    if (!kittenId) return;
    setSaving(true);
    try {
      await addFeeding({
        kittenId,
        timestamp,
        method,
        amountConsumedMl: amountMl,
      });
      if (pee || poo) {
        await addElimination({
          kittenId,
          timestamp,
          pee,
          poo,
          notes: notes.trim() || undefined,
        });
      }
      setSaved(true);
      setTimeout(() => {
        router.push(defaultKittenId ? `/kittens/${kittenId}` : "/");
      }, 800);
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

      <div className="space-y-3">
        <Label className="text-base font-semibold">{t("amountConsumed")}</Label>
        <div className="flex justify-center">
          <NumericStepper
            value={amountMl}
            onChange={setAmountMl}
            min={0}
            max={50}
            step={1}
            unit="ml"
            size="lg"
          />
        </div>
      </div>

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
