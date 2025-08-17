// src/sim/stars.ts
export type Star = { x: number; y: number; z: number; lum: number };

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sample uniformly inside a sphere for a dense cluster
export function generateStars(
  count: number,
  radius: number,
  seed: number
): Star[] {
  const rnd = mulberry32(seed);
  const stars: Star[] = new Array(count);
  for (let i = 0; i < count; i++) {
    // Marsaglia method for sphere radius with cubic root for uniform radial density
    const u = rnd(),
      v = rnd(),
      w = rnd();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * Math.cbrt(w);

    const sinPhi = Math.sin(phi);
    const x = r * sinPhi * Math.cos(theta);
    const y = r * sinPhi * Math.sin(theta);
    const z = r * Math.cos(phi);

    // 0.7–1.0 brightness with a few big ones
    const lum = 0.7 + rnd() * 0.3;
    stars[i] = { x, y, z, lum };
  }
  return stars;
}
