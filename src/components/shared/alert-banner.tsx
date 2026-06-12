"use client";

import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useState } from "react";
import type { Alert } from "@/domain/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/context";

interface AlertBannerProps {
  alerts: Alert[];
}

const severityConfig = {
  info: {
    icon: Info,
    bg: "bg-blue-50 border-blue-200",
    text: "text-blue-800",
    iconColor: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50 border-amber-200",
    text: "text-amber-800",
    iconColor: "text-amber-500",
  },
  critical: {
    icon: AlertCircle,
    bg: "bg-red-50 border-red-200",
    text: "text-red-800",
    iconColor: "text-red-500",
  },
};

export function AlertBanner({ alerts }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const t = useTranslations("alerts");

  const visible = alerts.filter((a) => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      {visible.map((alert) => {
        const config = severityConfig[alert.severity];
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border p-4",
              config.bg
            )}
            role="alert"
          >
            <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", config.iconColor)} />
            <p className={cn("flex-1 text-sm font-medium", config.text)}>
              {t(alert.type, alert.params)}
            </p>
            <button
              onClick={() => setDismissed((s) => new Set(s).add(alert.id))}
              className={cn("shrink-0 opacity-60 hover:opacity-100", config.text)}
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
