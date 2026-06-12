"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MedicationView } from "@/features/medications/medication-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

function MedicationsPageInner() {
  const searchParams = useSearchParams();
  const kittenId = searchParams.get("kittenId") ?? undefined;
  const t = useTranslations("medication");
  return (
    <>
      <PageHeader title={t("title")} backHref="/" />
      <MedicationView defaultKittenId={kittenId} />
    </>
  );
}

export default function MedicationsPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
      <MedicationsPageInner />
    </Suspense>
  );
}
