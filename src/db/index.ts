import type { Repositories } from "@/repositories/interfaces";
import { DexieKittenRepository } from "./repositories/kitten.repository";
import { DexieFeedingRepository } from "./repositories/feeding.repository";
import { DexieWeightRepository } from "./repositories/weight.repository";
import { DexieEliminationRepository } from "./repositories/elimination.repository";
import {
  DexieMedicationRepository,
  DexieMedicationAdministrationRepository,
} from "./repositories/medication.repository";
import { DexieHealthObservationRepository } from "./repositories/health.repository";
import { SupabaseKittenRepository } from "./repositories/supabase/kitten.repository";
import { SupabaseFeedingRepository } from "./repositories/supabase/feeding.repository";
import { SupabaseWeightRepository } from "./repositories/supabase/weight.repository";
import { SupabaseEliminationRepository } from "./repositories/supabase/elimination.repository";
import {
  SupabaseMedicationRepository,
  SupabaseMedicationAdministrationRepository,
} from "./repositories/supabase/medication.repository";
import { SupabaseHealthObservationRepository } from "./repositories/supabase/health.repository";

let _dexieRepos: Repositories | null = null;
let _supabaseRepos: Repositories | null = null;
let _useCloud = false;

export function setUseCloudRepositories(use: boolean): void {
  _useCloud = use;
  if (!use) _supabaseRepos = null;
}

export function getRepositories(): Repositories {
  if (_useCloud) {
    if (!_supabaseRepos) {
      _supabaseRepos = {
        kittens: new SupabaseKittenRepository(),
        feedings: new SupabaseFeedingRepository(),
        weights: new SupabaseWeightRepository(),
        eliminations: new SupabaseEliminationRepository(),
        medications: new SupabaseMedicationRepository(),
        administrations: new SupabaseMedicationAdministrationRepository(),
        health: new SupabaseHealthObservationRepository(),
      };
    }
    return _supabaseRepos;
  }
  if (!_dexieRepos) {
    _dexieRepos = {
      kittens: new DexieKittenRepository(),
      feedings: new DexieFeedingRepository(),
      weights: new DexieWeightRepository(),
      eliminations: new DexieEliminationRepository(),
      medications: new DexieMedicationRepository(),
      administrations: new DexieMedicationAdministrationRepository(),
      health: new DexieHealthObservationRepository(),
    };
  }
  return _dexieRepos;
}
