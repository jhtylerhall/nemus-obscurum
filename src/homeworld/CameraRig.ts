import * as THREE from "three";

const MIN_RADIUS = 2.5;
const MAX_RADIUS = 20;
const MIN_PHI = 0.1;
const MAX_PHI = Math.PI - 0.1;
const DEFAULT_RADIUS = 5.5;
const DEFAULT_PHI = Math.PI / 2.4;
const DEFAULT_THETA = Math.PI / 4;
const FOCUS_DISTANCE_MULTIPLIER = 2.2;

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  readonly target = new THREE.Vector3(0, 0, 0);
  private defaultRadius = DEFAULT_RADIUS;
  radius = DEFAULT_RADIUS;
  phi = DEFAULT_PHI;
  theta = DEFAULT_THETA;

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
    this.theta = THREE.MathUtils.euclideanModulo(
      this.theta + deltaTheta,
      Math.PI * 2
    );
    this.phi = THREE.MathUtils.clamp(this.phi + deltaPhi, MIN_PHI, MAX_PHI);
  }

  zoomByFactor(factor: number): void {
    this.radius = THREE.MathUtils.clamp(this.radius * factor, MIN_RADIUS, MAX_RADIUS);
  }

  recenter(): void {
    this.radius = this.defaultRadius;
    this.phi = DEFAULT_PHI;
    this.theta = DEFAULT_THETA;
    this.update();
  }

  focusOn(target: THREE.Vector3, radius: number): void {
    this.target.copy(target);
    const desiredRadius = THREE.MathUtils.clamp(
      radius * FOCUS_DISTANCE_MULTIPLIER,
      MIN_RADIUS,
      MAX_RADIUS
    );
    this.defaultRadius = desiredRadius;
    this.radius = desiredRadius;
    this.phi = DEFAULT_PHI;
    this.theta = DEFAULT_THETA;
    this.update();
  }
}
