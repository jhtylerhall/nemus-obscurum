import { CivState } from './CivState';

export type EventLogEntry = {
  type: 'aid' | 'strike';
  magnitude: number;
  resolvedAt: number;
};

export function resolveAid(civ: CivState, magnitude: number): EventLogEntry {
  civ.population += magnitude * 0.2;
  civ.morale = Math.min(2, civ.morale + magnitude * 0.05);
  return { type: 'aid', magnitude, resolvedAt: Date.now() };
}

export function resolveStrike(civ: CivState, magnitude: number): EventLogEntry {
  civ.population = Math.max(0.1, civ.population - magnitude * 0.3);
  civ.morale = Math.max(0.1, civ.morale - magnitude * 0.1);
  civ.secrecy = Math.min(1, civ.secrecy + magnitude * 0.1);
  return { type: 'strike', magnitude, resolvedAt: Date.now() };
}
