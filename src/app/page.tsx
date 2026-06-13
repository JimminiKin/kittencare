"use client";

import { DashboardView } from "@/features/dashboard/dashboard-view";
import { PageHeader } from "@/components/shared/page-header";
import { LanguageSelector } from "@/components/shared/language-selector";
import { UserChip } from "@/components/layout/user-chip";
import { useTranslations } from "@/i18n/context";

export default function HomePage() {
  const t = useTranslations("dashboard");
  return (
    <>
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <UserChip />
          </div>
        }
      />
      <DashboardView />
    </>
  );
}
