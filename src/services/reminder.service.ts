import type { Reminder, ReminderType } from "@/domain/types";

// ── Interface ────────────────────────────────────────────────────────────────
// Decoupled so Capacitor LocalNotifications can plug in later.

export interface ReminderService {
  scheduleReminder(reminder: Reminder): Promise<void>;
  cancelReminder(id: string): Promise<void>;
  cancelAllForKitten(kittenId: string): Promise<void>;
  listPending(): Promise<Reminder[]>;
  requestPermission(): Promise<boolean>;
}

// ── Browser implementation (Web Notifications API) ────────────────────────────

export class BrowserReminderService implements ReminderService {
  private pending: Map<string, Reminder> = new Map();
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    const result = await Notification.requestPermission();
    return result === "granted";
  }

  async scheduleReminder(reminder: Reminder): Promise<void> {
    this.pending.set(reminder.id, reminder);
    const delay = reminder.scheduledAt.getTime() - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(async () => {
      this.pending.delete(reminder.id);
      this.timers.delete(reminder.id);
      const hasPermission = await this.requestPermission();
      if (hasPermission) {
        new Notification(reminder.title, {
          body: reminder.body,
          icon: "/icon-192.png",
          tag: reminder.id,
        });
      }
    }, delay);

    this.timers.set(reminder.id, timer);
  }

  async cancelReminder(id: string): Promise<void> {
    this.pending.delete(id);
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }

  async cancelAllForKitten(kittenId: string): Promise<void> {
    for (const [id, reminder] of this.pending) {
      if (reminder.kittenId === kittenId) {
        await this.cancelReminder(id);
      }
    }
  }

  async listPending(): Promise<Reminder[]> {
    return Array.from(this.pending.values());
  }
}

// ── Capacitor stub (replace in native builds) ─────────────────────────────────
// Swap this in main.ts when wrapping with Capacitor:
//
// import { LocalNotifications } from "@capacitor/local-notifications";
//
// export class CapacitorReminderService implements ReminderService {
//   async requestPermission() { ... }
//   async scheduleReminder(r) {
//     await LocalNotifications.schedule({ notifications: [{ id: ..., title: r.title, body: r.body, schedule: { at: r.scheduledAt } }] });
//   }
//   async cancelReminder(id) { await LocalNotifications.cancel({ notifications: [{ id: ... }] }); }
//   async cancelAllForKitten(kittenId) { ... }
//   async listPending() { ... }
// }

// ── Singleton ─────────────────────────────────────────────────────────────────

let _reminderService: ReminderService | null = null;

export function getReminderService(): ReminderService {
  if (!_reminderService) {
    _reminderService = new BrowserReminderService();
  }
  return _reminderService;
}

// Allow injection for testing / native builds
export function setReminderService(service: ReminderService) {
  _reminderService = service;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function buildFeedingReminder(
  kittenId: string,
  kittenName: string,
  dueAt: Date
): Reminder {
  return {
    id: `feeding-${kittenId}-${dueAt.getTime()}`,
    kittenId,
    type: "feeding" as ReminderType,
    title: `Time to feed ${kittenName}`,
    body: `${kittenName} is due for their next feeding.`,
    scheduledAt: dueAt,
  };
}

export function buildMedicationReminder(
  kittenId: string,
  kittenName: string,
  medicationName: string,
  dueAt: Date
): Reminder {
  return {
    id: `med-${kittenId}-${dueAt.getTime()}`,
    kittenId,
    type: "medication" as ReminderType,
    title: `Medication due for ${kittenName}`,
    body: `${kittenName} needs their ${medicationName}.`,
    scheduledAt: dueAt,
    metadata: { medicationName },
  };
}
