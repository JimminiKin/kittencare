// Reference growth curve for domestic shorthair kittens.
// Mean and SD values derived from published neonatal kitten growth data.
// ±1 SD covers ~68% of healthy kittens; ±2 SD covers ~95%.

export interface GrowthReferencePoint {
  ageDays: number;
  mean: number; // grams
  sd: number; // grams
}

export const KITTEN_GROWTH_REFERENCE: GrowthReferencePoint[] = [
  { ageDays: 0, mean: 100, sd: 12 },
  { ageDays: 7, mean: 170, sd: 20 },
  { ageDays: 14, mean: 245, sd: 28 },
  { ageDays: 21, mean: 320, sd: 35 },
  { ageDays: 28, mean: 400, sd: 42 },
  { ageDays: 35, mean: 478, sd: 49 },
  { ageDays: 42, mean: 558, sd: 56 },
  { ageDays: 49, mean: 642, sd: 63 },
  { ageDays: 56, mean: 728, sd: 70 },
  { ageDays: 63, mean: 820, sd: 78 },
  { ageDays: 70, mean: 920, sd: 87 },
  { ageDays: 77, mean: 1025, sd: 96 },
  { ageDays: 84, mean: 1135, sd: 105 },
];

export function interpolateReference(ageDays: number): {
  mean: number;
  sd: number;
} {
  const pts = KITTEN_GROWTH_REFERENCE;
  if (ageDays <= pts[0].ageDays) return { mean: pts[0].mean, sd: pts[0].sd };
  const last = pts[pts.length - 1];
  if (ageDays >= last.ageDays) return { mean: last.mean, sd: last.sd };

  for (let i = 0; i < pts.length - 1; i++) {
    if (ageDays >= pts[i].ageDays && ageDays <= pts[i + 1].ageDays) {
      const t =
        (ageDays - pts[i].ageDays) / (pts[i + 1].ageDays - pts[i].ageDays);
      return {
        mean: Math.round(pts[i].mean + t * (pts[i + 1].mean - pts[i].mean)),
        sd: Math.round(pts[i].sd + t * (pts[i + 1].sd - pts[i].sd)),
      };
    }
  }
  return { mean: pts[0].mean, sd: pts[0].sd };
}

// Returns the kitten's age in whole days at a given timestamp.
// Uses birthDate if available, otherwise falls back to estimatedAgeDays anchored at updatedAt
// (the moment the age was last set in the edit form).
export function getAgeDaysAt(
  kitten: { birthDate?: Date; estimatedAgeDays?: number; updatedAt?: Date },
  at: Date,
): number | null {
  if (kitten.birthDate) {
    return Math.round((at.getTime() - kitten.birthDate.getTime()) / 86_400_000);
  }
  if (kitten.estimatedAgeDays !== undefined) {
    const ref = kitten.updatedAt ?? new Date();
    return Math.round(
      kitten.estimatedAgeDays + (at.getTime() - ref.getTime()) / 86_400_000,
    );
  }
  return null;
}
