import * as THREE from "three";

export function makeStarLight(): THREE.DirectionalLight {
  const sun = new THREE.DirectionalLight(0xffffff, 2.0);
  sun.position.set(1, 0, 0);
  return sun;
}

export function makeAmbientLight(): THREE.HemisphereLight {
  return new THREE.HemisphereLight(0x223344, 0x02030a, 0.4);
}
