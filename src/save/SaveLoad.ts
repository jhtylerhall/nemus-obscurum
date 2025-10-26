import { CivState } from '../sim/CivState';
import { Snapshot, validateSnapshot } from './SnapshotSchema';

export function saveSnapshot(civ: CivState): string {
  const snapshot: Snapshot = {
    civ: { ...civ },
    timestamp: Date.now(),
  };
  return JSON.stringify(snapshot, null, 2);
}

export function loadSnapshot(json: string): CivState | null {
  try {
    const parsed = JSON.parse(json);
    if (validateSnapshot(parsed)) {
      return { ...parsed.civ };
    }
  } catch (error) {
    console.warn('Failed to load snapshot', error);
  }
  return null;
}
