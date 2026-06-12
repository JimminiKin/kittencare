"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WeightEntryView } from "@/features/weights/weight-entry-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

function WeightPageInner() {
  const searchParams = useSearchParams();
  const kittenId = searchParams.get("kittenId") ?? undefined;
  const t = useTranslations("weight");
  return (
    <>
      <PageHeader title={t("title")} backHref="/" />
      <WeightEntryView defaultKittenId={kittenId} />
    </>
  );
}

export default function WeightPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
      <WeightPageInner />
    </Suspense>
  );
}
