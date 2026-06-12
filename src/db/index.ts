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

let _repos: Repositories | null = null;

export function getRepositories(): Repositories {
  if (!_repos) {
    _repos = {
      kittens: new DexieKittenRepository(),
      feedings: new DexieFeedingRepository(),
      weights: new DexieWeightRepository(),
      eliminations: new DexieEliminationRepository(),
      medications: new DexieMedicationRepository(),
      administrations: new DexieMedicationAdministrationRepository(),
      health: new DexieHealthObservationRepository(),
    };
  }
  return _repos;
}
