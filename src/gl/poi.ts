export function pickStrongest(engine: any): number {
  const n = engine.civCount|0; const alive = engine.civAlive; const tech = engine.cT ?? engine.civTech;
  if (!n || !tech) return -1; let best = -1, bestT = -Infinity;
  for (let i = 0; i < n; i++) if (!alive || alive[i]) { const t = tech[i]; if (t > bestT) { bestT = t; best = i; } }
  return best;
}

export function pickFrontier(engine: any): number {
  const n = engine.civCount|0; const alive = engine.civAlive; const pos = engine.civPos ?? engine.cPos;
  if (!n || !pos) return -1; let best = -1, bestR2 = -1;
  for (let i = 0; i < n; i++) if (!alive || alive[i]) {
    const x=pos[i*3], y=pos[i*3+1], z=pos[i*3+2]; const r2 = x*x+y*y+z*z;
    if (r2>bestR2) { bestR2=r2; best=i; }
  } return best;
}

export function pickNearest(engine: any, cam: {x:number;y:number;z:number}): number {
  const n = engine.civCount|0; const alive = engine.civAlive; const pos = engine.civPos ?? engine.cPos;
  if (!n || !pos) return -1; let best=-1, bestD2=Infinity;
  for (let i=0;i<n;i++) if (!alive || alive[i]) {
    const dx=pos[i*3]-cam.x, dy=pos[i*3+1]-cam.y, dz=pos[i*3+2]-cam.z;
    const d2=dx*dx+dy*dy+dz*dz; if (d2<bestD2) { bestD2=d2; best=i; }
  } return best;
}

// “Densest” = pick a civ from the most populated voxel cell.
export function pickDensest(engine: any, cell=8): number {
  const n = engine.civCount|0; const alive = engine.civAlive; const pos = engine.civPos ?? engine.cPos;
  const R = engine.radius ?? 50; if (!n || !pos) return -1;
  const size = cell; const half = R; const inv = size/(2*half);
  const buckets = new Map<string, number[]>();
  for (let i=0;i<n;i++) if (!alive || alive[i]) {
    const x=pos[i*3], y=pos[i*3+1], z=pos[i*3+2];
    const k = `${Math.floor((x+half)*inv)},${Math.floor((y+half)*inv)},${Math.floor((z+half)*inv)}`;
    const arr = buckets.get(k) ?? []; arr.push(i); buckets.set(k, arr);
  }
  let best: number[] = [];
  buckets.forEach(arr => { if (arr.length > best.length) best = arr; });
  if (best.length) {
    const mid = (best.length/2)|0;
    return best[mid];
  }
  return -1;
}
