export type KittenStatus = "active" | "adopted" | "transferred" | "deceased";
export type KittenSex = "male" | "female" | "unknown";
export type FeedingMethod = "bottle" | "syringe" | "tube";
export type FoodType = "formula" | "wet" | "solid";
export type PooConsistency = "liquid" | "soft" | "normal" | "firm" | "hard";
export type EnergyLevel = "normal" | "low" | "lethargic";
export type HydrationLevel = "normal" | "mild-concern" | "concerning";
export type AppetiteLevel = "normal" | "reduced" | "poor";

export interface Kitten {
  id: string;
  name: string;
  photo?: string;
  birthDate?: Date;
  estimatedAgeDays?: number;
  sex?: KittenSex;
  intakeDate?: Date;
  status: KittenStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feeding {
  id: string;
  kittenId: string;
  timestamp: Date;
  foodType?: FoodType;          // undefined → treat as "formula" (backward compat)
  method?: FeedingMethod;       // formula only
  formulaType?: string;
  amountOfferedMl?: number;
  amountConsumedMl?: number;    // formula only
  amountConsumedGrams?: number; // wet / solid
  notes?: string;
}

export interface WeightEntry {
  id: string;
  kittenId: string;
  timestamp: Date;
  weightGrams: number;
}

export interface EliminationEntry {
  id: string;
  kittenId: string;
  timestamp: Date;
  pee: boolean;
  poo: boolean;
  pooConsistency?: PooConsistency;
  pooColor?: string;
  notes?: string;
}

export interface Medication {
  id: string;
  kittenId: string;
  name: string;
  dosage: string;
  frequencyHours: number;
  startDate: Date;
  endDate?: Date;
  notes?: string;
}

export interface MedicationAdministration {
  id: string;
  medicationId: string;
  kittenId: string;
  timestamp: Date;
}

export interface HealthObservation {
  id: string;
  kittenId: string;
  timestamp: Date;
  energy: EnergyLevel;
  hydration: HydrationLevel;
  appetite: AppetiteLevel;
  temperature?: number;
  notes?: string;
}

// ── Alert types ──────────────────────────────────────────────────────────────

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
  | "weight_loss"
  | "no_weight_gain"
  | "missed_feeding"
  | "low_daily_intake"
  | "medication_due"
  | "medication_overdue";

export interface Alert {
  id: string;
  kittenId: string;
  kittenName: string;
  type: AlertType;
  severity: AlertSeverity;
  params: Record<string, string | number>;
  timestamp: Date;
}

// ── Reminder types ───────────────────────────────────────────────────────────

export type ReminderType = "feeding" | "medication" | "weight";

export interface Reminder {
  id: string;
  kittenId: string;
  type: ReminderType;
  title: string;
  body: string;
  scheduledAt: Date;
  metadata?: Record<string, unknown>;
}

// ── Aggregate/view types ─────────────────────────────────────────────────────

export interface KittenSummary {
  kitten: Kitten;
  currentWeightGrams?: number;
  weightChangeGrams?: number;
  feedingsToday: number;
  totalConsumedMlToday: number;
  totalConsumedGramsToday: number;
  eliminationsToday: number;
  activeMedications: number;
  alerts: Alert[];
}

export interface DailyFeedingSummary {
  date: string; // ISO date string "YYYY-MM-DD"
  totalMl: number;
  feedingCount: number;
}

export interface DailyWeightEntry {
  date: string;
  weightGrams: number;
}
