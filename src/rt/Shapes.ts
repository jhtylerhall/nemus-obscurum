import * as THREE from 'three';
import { intersectSphere, type Hit } from './Intersections.ts';
import { Ray } from './Ray.ts';
import type { Material } from './Materials.ts';

export interface Shape {
  material: Material;
  intersect(ray: Ray): Hit | null;
}

export class SphereShape implements Shape {
  public center: THREE.Vector3;
  public radius: number;
  public material: Material;

  public constructor(center: THREE.Vector3, radius: number, material: Material) {
    this.center = center;
    this.radius = radius;
    this.material = material;
  }

  public intersect(ray: Ray): Hit | null {
    return intersectSphere(ray, this.center, this.radius);
  }
}
