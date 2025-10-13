import * as THREE from 'three';
import type { Hit } from './Intersections.ts';
import type { Ray } from './Ray.ts';

export type Material = {
  albedo: THREE.Color;
  specular: THREE.Color;
  shininess: number;
  emissive?: THREE.Color;
};

export function shadeBlinnPhong(
  hit: Hit,
  material: Material,
  lightDir: THREE.Vector3,
  viewDir: THREE.Vector3
): THREE.Color {
  const N = hit.normal.clone();
  const L = lightDir.clone().normalize().multiplyScalar(-1);
  const V = viewDir.clone().normalize();
  const H = L.clone().add(V).normalize();

  const diffuse = Math.max(N.dot(L), 0);
  const spec = Math.pow(Math.max(N.dot(H), 0), material.shininess);

  const color = material.albedo.clone().multiplyScalar(diffuse);
  color.add(material.specular.clone().multiplyScalar(spec));
  if (material.emissive) {
    color.add(material.emissive);
  }
  return color;
}
