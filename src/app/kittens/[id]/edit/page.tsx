"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { KittenForm } from "@/features/kittens/kitten-form";
import { PageHeader } from "@/components/shared/page-header";
import { useKittenStore } from "@/stores/kitten.store";
import { useTranslations } from "@/i18n/context";

export default function EditKittenPage() {
  const params = useParams<{ id: string }>();
  const { getKittenById, fetchKittens, kittens } = useKittenStore();
  const t = useTranslations("kitten");

  useEffect(() => {
    if (kittens.length === 0) fetchKittens();
  }, [kittens.length, fetchKittens]);

  const kitten = getKittenById(params.id);

  return (
    <>
      <PageHeader
        title={kitten ? t("editTitle", { name: kitten.name }) : t("editTitle", { name: "…" })}
        backHref={`/kittens/${params.id}`}
      />
      {kitten ? (
        <KittenForm kitten={kitten} />
      ) : (
        <p className="text-muted-foreground text-center py-12">{t("loading") ?? "Loading…"}</p>
      )}
    </>
  );
}
