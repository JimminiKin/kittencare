import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(grams: number): string {
  return `${grams}g`;
}

export function formatWeightChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change}g`;
}

export function formatMl(ml: number): string {
  return `${ml}ml`;
}

export function formatTimestamp(date: Date): string {
  if (isToday(date)) return format(date, "h:mm a");
  if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
  return format(date, "MMM d, h:mm a");
}

export function formatRelative(date: Date): string {
  return formatDistanceToNow(date, { addSuffix: true });
}

export function formatAge(estimatedAgeDays?: number, birthDate?: Date): string {
  if (birthDate) {
    const days = Math.floor(
      (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return formatDays(days);
  }
  if (estimatedAgeDays !== undefined) return formatDays(estimatedAgeDays);
  return "Unknown age";
}

function formatDays(days: number): string {
  if (days < 7) return `${days}d old`;
  const weeks = Math.floor(days / 7);
  const rem = days % 7;
  return rem > 0 ? `${weeks}w ${rem}d old` : `${weeks}w old`;
}

export function startOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
