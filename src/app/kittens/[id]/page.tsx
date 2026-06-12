"use client";

import { use } from "react";
import { KittenDetailView } from "@/features/kittens/kitten-detail-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

export default function KittenDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations("kitten");
  return (
    <>
      <PageHeader title={t("detailTitle")} backHref="/kittens" />
      <KittenDetailView kittenId={id} />
    </>
  );
}
