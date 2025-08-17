// src/sim/world.ts
import { generateStars, Star } from "./stars";
import { store } from "../state/store";

export type World = {
  stars: Star[];
  // civs: Civ[]; // your existing structures
};

let WORLD: World | null = null;

export function buildWorld(): World {
  const { maxStars, starRadius, starSeed } = store.getState().params;
  const stars = generateStars(maxStars, starRadius, starSeed);
  WORLD = { stars };
  return WORLD;
}

export function getWorld(): World {
  if (!WORLD) return buildWorld();
  return WORLD!;
}
