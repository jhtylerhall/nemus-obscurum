import * as THREE from 'three';
import { Ray } from './Ray.js';

export type Hit = {
  t: number;
  position: THREE.Vector3;
  normal: THREE.Vector3;
};

export function intersectSphere(ray: Ray, center: THREE.Vector3, radius: number): Hit | null {
  const oc = ray.origin.clone().sub(center);
  const a = ray.direction.dot(ray.direction);
  const b = 2 * oc.dot(ray.direction);
  const c = oc.dot(oc) - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) {
    return null;
  }
  const t = (-b - Math.sqrt(discriminant)) / (2 * a);
  if (t < 0) {
    return null;
  }
  const position = ray.at(t);
  const normal = position.clone().sub(center).normalize();
  return { t, position, normal };
}
