import { z } from "zod";

export const KittenSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required").max(64),
  photo: z.string().optional(),
  birthDate: z.date().optional(),
  estimatedAgeDays: z.number().int().min(0).optional(),
  sex: z.enum(["male", "female", "unknown"]).optional(),
  intakeDate: z.date().optional(),
  status: z.enum(["active", "adopted", "transferred", "deceased"]),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateKittenSchema = KittenSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({ status: true });

export const FeedingSchema = z.object({
  id: z.string(),
  kittenId: z.string(),
  timestamp: z.date(),
  foodType: z.enum(["formula", "wet", "solid"]).optional(),
  method: z.enum(["bottle", "syringe", "tube"]).optional(),
  formulaType: z.string().optional(),
  amountOfferedMl: z.number().min(0).optional(),
  amountConsumedMl: z.number().min(0).optional(),
  amountConsumedGrams: z.number().min(0).optional(),
  notes: z.string().max(500).optional(),
});

export const CreateFeedingSchema = FeedingSchema.omit({ id: true });

export const WeightEntrySchema = z.object({
  id: z.string(),
  kittenId: z.string(),
  timestamp: z.date(),
  weightGrams: z.number().min(1).max(10000),
});

export const CreateWeightEntrySchema = WeightEntrySchema.omit({ id: true });

export const EliminationEntrySchema = z.object({
  id: z.string(),
  kittenId: z.string(),
  timestamp: z.date(),
  pee: z.boolean(),
  poo: z.boolean(),
  pooConsistency: z
    .enum(["liquid", "soft", "normal", "firm", "hard"])
    .optional(),
  pooColor: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const CreateEliminationEntrySchema = EliminationEntrySchema.omit({
  id: true,
});

export const MedicationSchema = z.object({
  id: z.string(),
  kittenId: z.string(),
  name: z.string().min(1).max(128),
  dosage: z.string().min(1).max(128),
  frequencyHours: z.number().min(0.5).max(168),
  startDate: z.date(),
  endDate: z.date().optional(),
  notes: z.string().max(500).optional(),
});

export const CreateMedicationSchema = MedicationSchema.omit({ id: true });

export const MedicationAdministrationSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  kittenId: z.string(),
  timestamp: z.date(),
});

export const CreateMedicationAdministrationSchema =
  MedicationAdministrationSchema.omit({ id: true });

export const HealthObservationSchema = z.object({
  id: z.string(),
  kittenId: z.string(),
  timestamp: z.date(),
  energy: z.enum(["normal", "low", "lethargic"]),
  hydration: z.enum(["normal", "mild-concern", "concerning"]),
  appetite: z.enum(["normal", "reduced", "poor"]),
  temperature: z.number().min(90).max(110).optional(),
  notes: z.string().max(500).optional(),
});

export const CreateHealthObservationSchema = HealthObservationSchema.omit({
  id: true,
});

export type CreateKittenInput = z.infer<typeof CreateKittenSchema>;
export type CreateFeedingInput = z.infer<typeof CreateFeedingSchema>;
export type CreateWeightEntryInput = z.infer<typeof CreateWeightEntrySchema>;
export type CreateEliminationEntryInput = z.infer<
  typeof CreateEliminationEntrySchema
>;
export type CreateMedicationInput = z.infer<typeof CreateMedicationSchema>;
export type CreateMedicationAdministrationInput = z.infer<
  typeof CreateMedicationAdministrationSchema
>;
export type CreateHealthObservationInput = z.infer<
  typeof CreateHealthObservationSchema
>;
