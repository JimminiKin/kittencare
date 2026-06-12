"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { HealthLogView } from "@/features/health/health-log-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

function HealthPageInner() {
  const searchParams = useSearchParams();
  const kittenId = searchParams.get("kittenId") ?? undefined;
  const t = useTranslations("health");
  return (
    <>
      <PageHeader title={t("title")} backHref="/" />
      <HealthLogView defaultKittenId={kittenId} />
    </>
  );
}

export default function HealthPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
      <HealthPageInner />
    </Suspense>
  );
}
