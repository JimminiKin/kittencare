"use client";

import { useEffect, useState } from "react";
import { format, addHours, formatDistanceToNow } from "date-fns";
import { Plus, Check, Clock, AlertCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { NumericStepper } from "@/components/shared/numeric-stepper";
import { useKittens } from "@/hooks/use-kittens";
import { useKittenCare } from "@/hooks/use-kitten-care";
import { useCareStore } from "@/stores/care.store";
import { useTranslations } from "@/i18n/context";
import type { Medication, MedicationAdministration } from "@/domain/types";
import type { CreateMedicationInput } from "@/domain/validation";
import { cn } from "@/lib/utils";

interface MedicationViewProps {
  defaultKittenId?: string;
}

export function MedicationView({ defaultKittenId }: MedicationViewProps) {
  const { data: kittens = [] } = useKittens();
  const { addMedication, deleteMedication, administerMedication } = useCareStore();
  const t = useTranslations("medication");
  const tc = useTranslations("common");

  const activeKittens = kittens.filter((k) => k.status === "active");
  const [selectedKittenId, setSelectedKittenId] = useState(defaultKittenId ?? "");
  const { medications: kittenMeds, administrations: kittenAdmins } = useKittenCare(
    selectedKittenId || activeKittens[0]?.id || ""
  );

  useEffect(() => {
    if (!selectedKittenId && activeKittens.length > 0) {
      setSelectedKittenId(defaultKittenId ?? activeKittens[0].id);
    }
  }, [activeKittens, selectedKittenId, defaultKittenId]);

  const getLatestAdmin = (medId: string): MedicationAdministration | undefined =>
    kittenAdmins
      .filter((a) => a.medicationId === medId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

  const getMedStatus = (med: Medication) => {
    const now = new Date();
    const latest = getLatestAdmin(med.id);
    const dueAt = latest
      ? addHours(latest.timestamp, med.frequencyHours)
      : med.startDate;
    const overdue = dueAt <= now;
    const dueIn = dueAt.getTime() - now.getTime();
    return { dueAt, overdue, dueIn, latest };
  };

  return (
    <div className="space-y-4">
      {activeKittens.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {activeKittens.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelectedKittenId(k.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                selectedKittenId === k.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {k.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <AddMedicationDialog
          kittenId={selectedKittenId}
          onAdd={(input) => addMedication(input)}
        />
      </div>

      {kittenMeds.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MedIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("noMedications")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {kittenMeds.map((med) => {
            const { dueAt, overdue, latest } = getMedStatus(med);
            const isActive = !med.endDate || med.endDate >= new Date();
            return (
              <Card key={med.id} className={overdue && isActive ? "border-red-300" : ""}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base">{med.name}</span>
                        {!isActive && <Badge variant="secondary">{t("ended")}</Badge>}
                        {isActive && overdue && (
                          <Badge variant="critical">
                            <AlertCircle className="h-3 w-3 mr-1" /> {t("overdue")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {med.dosage} · {t("every", { hours: med.frequencyHours })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground shrink-0"
                      onClick={() => deleteMedication(med.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {isActive && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        {latest ? (
                          <span className="text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 inline mr-1" />
                            {t("lastGiven", { time: formatDistanceToNow(latest.timestamp, { addSuffix: true }) })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{t("notYetGiven")}</span>
                        )}
                        <br />
                        <span className={overdue ? "text-red-600 font-medium" : "text-muted-foreground"}>
                          {overdue
                            ? t("dueLabel", { time: formatDistanceToNow(dueAt, { addSuffix: true }) })
                            : t("nextDose", { time: formatDistanceToNow(dueAt, { addSuffix: true }) })}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant={overdue ? "default" : "outline"}
                        onClick={() =>
                          administerMedication({
                            medicationId: med.id,
                            kittenId: med.kittenId,
                            timestamp: new Date(),
                          })
                        }
                      >
                        <Check className="h-4 w-4 mr-1" />
                        {tc("given")}
                      </Button>
                    </div>
                  )}

                  {med.notes && (
                    <p className="text-xs text-muted-foreground border-t pt-2">{med.notes}</p>
                  )}

                  {kittenAdmins.filter((a) => a.medicationId === med.id).length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                      <p className="font-medium mb-1">{t("recentAdmins")}</p>
                      {kittenAdmins
                        .filter((a) => a.medicationId === med.id)
                        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                        .slice(0, 3)
                        .map((a) => (
                          <p key={a.id}>{format(a.timestamp, "MMM d, h:mm a")}</p>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" />
      <path d="m8.5 8.5 7 7" />
    </svg>
  );
}

interface AddMedicationDialogProps {
  kittenId: string;
  onAdd: (input: CreateMedicationInput) => void;
}

function AddMedicationDialog({ kittenId, onAdd }: AddMedicationDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [frequencyHours, setFrequencyHours] = useState(12);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const t = useTranslations("medication");
  const tc = useTranslations("common");

  const handleSave = async () => {
    if (!name.trim() || !dosage.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        kittenId,
        name: name.trim(),
        dosage: dosage.trim(),
        frequencyHours,
        startDate: new Date(),
        notes: notes.trim() || undefined,
      });
      setOpen(false);
      setName(""); setDosage(""); setFrequencyHours(12); setNotes("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!kittenId}>
          <Plus className="h-4 w-4" /> {t("add")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm mx-4">
        <DialogHeader>
          <DialogTitle>{t("add")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("nameLabel")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} autoFocus />
          </div>
          <div className="space-y-2">
            <Label>{t("dosageLabel")}</Label>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder={t("dosagePlaceholder")} />
          </div>
          <div className="space-y-3">
            <Label>{t("frequencyLabel")}</Label>
            <NumericStepper
              value={frequencyHours}
              onChange={setFrequencyHours}
              min={1}
              max={72}
              step={1}
              unit="h"
            />
          </div>
          <div className="space-y-2">
            <Label>{t("notesLabel")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder={t("notesPlaceholder")} />
          </div>
          <Button className="w-full" onClick={handleSave} disabled={saving || !name || !dosage}>
            {saving ? tc("saving") : t("addButton")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
