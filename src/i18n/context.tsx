"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocaleStore, LOCALES, type Locale } from "@/stores/locale.store";
import enDict from "./dictionaries/en.json";

type Dictionary = Record<string, Record<string, string>>;

const cache: Partial<Record<Locale, Dictionary>> = {
  en: enDict as unknown as Dictionary,
};

async function loadDictionary(locale: Locale): Promise<Dictionary> {
  if (cache[locale]) return cache[locale]!;
  const dict = (await import(`./dictionaries/${locale}.json`)) as Dictionary;
  cache[locale] = dict;
  return dict;
}

const I18nContext = createContext<Dictionary>(enDict as unknown as Dictionary);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const [dict, setDict] = useState<Dictionary>(enDict as unknown as Dictionary);

  // On first mount, default to browser language if the user has no saved preference
  useEffect(() => {
    const stored = localStorage.getItem("kittencare-locale");
    if (!stored) {
      const lang = navigator.language?.split("-")[0] ?? "en";
      const matched = LOCALES.find((l) => l === lang);
      if (matched) setLocale(matched);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadDictionary(locale).then(setDict);
  }, [locale]);

  return <I18nContext.Provider value={dict}>{children}</I18nContext.Provider>;
}

export function useTranslations(namespace: string) {
  const dict = useContext(I18nContext);
  const ns = dict[namespace] ?? {};
  return function t(key: string, params?: Record<string, string | number>): string {
    let str = ns[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };
}
