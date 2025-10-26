import * as THREE from "three";

const MIN_RADIUS = 2.5;
const MAX_RADIUS = 20;
const MIN_PHI = 0.1;
const MAX_PHI = Math.PI - 0.1;

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3(0, 0, 0);
  radius = 6;
  phi = Math.PI / 3;
  theta = Math.PI / 4;

  constructor(width: number, height: number) {
    this.camera = new THREE.PerspectiveCamera(55, width / height, 0.01, 200);
    this.update();
  }

  update(): void {
    const sinPhi = Math.sin(this.phi);
    const cosPhi = Math.cos(this.phi);
    const sinTheta = Math.sin(this.theta);
    const cosTheta = Math.cos(this.theta);
    const x = this.target.x + this.radius * sinPhi * cosTheta;
    const y = this.target.y + this.radius * cosPhi;
    const z = this.target.z + this.radius * sinPhi * sinTheta;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  setSize(width: number, height: number): void {
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  adjustAngles(deltaTheta: number, deltaPhi: number): void {
    this.theta += deltaTheta;
    this.phi = THREE.MathUtils.clamp(this.phi + deltaPhi, MIN_PHI, MAX_PHI);
  }

  zoomByFactor(factor: number): void {
    this.radius = THREE.MathUtils.clamp(this.radius * factor, MIN_RADIUS, MAX_RADIUS);
  }
}
