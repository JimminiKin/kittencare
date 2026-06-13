"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { WeightChart } from "@/components/charts/weight-chart";
import type { WeightEntry, Kitten } from "@/domain/types";

interface ShareData {
  kitten: {
    name: string;
    estimatedAgeDays: number | null;
    birthDate: string | null;
    intakeDate: string | null;
    sex: string | null;
    notes: string | null;
  };
  fields: string[];
  generatedAt: string;
  expiresAt: string | null;
  weights?: { id: string; timestamp: string; weight_grams: number }[];
  feedings?: { id: string; timestamp: string; food_type: string | null; method: string | null; amount_consumed_ml: number | null; amount_consumed_grams: number | null }[];
  medications?: { id: string; name: string; dosage: string; frequency_hours: number; end_date: string | null; notes: string | null; lastGiven: string | null }[];
  health?: { id: string; timestamp: string; energy: string; hydration: string; appetite: string; temperature: number | null; notes: string | null }[];
}

function toWeightEntries(raw: ShareData["weights"]): WeightEntry[] {
  return (raw ?? []).map((r) => ({
    id: r.id,
    kittenId: "",
    timestamp: new Date(r.timestamp),
    weightGrams: Number(r.weight_grams),
  }));
}

function toKittenShape(k: ShareData["kitten"]): Kitten {
  return {
    id: "",
    name: k.name,
    status: "active",
    estimatedAgeDays: k.estimatedAgeDays ?? undefined,
    birthDate: k.birthDate ? new Date(k.birthDate) : undefined,
    intakeDate: k.intakeDate ? new Date(k.intakeDate) : undefined,
    sex: (k.sex as any) ?? undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function ageLabel(k: ShareData["kitten"]): string {
  if (k.estimatedAgeDays) {
    const weeks = Math.floor(k.estimatedAgeDays / 7);
    const days = k.estimatedAgeDays % 7;
    if (weeks === 0) return `${days}d old`;
    if (days === 0) return `${weeks}w old`;
    return `${weeks}w ${days}d old`;
  }
  if (k.birthDate) {
    const ageDays = Math.floor((Date.now() - new Date(k.birthDate).getTime()) / 86400000);
    const weeks = Math.floor(ageDays / 7);
    const days = ageDays % 7;
    return weeks === 0 ? `${days}d old` : `${weeks}w ${days}d old`;
  }
  return "Unknown age";
}

export function ShareView({ token }: { token: string }) {
  const [data, setData] = useState<ShareData | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setErrorKey(d.error); else setData(d); })
      .catch(() => setErrorKey("notFound"));
  }, [token]);

  if (errorKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-8 bg-gray-50">
        <div className="text-5xl">😿</div>
        <p className="text-lg font-semibold text-gray-700">
          {errorKey === "expired"
            ? "This share link has expired."
            : "This share link is invalid or has been revoked."}
        </p>
        <p className="text-sm text-gray-500">The person who shared this can generate a new link.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading…</p>
      </div>
    );
  }

  const weights = toWeightEntries(data.weights);
  const fakeKitten = toKittenShape(data.kitten);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Easy Kitty Care" className="h-9 w-9" />
            <div>
              <h1 className="text-xl font-bold">{data.kitten.name}</h1>
              <p className="text-sm text-gray-500">
                {ageLabel(data.kitten)}
                {data.kitten.sex && data.kitten.sex !== "unknown" && ` · ${data.kitten.sex}`}
              </p>
            </div>
          </div>
          {data.kitten.notes && (
            <p className="mt-2 text-sm text-gray-600 italic">{data.kitten.notes}</p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Generated {format(new Date(data.generatedAt), "PPP")}
            {data.expiresAt && ` · Expires ${format(new Date(data.expiresAt), "PPP")}`}
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Weight */}
        {data.fields.includes("weight") && weights.length > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-3">⚖️ Weight History</h2>
            <WeightChart entries={weights} kitten={fakeKitten} height={220} />
            <div className="mt-3 divide-y">
              {weights.slice(0, 8).map((w) => (
                <div key={w.id} className="flex justify-between py-1.5 text-sm">
                  <span className="text-gray-500">{format(w.timestamp, "MMM d, yyyy h:mm a")}</span>
                  <span className="font-medium">{(w.weightGrams / 1000).toFixed(3)} kg ({w.weightGrams} g)</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Feedings */}
        {data.fields.includes("feedings") && (data.feedings?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-3">🍼 Recent Feedings</h2>
            <div className="divide-y">
              {data.feedings!.slice(0, 10).map((f) => {
                const isFormula = !f.food_type || f.food_type === "formula";
                const amount = isFormula
                  ? f.amount_consumed_ml != null ? `${f.amount_consumed_ml} ml` : "—"
                  : f.amount_consumed_grams != null ? `${f.amount_consumed_grams} g` : "—";
                const type = f.food_type ?? "formula";
                return (
                  <div key={f.id} className="flex justify-between py-1.5 text-sm">
                    <span className="text-gray-500">{format(new Date(f.timestamp), "MMM d, h:mm a")}</span>
                    <span>
                      <span className="capitalize text-gray-700">{type}</span>
                      {f.method && <span className="text-gray-400 ml-1">({f.method})</span>}
                      <span className="font-medium ml-2">{amount}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Medications */}
        {data.fields.includes("medications") && (data.medications?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-3">💊 Medications</h2>
            <div className="space-y-3">
              {data.medications!.map((m) => {
                const isActive = !m.end_date || new Date(m.end_date) > new Date();
                return (
                  <div key={m.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{m.name}</span>
                      {!isActive && (
                        <span className="text-xs text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">Ended</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {m.dosage} · every {m.frequency_hours}h
                    </p>
                    {m.notes && <p className="text-xs text-gray-400 mt-0.5">{m.notes}</p>}
                    {m.lastGiven && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last given: {format(new Date(m.lastGiven), "MMM d, yyyy h:mm a")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Health */}
        {data.fields.includes("health") && (data.health?.length ?? 0) > 0 && (
          <section className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="font-semibold text-gray-800 mb-3">🩺 Health Observations</h2>
            <div className="divide-y">
              {data.health!.map((h) => (
                <div key={h.id} className="py-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{format(new Date(h.timestamp), "MMM d, yyyy h:mm a")}</span>
                    {h.temperature && <span className="text-gray-600">Temp {h.temperature}°F</span>}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs">
                    <span className="capitalize text-gray-700">Energy: <strong>{h.energy}</strong></span>
                    <span className="capitalize text-gray-700">Hydration: <strong>{h.hydration.replace("-", " ")}</strong></span>
                    <span className="capitalize text-gray-700">Appetite: <strong>{h.appetite}</strong></span>
                  </div>
                  {h.notes && <p className="text-gray-500 italic mt-1">{h.notes}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-8 text-xs text-gray-400">
        Powered by{" "}
        <a href="https://easykitty.care" className="underline hover:text-gray-600">
          Easy Kitty Care
        </a>
      </div>
    </div>
  );
}
