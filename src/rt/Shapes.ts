import * as THREE from 'three';
import { Material } from './Materials.js';

export function makePlanet(radius: number, color: THREE.ColorRepresentation): { center: THREE.Vector3; radius: number; material: Material } {
  return {
    center: new THREE.Vector3(0, 0, 0),
    radius,
    material: { albedo: new THREE.Color(color), specular: 0.4 },
  };
}

export function makeStar(radius: number, color: THREE.ColorRepresentation): { center: THREE.Vector3; radius: number; material: Material } {
  return {
    center: new THREE.Vector3(1.5e9, 0, 0),
    radius,
    material: { albedo: new THREE.Color('#111111'), emissive: new THREE.Color(color) },
  };
}
