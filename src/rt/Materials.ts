import * as THREE from 'three';
import { Hit } from './Intersections.js';
import { Ray } from './Ray.js';

export type Material = {
  albedo: THREE.Color;
  emissive?: THREE.Color;
  specular?: number;
};

export function shade(hit: Hit, lightDir: THREE.Vector3, material: Material, viewDir: THREE.Vector3): THREE.Color {
  const normal = hit.normal;
  const diffuse = Math.max(normal.dot(lightDir), 0);
  const color = material.albedo.clone().multiplyScalar(diffuse);
  if (material.emissive) {
    color.add(material.emissive);
  }
  if (material.specular) {
    const halfVec = lightDir.clone().add(viewDir).normalize();
    const spec = Math.pow(Math.max(normal.dot(halfVec), 0), 32) * material.specular;
    color.addScalar(spec);
  }
  return color;
}

export function reflect(ray: Ray, hit: Hit): Ray {
  const direction = ray.direction.clone().sub(hit.normal.clone().multiplyScalar(2 * ray.direction.dot(hit.normal)));
  return new Ray(hit.position, direction);
}
