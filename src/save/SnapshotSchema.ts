import { CivState } from '../sim/CivState';

export type Snapshot = {
  civ: CivState;
  timestamp: number;
};

export function validateSnapshot(snapshot: unknown): snapshot is Snapshot {
  if (typeof snapshot !== 'object' || snapshot === null) {
    return false;
  }
  const data = snapshot as Snapshot;
  return typeof data.timestamp === 'number' && typeof data.civ.population === 'number';
}
