import * as THREE from 'three';
import { Ray } from './Ray.ts';

export type Hit = {
  t: number;
  point: THREE.Vector3;
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
  const sqrtD = Math.sqrt(discriminant);
  const t0 = (-b - sqrtD) / (2 * a);
  const t1 = (-b + sqrtD) / (2 * a);
  const t = t0 > 1e-4 ? t0 : t1 > 1e-4 ? t1 : -1;
  if (t < 0) {
    return null;
  }
  const point = ray.at(t);
  const normal = point.clone().sub(center).normalize();
  return { t, point, normal };
}
