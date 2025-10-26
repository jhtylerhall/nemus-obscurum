import * as THREE from 'three';

export type OrbitState = {
  radius: number;
  speed: number;
  angle: number;
};

export function stepOrbit(orbit: OrbitState, dt: number): void {
  orbit.angle += orbit.speed * dt;
}

export function getOrbitPosition(orbit: OrbitState): THREE.Vector3 {
  return new THREE.Vector3(
    Math.cos(orbit.angle) * orbit.radius,
    0,
    Math.sin(orbit.angle) * orbit.radius,
  );
}
