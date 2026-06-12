import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "fr" | "es" | "it" | "pt" | "de";

export const LOCALES: Locale[] = ["en", "fr", "es", "it", "pt", "de"];

interface LocaleStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleStore>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "kittencare-locale" }
  )
);
