"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AvatarUpload } from "@/components/shared/avatar-upload";
import { useKittenStore } from "@/stores/kitten.store";
import { useTranslations } from "@/i18n/context";
import type { Kitten } from "@/domain/types";

interface KittenFormProps {
  kitten?: Kitten;
  onSuccess?: () => void;
}

export function KittenForm({ kitten, onSuccess }: KittenFormProps) {
  const router = useRouter();
  const { addKitten, updateKitten } = useKittenStore();
  const t = useTranslations("kitten");
  const tc = useTranslations("common");

  // Stable temp ID for new kittens so the storage path is consistent
  // even if the user picks a photo before submitting.
  const [pendingId] = useState(() => crypto.randomUUID());

  const [name, setName] = useState(kitten?.name ?? "");
  const [photo, setPhoto] = useState(kitten?.photo);
  const [sex, setSex] = useState<string>(kitten?.sex ?? "unknown");
  const [estimatedAgeDays, setEstimatedAgeDays] = useState(
    kitten?.estimatedAgeDays?.toString() ?? ""
  );
  const [intakeDate, setIntakeDate] = useState(
    kitten?.intakeDate ? kitten.intakeDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState(kitten?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const storageId = kitten?.id ?? pendingId;

  async function handlePhotoUploaded(url: string) {
    setPhoto(url);
    if (kitten) {
      await updateKitten(kitten.id, { photo: url });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError(t("nameRequired")); return; }

    setSaving(true);
    setError("");
    try {
      if (kitten) {
        await updateKitten(kitten.id, {
          name: name.trim(),
          sex: sex as Kitten["sex"],
          estimatedAgeDays: estimatedAgeDays ? parseInt(estimatedAgeDays) : undefined,
          intakeDate: intakeDate ? new Date(intakeDate) : undefined,
          notes: notes.trim() || undefined,
        });
      } else {
        await addKitten({
          name: name.trim(),
          sex: sex as Kitten["sex"],
          estimatedAgeDays: estimatedAgeDays ? parseInt(estimatedAgeDays) : undefined,
          intakeDate: intakeDate ? new Date(intakeDate) : undefined,
          notes: notes.trim() || undefined,
          photo,
        });
      }
      onSuccess?.() ?? router.push("/");
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
      )}

      <div className="flex justify-center pb-1">
        <AvatarUpload
          currentUrl={photo}
          name={name || t("namePlaceholder")}
          storagePath={`kittens/${storageId}`}
          onUploaded={handlePhotoUploaded}
          size="xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">{t("name")} *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("namePlaceholder")}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sex">{t("sex")}</Label>
          <Select value={sex} onValueChange={setSex}>
            <SelectTrigger id="sex">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unknown">{t("sexUnknown")}</SelectItem>
              <SelectItem value="male">{t("sexMale")}</SelectItem>
              <SelectItem value="female">{t("sexFemale")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="age">{t("ageLabel")}</Label>
          <Input
            id="age"
            type="number"
            min={0}
            max={100}
            value={estimatedAgeDays}
            onChange={(e) => setEstimatedAgeDays(e.target.value)}
            placeholder={t("agePlaceholder")}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="intake">{t("intakeDate")}</Label>
        <Input
          id="intake"
          type="date"
          value={intakeDate}
          onChange={(e) => setIntakeDate(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("notesPlaceholder")}
          rows={3}
        />
      </div>

      <Button type="submit" className="w-full" size="lg" disabled={saving}>
        {saving ? tc("saving") : kitten ? t("saveChanges") : t("addButton")}
      </Button>
    </form>
  );
}
