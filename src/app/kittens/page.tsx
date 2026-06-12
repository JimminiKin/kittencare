"use client";

import { KittenListView } from "@/features/kittens/kitten-list-view";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

export default function KittensPage() {
  const t = useTranslations("kitten");
  return (
    <>
      <PageHeader title={t("listTitle")} backHref="/" />
      <KittenListView />
    </>
  );
}
