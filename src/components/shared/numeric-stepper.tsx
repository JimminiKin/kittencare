"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface NumericStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  className?: string;
  size?: "default" | "lg";
}

export function NumericStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  unit = "",
  className,
  size = "default",
}: NumericStepperProps) {
  const decrement = () => onChange(Math.max(min, value - step));
  const increment = () => onChange(Math.min(max, value + step));

  const isLarge = size === "lg";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Button
        type="button"
        variant="outline"
        size={isLarge ? "icon-lg" : "icon"}
        onClick={decrement}
        disabled={value <= min}
        className={cn("rounded-full border-2", isLarge && "h-16 w-16")}
        aria-label="Decrease"
      >
        <Minus className={cn("h-5 w-5", isLarge && "h-7 w-7")} />
      </Button>

      <div
        className={cn(
          "min-w-[80px] text-center font-bold tabular-nums",
          isLarge ? "text-5xl" : "text-3xl"
        )}
      >
        {value}
        {unit && (
          <span className={cn("ml-1 font-normal text-muted-foreground", isLarge ? "text-2xl" : "text-xl")}>
            {unit}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        size={isLarge ? "icon-lg" : "icon"}
        onClick={increment}
        disabled={value >= max}
        className={cn("rounded-full border-2", isLarge && "h-16 w-16")}
        aria-label="Increase"
      >
        <Plus className={cn("h-5 w-5", isLarge && "h-7 w-7")} />
      </Button>
    </div>
  );
}
