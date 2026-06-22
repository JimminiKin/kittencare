export const qk = {
  kittens:      ()           => ["kittens"]              as const,
  feedings:     (id: string) => ["feedings",     id]     as const,
  weights:      (id: string) => ["weights",      id]     as const,
  eliminations: (id: string) => ["eliminations", id]     as const,
  medications:  (id: string) => ["medications",  id]     as const,
  admins:       (id: string) => ["admins",       id]     as const,
  health:       (id: string) => ["health",       id]     as const,
  summaries:    ()           => ["summaries"]            as const,
  profiles:     ()           => ["profiles"]             as const,
  shareTokens:     (id: string) => ["shareTokens",     id] as const,
  kittenTransfers: (id: string) => ["kittenTransfers", id] as const,
};
