"use client";

import { KittenForm } from "@/features/kittens/kitten-form";
import { PageHeader } from "@/components/shared/page-header";
import { useTranslations } from "@/i18n/context";

export default function NewKittenPage() {
  const t = useTranslations("kitten");
  return (
    <>
      <PageHeader title={t("addTitle")} backHref="/" />
      <KittenForm />
    </>
  );
}
