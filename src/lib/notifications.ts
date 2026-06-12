import type { Alert } from "@/domain/types";
import { useLocaleStore, type Locale } from "@/stores/locale.store";

const CACHE_KEY = "kittencare-notified";
const COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 h per kittenId+alertType combo

type NotifiedCache = Record<string, number>;

function readCache(): NotifiedCache {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeCache(cache: NotifiedCache): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return "denied";
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

async function loadAlertsDict(locale: Locale): Promise<Record<string, string>> {
  const mod = await import(`../i18n/dictionaries/${locale}.json`);
  const dict = (mod.default ?? mod) as Record<string, Record<string, string>>;
  return dict.alerts ?? {};
}

export async function fireAlertNotifications(alerts: Alert[]): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  if (alerts.length === 0) return;

  const now = Date.now();
  const cache = readCache();
  const locale = useLocaleStore.getState().locale;
  const alertsDict = await loadAlertsDict(locale);

  let changed = false;

  for (const alert of alerts) {
    const key = `${alert.kittenId}:${alert.type}`;
    if ((cache[key] ?? 0) + COOLDOWN_MS > now) continue;

    let body = alertsDict[alert.type] ?? alert.type;
    for (const [k, v] of Object.entries(alert.params)) {
      body = body.replaceAll(`{${k}}`, String(v));
    }

    new Notification(alert.kittenName, {
      body,
      icon: "/icon-192.png",
      tag: key,
    });

    cache[key] = now;
    changed = true;
  }

  if (changed) writeCache(cache);
}
