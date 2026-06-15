"use client";

import { useState } from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";
import type { WeightEntry } from "@/domain/types";
import { interpolateReference, getAgeDaysAt } from "@/lib/growth-reference";
import { useTranslations } from "@/i18n/context";
import { cn } from "@/lib/utils";

type SDBand = "none" | "1sd" | "2sd" | "both";

interface WeightChartProps {
  entries: WeightEntry[];
  kitten?: { birthDate?: Date; estimatedAgeDays?: number; updatedAt?: Date };
  height?: number;
}

type ChartPoint = {
  label: string;
  ageDays?: number;
  actual?: number;
  refMean?: number;
  band1SD?: [number, number];
  band2SD?: [number, number];
};

function buildReferenceData(
  entries: WeightEntry[],
  kitten: WeightChartProps["kitten"]
): ChartPoint[] | null {
  if (!kitten) return null;

  const sorted = [...entries].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  const withAge = sorted
    .map((e) => ({ ageDays: getAgeDaysAt(kitten, e.timestamp), weight: e.weightGrams }))
    .filter((p): p is { ageDays: number; weight: number } => p.ageDays !== null && p.ageDays >= 0);

  if (withAge.length === 0) return null;

  const minAge = withAge[0].ageDays;
  const maxAge = withAge[withAge.length - 1].ageDays;

  const points: ChartPoint[] = [];
  for (let day = minAge; day <= maxAge; day++) {
    const ref = interpolateReference(day);
    const measured = withAge.find((p) => p.ageDays === day);
    points.push({
      label: `Day ${day}`,
      ageDays: day,
      actual: measured?.weight,
      refMean: ref.mean,
      band1SD: [Math.max(0, ref.mean - ref.sd), ref.mean + ref.sd],
      band2SD: [Math.max(0, ref.mean - 2 * ref.sd), ref.mean + 2 * ref.sd],
    });
  }

  for (const p of withAge) {
    const existing = points.find((pt) => pt.ageDays === p.ageDays);
    if (existing) {
      existing.actual = p.weight;
    }
  }

  return points;
}

function buildDateData(entries: WeightEntry[]): ChartPoint[] {
  return [...entries]
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    .map((e) => ({ label: format(e.timestamp, "MMM d"), actual: e.weightGrams }));
}


export function WeightChart({ entries, kitten, height = 220 }: WeightChartProps) {
  const [sdBand, setSdBand] = useState<SDBand>("both");
  const t = useTranslations("chart");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    const actual = payload.find((p: any) => p.name === "actual");
    const mean   = payload.find((p: any) => p.name === "refMean");
    const b1     = payload.find((p: any) => p.name === "band1SD");
    const b2     = payload.find((p: any) => p.name === "band2SD");
    return (
      <div className="rounded-xl border bg-background p-3 shadow-md text-sm space-y-1">
        <p className="font-semibold text-xs text-muted-foreground mb-1">{label}</p>
        {actual && (
          <p className="font-bold" style={{ color: "#7c3aed" }}>
            {t("actual")}: {actual.value}g
          </p>
        )}
        {mean && (
          <p className="text-muted-foreground">{t("refAvg", { value: Math.round(mean.value) })}</p>
        )}
        {b1 && Array.isArray(b1.value) && (
          <p className="text-muted-foreground text-xs">{t("band1SD", { low: b1.value[0], high: b1.value[1] })}</p>
        )}
        {b2 && Array.isArray(b2.value) && (
          <p className="text-muted-foreground text-xs">{t("band2SD", { low: b2.value[0], high: b2.value[1] })}</p>
        )}
      </div>
    );
  }

  const SD_OPTIONS: { value: SDBand; label: string }[] = [
    { value: "none", label: "Off" },
    { value: "1sd",  label: "±1σ" },
    { value: "2sd",  label: "±2σ" },
    { value: "both", label: "Both" },
  ];

  const refData = buildReferenceData(entries, kitten);
  const hasReference = refData !== null;
  const chartData: ChartPoint[] = hasReference ? refData : buildDateData(entries);

  const show1SD = hasReference && (sdBand === "1sd" || sdBand === "both");
  const show2SD = hasReference && (sdBand === "2sd" || sdBand === "both");
  const showMean = hasReference && sdBand !== "none";

  if (entries.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        {t("needMoreEntries")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasReference && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground mr-1">{t("ref")}</span>
            {SD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSdBand(opt.value)}
                className={cn(
                  "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                  sdBand === opt.value
                    ? "bg-violet-100 text-violet-700"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="inline-block h-0.5 w-4 bg-violet-600 rounded" />
              {t("actual")}
            </span>
            {showMean && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-0.5 w-4 bg-violet-400 rounded" style={{ borderTopStyle: "dashed" }} />
                {t("avg")}
              </span>
            )}
            {show1SD && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-4 rounded" style={{ background: "rgba(139,92,246,0.3)" }} />
                ±1σ
              </span>
            )}
            {show2SD && (
              <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-4 rounded" style={{ background: "rgba(139,92,246,0.12)" }} />
                ±2σ
              </span>
            )}
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10 }}
            domain={["auto", "auto"]}
            tickFormatter={(v) => `${v}g`}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />

          {show2SD && (
            <Area
              dataKey="band2SD"
              fill="rgba(139,92,246,0.12)"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              name="band2SD"
            />
          )}

          {show1SD && (
            <Area
              dataKey="band1SD"
              fill="rgba(139,92,246,0.28)"
              stroke="none"
              isAnimationActive={false}
              legendType="none"
              name="band1SD"
            />
          )}

          {showMean && (
            <Line
              dataKey="refMean"
              stroke="rgba(139,92,246,0.55)"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              isAnimationActive={false}
              legendType="none"
              name="refMean"
            />
          )}

          <Line
            type="monotone"
            dataKey="actual"
            stroke="#7c3aed"
            strokeWidth={2.5}
            dot={(props) => {
              if (props.value === undefined) return <g key={props.key} />;
              return (
                <circle
                  key={props.key}
                  cx={props.cx}
                  cy={props.cy}
                  r={4}
                  fill="#7c3aed"
                  stroke="white"
                  strokeWidth={1.5}
                />
              );
            }}
            activeDot={{ r: 6, stroke: "white", strokeWidth: 2 }}
            connectNulls
            name="actual"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {!hasReference && kitten !== undefined && (
        <p className="text-center text-xs text-muted-foreground">
          {t("setAge")}
        </p>
      )}
    </div>
  );
}
