import * as THREE from 'three';
import { LinearAccel } from './Accel.ts';
import { SimpleIntegrator } from './Integrators.ts';
import { Ray } from './Ray.ts';
import { SphereShape } from './Shapes.ts';

export class RayTracer {
  private readonly scene: SphereShape[] = [];
  private readonly accel: LinearAccel;
  private readonly integrator: SimpleIntegrator;

  public constructor() {
    const starMaterial = {
      albedo: new THREE.Color('#fff8d0'),
      specular: new THREE.Color('#fff8d0'),
      shininess: 4,
      emissive: new THREE.Color('#fff2a0'),
    };
    const planetMaterial = {
      albedo: new THREE.Color('#3a6ff2'),
      specular: new THREE.Color('#97b8ff'),
      shininess: 32,
    };

    this.scene.push(new SphereShape(new THREE.Vector3(0, 0, -10), 3, planetMaterial));
    this.scene.push(new SphereShape(new THREE.Vector3(-8, 4, -20), 6, starMaterial));

    this.accel = new LinearAccel(this.scene);
    this.integrator = new SimpleIntegrator(this.accel, new THREE.Vector3(1, -0.2, 0.5));
  }

  public render(width: number, height: number): Uint8ClampedArray {
    const buffer = new Uint8ClampedArray(width * height * 4);
    const fov = (55 * Math.PI) / 180;
    const aspect = width / height;
    const cameraPos = new THREE.Vector3(0, 2, 10);
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, forward).normalize();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const ndcX = (2 * (x + 0.5)) / width - 1;
        const ndcY = 1 - (2 * (y + 0.5)) / height;
        const px = Math.tan(fov / 2) * ndcX * aspect;
        const py = Math.tan(fov / 2) * ndcY;
        const direction = forward.clone().addScaledVector(right, px).addScaledVector(up, py).normalize();
        const ray = new Ray(cameraPos, direction);
        const color = this.integrator.trace(ray);
        const idx = (y * width + x) * 4;
        buffer[idx + 0] = Math.min(255, Math.max(0, Math.floor(color.r * 255)));
        buffer[idx + 1] = Math.min(255, Math.max(0, Math.floor(color.g * 255)));
        buffer[idx + 2] = Math.min(255, Math.max(0, Math.floor(color.b * 255)));
        buffer[idx + 3] = 255;
      }
    }
    return buffer;
  }
}
