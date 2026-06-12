"use client";

import { Globe } from "lucide-react";
import { useLocaleStore, LOCALES, type Locale } from "@/stores/locale.store";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pt: "Português",
  de: "Deutsch",
};

export function LanguageSelector() {
  const { locale, setLocale } = useLocaleStore();

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/50 px-2 py-1.5">
      <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
