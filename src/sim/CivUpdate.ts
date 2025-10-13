import { CivState } from './CivState';

const MAX_POPULATION = 12;

export function stepCiv(civ: CivState, dt: number): void {
  const growthRate = 0.02 * civ.morale;
  civ.population += civ.population * growthRate * dt;
  civ.population = Math.min(civ.population, MAX_POPULATION);

  const techProgress = 0.001 * civ.energyUse * dt;
  civ.techLevel += techProgress;

  civ.energyUse = Math.min(1, civ.population / 10);
  civ.morale = Math.max(0.1, civ.morale + 0.0005 * (0.5 - civ.secrecy) * dt);

  if (civ.population > 5 && !civ.revealed) {
    civ.revealed = civ.energyUse > 0.6;
  }
}
