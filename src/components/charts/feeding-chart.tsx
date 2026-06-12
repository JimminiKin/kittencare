"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import type { Feeding } from "@/domain/types";

interface FeedingChartProps {
  feedings: Feeding[];
  days?: number;
}

export function FeedingChart({ feedings, days = 7 }: FeedingChartProps) {
  const now = new Date();
  const buckets: Record<string, number> = {};

  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(subDays(now, i));
    buckets[format(d, "MMM d")] = 0;
  }

  const cutoff = startOfDay(subDays(now, days - 1));
  for (const f of feedings) {
    if (f.timestamp >= cutoff) {
      const key = format(startOfDay(f.timestamp), "MMM d");
      if (key in buckets) {
        buckets[key] += f.amountConsumedMl;
      }
    }
  }

  const data = Object.entries(buckets).map(([date, total]) => ({ date, total }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}ml`} />
        <Tooltip
          formatter={(value) => [`${value}ml`, "Total intake"]}
          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}
        />
        <Bar dataKey="total" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
