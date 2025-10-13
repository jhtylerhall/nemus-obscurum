export type CivState = {
  population: number;
  techLevel: number;
  secrecy: number;
  energyUse: number;
  morale: number;
  revealed: boolean;
};

export function createInitialCiv(): CivState {
  return {
    population: 1,
    techLevel: 1,
    secrecy: 0.8,
    energyUse: 0.1,
    morale: 1,
    revealed: false,
  };
}
