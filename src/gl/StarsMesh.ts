import * as THREE from "three";
import { getWorld } from "../sim/world";

export function createStarsMesh(devicePixelRatio: number) {
  const world = getWorld();
  const N = world.stars.length;

  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);

  for (let i = 0; i < N; i++) {
    const s = world.stars[i];
    positions[i * 3 + 0] = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;

    // star color close to white; encode luminance
    const c = s.lum;
    colors[i * 3 + 0] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;

  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  // Use PointsMaterial (simple, fast, no custom shader).
  // Keep star size constant in screen space so distant stars remain visible.
  // depthWrite=false avoids z-fighting when blending
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 2.0 * devicePixelRatio, // base point size in px
    sizeAttenuation: false, // screen-space sizing, no perspective shrink
    depthWrite: false,
  });

  // Optional: make them pop on dark background
  material.blending = THREE.AdditiveBlending;
  material.transparent = true;

  const points = new THREE.Points(geometry, material);

  // Let Three render all points; they’re tiny — culling can hide them incorrectly if bounding sphere isn’t computed
  geometry.computeBoundingSphere();
  points.frustumCulled = false;

  return points;
}
