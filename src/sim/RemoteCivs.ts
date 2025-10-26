import { CivState } from './CivState';

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRemoteCivs(count: number, seed: number): CivState[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    population: rng() * 5 + 1,
    techLevel: rng() * 3,
    secrecy: rng(),
    energyUse: rng(),
    morale: 0.5 + rng() * 0.5,
    revealed: rng() > 0.7,
  }));
}
