"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { QuickFeedView } from "@/features/feedings/quick-feed-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

function FeedPageInner() {
  const searchParams = useSearchParams();
  const kittenId = searchParams.get("kittenId") ?? undefined;
  const t = useTranslations("feeding");
  return (
    <>
      <PageHeader title={t("title")} backHref="/" />
      <QuickFeedView defaultKittenId={kittenId} />
    </>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted-foreground">Loading…</div>}>
      <FeedPageInner />
    </Suspense>
  );
}
