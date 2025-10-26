import * as THREE from 'three';
import { trace, SceneSphere } from './Integrators.js';
import { Ray } from './Ray.js';

export class RayTracer {
  private readonly width: number;
  private readonly height: number;
  private readonly spheres: SceneSphere[];
  private readonly lightDir = new THREE.Vector3(-1, -0.2, -0.4).normalize();

  constructor(width: number, height: number, spheres: SceneSphere[]) {
    this.width = width;
    this.height = height;
    this.spheres = spheres;
  }

  render(): Uint8ClampedArray {
    const buffer = new Uint8ClampedArray(this.width * this.height * 4);
    const fov = Math.tan((45 * Math.PI) / 180 / 2);
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const ndcX = (2 * (x + 0.5) / this.width - 1) * fov * (this.width / this.height);
        const ndcY = (1 - 2 * (y + 0.5) / this.height) * fov;
        const ray = new Ray(new THREE.Vector3(0, 0, 5e9), new THREE.Vector3(ndcX, ndcY, -1));
        const color = trace(ray, this.spheres, this.lightDir);
        const idx = (y * this.width + x) * 4;
        buffer[idx] = Math.min(255, Math.floor(color.r * 255));
        buffer[idx + 1] = Math.min(255, Math.floor(color.g * 255));
        buffer[idx + 2] = Math.min(255, Math.floor(color.b * 255));
        buffer[idx + 3] = 255;
      }
    }
    return buffer;
  }
}
