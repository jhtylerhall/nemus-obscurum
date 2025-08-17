import * as THREE from "three";
import { getWorld } from "../sim/world";

export function createStarsMesh(devicePixelRatio: number) {
  const world = getWorld();
  const N = world.stars.length;

  const positions = new Float32Array(N * 3);
  const colors = new Float32Array(N * 3);
  const sizes = new Float32Array(N);

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

    // DPI-aware base size; PointsMaterial uses size in pixels (screen space)
    sizes[i] = (1.0 + (s.lum - 0.7) * 3.0) * devicePixelRatio;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1)); // custom attr; we’ll use sizeAttenuation instead

  // Use PointsMaterial (simple, fast, no custom shader).
  // Ensure stars are actually visible on mobile GL: sizeAttenuation=true, transparent=false (solid), depthWrite=false avoids z-fighting
  const material = new THREE.PointsMaterial({
    vertexColors: true,
    size: 2.0 * devicePixelRatio, // base point size
    sizeAttenuation: true, // appears smaller when far, larger when near
    depthWrite: false, // additive effect
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
