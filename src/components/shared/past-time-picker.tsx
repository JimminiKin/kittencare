"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/i18n/context";

interface PastTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
}

function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

export function PastTimePicker({ value, onChange, className }: PastTimePickerProps) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("timePicker");

  const isNow = Date.now() - value.getTime() < 90_000;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = new Date(e.target.value);
    if (!isNaN(parsed.getTime())) onChange(parsed);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors",
          className
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        {isNow ? t("nowPrompt") : format(value, "MMM d, h:mm a")}
      </button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Clock className="h-3.5 w-3.5 text-primary" />
          {t("question")}
        </span>
        <button
          type="button"
          onClick={() => {
            onChange(new Date());
            setOpen(false);
          }}
          className="text-xs text-muted-foreground underline underline-offset-2"
        >
          {t("useNow")}
        </button>
      </div>
      <input
        type="datetime-local"
        value={toLocalInputValue(value)}
        max={toLocalInputValue(new Date())}
        onChange={handleChange}
        className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {!isNow && (
        <p className="text-xs text-muted-foreground">
          {t("loggingFor", { datetime: format(value, "EEEE, MMM d 'at' h:mm a") })}
        </p>
      )}
    </div>
  );
}
