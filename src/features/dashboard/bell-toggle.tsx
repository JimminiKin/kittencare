"use client";

import { Bell, BellOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useNotificationStore } from "@/stores/notification.store";
import { useAuthStore } from "@/stores/auth.store";
import { useTranslations } from "@/i18n/context";
import {
  isPushSupported,
  registerSW,
  subscribeToPush,
  getExistingSubscription,
  unsubscribeFromPush,
  saveSubscription,
  deleteSubscription,
} from "@/lib/push";
import { requestNotificationPermission, getNotificationPermission } from "@/lib/notifications";

export function BellToggle() {
  const { enabled, setEnabled } = useNotificationStore();
  const { user } = useAuthStore();
  const tn = useTranslations("notifications");
  const [active, setActive] = useState(false);

  // Register SW on mount and derive active state from existing subscription.
  useEffect(() => {
    if (!isPushSupported()) return;
    registerSW().then(async () => {
      const sub = await getExistingSubscription();
      setActive(!!sub && enabled);
    });
  }, [enabled]);

  if (!isPushSupported()) return null;

  const isBlocked = getNotificationPermission() === "denied";

  const toggle = async () => {
    if (active) {
      // Disable: unsubscribe from push and remove from DB.
      const sub = await getExistingSubscription();
      if (sub && user) await deleteSubscription(sub);
      await unsubscribeFromPush();
      setEnabled(false);
      setActive(false);
      return;
    }

    // Enable: request permission, subscribe, save.
    const permission =
      getNotificationPermission() === "granted"
        ? "granted"
        : await requestNotificationPermission();

    if (permission !== "granted") return;

    await registerSW();
    const sub = await subscribeToPush();
    if (!sub) return;

    if (user) await saveSubscription(sub);
    setEnabled(true);
    setActive(true);
  };

  const title = active
    ? tn("disable")
    : isBlocked
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
