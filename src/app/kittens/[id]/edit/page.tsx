"use client";

import { useParams } from "next/navigation";
import { KittenForm } from "@/features/kittens/kitten-form";
import { PageHeader } from "@/components/shared/page-header";
import { useKitten } from "@/hooks/use-kittens";
import { useTranslations } from "@/i18n/context";

export default function EditKittenPage() {
  const params = useParams<{ id: string }>();
  const kitten = useKitten(params.id);
  const t = useTranslations("kitten");

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
