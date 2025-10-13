import * as THREE from 'three';

/**
 * CameraRig implements a simple orbit camera around a configurable target.
 */
export class CameraRig {
  public readonly camera: THREE.PerspectiveCamera;
  public readonly target = new THREE.Vector3();
  public radius = 4e7;
  public phi = Math.PI / 3;
  public theta = Math.PI / 4;

  public constructor() {
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1e9);
    this.update();
  }

  public update(): void {
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

  public onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
