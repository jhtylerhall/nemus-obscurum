import * as THREE from 'three';
import { Hit, intersectSphere } from './Intersections.js';
import { Material, shade } from './Materials.js';
import { Ray } from './Ray.js';

export type SceneSphere = {
  center: THREE.Vector3;
  radius: number;
  material: Material;
};

export function trace(ray: Ray, spheres: SceneSphere[], lightDir: THREE.Vector3): THREE.Color {
  let closest: Hit | null = null;
  let mat: Material | null = null;
  for (const sphere of spheres) {
    const hit = intersectSphere(ray, sphere.center, sphere.radius);
    if (hit && (!closest || hit.t < closest.t)) {
      closest = hit;
      mat = sphere.material;
    }
  }
  if (closest && mat) {
    return shade(closest, lightDir.clone().normalize(), mat, ray.direction.clone().negate());
  }
  return new THREE.Color(0x000000);
}
