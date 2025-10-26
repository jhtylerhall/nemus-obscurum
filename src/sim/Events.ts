import { CivState } from './CivState';

type CivEvent =
  | { type: 'aid'; amount: number }
  | { type: 'strike'; damage: number };

export function resolveEvent(civ: CivState, event: CivEvent): void {
  if (event.type === 'aid') {
    civ.population += event.amount;
    civ.morale = Math.min(2, civ.morale + 0.1);
  } else {
    civ.population = Math.max(0, civ.population - event.damage);
    civ.morale = Math.max(0.2, civ.morale - 0.2);
    civ.revealed = true;
  }
}
