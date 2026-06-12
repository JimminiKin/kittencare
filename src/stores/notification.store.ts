"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface NotificationStore {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set) => ({
      enabled: false,
      setEnabled: (enabled) => set({ enabled }),
    }),
    { name: "kittencare-notifications" }
  )
);
