"use client";

import { useTranslations } from "@/i18n/context";

export function useFormatAge() {
  const t = useTranslations("kitten");

  return function formatAge(estimatedAgeDays?: number, birthDate?: Date): string {
    if (birthDate) {
      const days = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      return formatDays(t, days);
    }
    if (estimatedAgeDays !== undefined) return formatDays(t, estimatedAgeDays);
    return t("unknownAge");
  };
}

function formatDays(t: (key: string, params?: Record<string, string | number>) => string, days: number): string {
  if (days < 7) return t("ageDays", { days });
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  return rem > 0 ? t("ageWeeksDays", { weeks, days: rem }) : t("ageWeeks", { weeks });
}
