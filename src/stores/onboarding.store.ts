"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface OnboardingStore {
  seen: boolean;
  open: boolean;
  setSeen: () => void;
  setOpen: (open: boolean) => void;
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      seen: false,
      open: false,
      setSeen: () => set({ seen: true }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "kittencare-onboarding",
      partialize: (state) => ({ seen: state.seen }),
    }
  )
);
