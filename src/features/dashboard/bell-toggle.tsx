"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notification.store";
import {
  isNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
} from "@/lib/notifications";
import { useTranslations } from "@/i18n/context";

export function BellToggle() {
  const { enabled, setEnabled } = useNotificationStore();
  const tn = useTranslations("notifications");

  if (!isNotificationSupported()) return null;

  const active = enabled && getNotificationPermission() === "granted";

  const toggle = async () => {
    if (enabled) { setEnabled(false); return; }
    if (getNotificationPermission() === "granted") { setEnabled(true); return; }
    if (await requestNotificationPermission() === "granted") setEnabled(true);
  };

  const title = active
    ? tn("disable")
    : getNotificationPermission() === "denied"
    ? tn("blocked")
    : tn("enable");

  return (
    <Button variant="ghost" size="icon-sm" onClick={toggle} title={title}>
      {active
        ? <Bell className="h-4 w-4" />
        : <BellOff className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );
}
