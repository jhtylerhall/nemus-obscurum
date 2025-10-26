import * as THREE from 'three';

export class Ray {
  origin: THREE.Vector3;
  direction: THREE.Vector3;

  constructor(origin = new THREE.Vector3(), direction = new THREE.Vector3(0, 0, -1)) {
    this.origin = origin.clone();
    this.direction = direction.clone().normalize();
  }

  at(t: number): THREE.Vector3 {
    return this.origin.clone().addScaledVector(this.direction, t);
  }
}
