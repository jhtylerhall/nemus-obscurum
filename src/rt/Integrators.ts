import * as THREE from 'three';
import { LinearAccel } from './Accel.ts';
import { Ray } from './Ray.ts';
import { shadeBlinnPhong } from './Materials.ts';

export class SimpleIntegrator {
  private readonly accel: LinearAccel;
  private readonly lightDir: THREE.Vector3;

  public constructor(accel: LinearAccel, lightDir: THREE.Vector3) {
    this.accel = accel;
    this.lightDir = lightDir;
  }

  public trace(ray: Ray): THREE.Color {
    const hit = this.accel.trace(ray);
    if (!hit) {
      return new THREE.Color('#010203');
    }
    const viewDir = ray.direction.clone().multiplyScalar(-1);
    return shadeBlinnPhong(hit.hit, hit.shape.material, this.lightDir, viewDir);
  }
}
