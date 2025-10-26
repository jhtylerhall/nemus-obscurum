import { CivState } from './CivState';

export function createInitialCivState(): CivState {
  return {
    population: 1,
    techLevel: 1,
    secrecy: 1,
    energyUse: 0.1,
    morale: 1,
    revealed: false,
  };
}

export function stepCiv(civ: CivState, dt: number): void {
  const growthRate = 0.02 * civ.morale;
  civ.population += civ.population * growthRate * dt;
  civ.energyUse = Math.min(1, civ.population / 10);
  civ.techLevel += 0.01 * dt;
  civ.secrecy = Math.max(0.1, 1 - civ.energyUse * 0.5);
  civ.revealed = civ.energyUse > 0.6;
}
