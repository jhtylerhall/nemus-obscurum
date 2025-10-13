import type { CivState } from '../sim/CivState';

export type Snapshot = {
  timestamp: number;
  civ: CivState;
};
