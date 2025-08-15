import type { EngineView } from './types';

type MaybeArr = Float32Array | Uint8Array | Int32Array | number[] | undefined;
const num = (a: MaybeArr, i: number, def = 0) => (a ? Number((a as any)[i] ?? def) : def);
const pick = <T extends MaybeArr>(...c: T[]): T | undefined => { for (const x of c) if (x != null) return x; return undefined; };
const pickNum = (...c: any[]) => { for (const x of c) if (typeof x === 'number') return x as number; return 0; };

function getStarAccessor(raw: any) {
  const sx = pick(raw.sx, raw.starX, raw.starsX);
  const sy = pick(raw.sy, raw.starY, raw.starsY);
  const sz = pick(raw.sz, raw.starZ, raw.starsZ);
  const sPos = pick(raw.sPos, raw.starPos, raw.starsPos, raw.starPositions);
  let starCount = pickNum(raw.starCount, raw.starsCount);
  if (!starCount) {
    if (sPos && (sPos as any).length % 3 === 0) starCount = (sPos as any).length / 3;
    else starCount = Math.min(sx?.length ?? 0, sy?.length ?? 0, sz?.length ?? 0);
  }
  if (sPos && (sPos as any).length >= starCount * 3) {
    return {
      starCount,
      get: (i: number) => [num(sPos, i * 3), num(sPos, i * 3 + 1), num(sPos, i * 3 + 2)] as [number, number, number],
    };
  }
  return {
    starCount,
    get: (i: number) => [num(sx, i), num(sy, i), num(sz, i)] as [number, number, number],
  };
}

function getCivAccessor(raw: any) {
  const cx = pick(raw.cx, raw.civX, raw.x);
  const cy = pick(raw.cy, raw.civY, raw.y);
  const cz = pick(raw.cz, raw.civZ, raw.z);
  const cPos = pick(raw.cPos, raw.civPos, raw.cPositions);
  const cAlive = pick(raw.cAlive, raw.civAlive, raw.alive);
  const cStrat = pick(raw.cStrat, raw.civStrat, raw.strat);
  const cTech = pick(raw.cT, raw.civTech, raw.tech);
  const cRev = pick(raw.cRevealed, raw.civRevealed, raw.revealed);
  let civCount = pickNum(raw.civCount);
  if (!civCount) {
    if (cPos && (cPos as any).length % 3 === 0) civCount = (cPos as any).length / 3;
    else civCount = Math.min(cx?.length ?? 0, cy?.length ?? 0, cz?.length ?? 0);
  }
  const pos =
    cPos
      ? (i: number) => [num(cPos, i * 3), num(cPos, i * 3 + 1), num(cPos, i * 3 + 2)] as [number, number, number]
      : (i: number) => [num(cx, i), num(cy, i), num(cz, i)] as [number, number, number];

  return {
    civCount,
    isAlive: (i: number) => Boolean(num(cAlive, i)),
    pos,
    strat: (i: number) => Math.floor(num(cStrat, i)),
    tech: (i: number) => num(cTech, i),
    revealed: (i: number) => Boolean(num(cRev, i)),
  };
}

export function adaptEngine(raw: any): EngineView {
  const stars = getStarAccessor(raw);
  const civ = getCivAccessor(raw);
  let acc = 0;
  const step = (dt: number) => {
    if (typeof raw.stepN === 'function') {
      acc += dt;
      const steps = Math.floor(acc * 60);
      if (steps > 0) { raw.stepN(steps); acc -= steps / 60; }
    } else if (typeof raw.step === 'function') {
      raw.step.length >= 1 ? raw.step(dt) : raw.step();
    } else if (typeof raw.advance === 'function') {
      raw.advance(dt);
    }
  };
  return {
    starCount: stars.starCount,
    civCount: civ.civCount,
    step,
    getStar: (i) => stars.get(i),
    isCivAlive: (i) => civ.isAlive(i),
    getCivPos: (i) => civ.pos(i),
    getCivStrat: (i) => civ.strat(i),
    getCivTech: (i) => civ.tech(i),
    isCivRevealed: (i) => civ.revealed(i),
  };
}

// Deterministic downsample of alive civs (for minimap) without allocs every frame
export function sampleCivs(raw: any, max = 800): [number, number][] {
  const out: [number, number][] = [];
  const pos = (raw.civPos ?? raw.cPos) as Float32Array | undefined;
  const alive = (raw.civAlive ?? raw.cAlive) as Uint8Array | undefined;
  const n = raw.civCount ?? (pos ? pos.length / 3 : 0);
  if (!n || !pos) return out;
  // stride picks roughly n/max items; keep deterministic
  const stride = Math.max(1, Math.floor(n / Math.max(1, max)));
  for (let i = 0, picked = 0; i < n && picked < max; i += stride) {
    if (alive && !alive[i]) continue;
    out.push([pos[i * 3], pos[i * 3 + 2]]); // XZ plane for top-down
    picked++;
  }
  return out;
}
