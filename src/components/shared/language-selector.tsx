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
    <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 px-1.5 py-1">
      <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="bg-transparent text-xs font-medium text-foreground focus:outline-none cursor-pointer w-8 text-center"
        aria-label="Language"
        title={LOCALE_LABELS[locale]}
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {l.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
}
