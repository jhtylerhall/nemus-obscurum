import * as THREE from 'three';

export function makeStarLight(): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(1, 0.2, 0.5).normalize();
  return sun;
}

export function makeAmbientLight(): THREE.AmbientLight {
  return new THREE.AmbientLight(0x223344, 0.6);
}
