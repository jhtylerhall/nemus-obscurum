import type { Snapshot } from './SnapshotSchema';

const STORAGE_KEY = 'dark-forest-homeworld-save';

export function saveSnapshot(snapshot: Snapshot): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function loadSnapshot(): Snapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Snapshot;
    return parsed;
  } catch (err) {
    console.warn('Failed to parse snapshot', err);
    return null;
  }
}
