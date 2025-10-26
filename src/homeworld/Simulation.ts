export type CivState = {
  population: number;
  techLevel: number;
  secrecy: number;
  energyUse: number;
  morale: number;
  revealed: boolean;
};

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
  const moraleTarget = civ.secrecy > 0.6 ? 1.1 : 0.7 + civ.energyUse * 0.4;
  civ.morale += (moraleTarget - civ.morale) * 0.6 * dt;
  civ.morale = Math.max(0.3, Math.min(1.5, civ.morale));
  civ.revealed = civ.energyUse > 0.6;
}
