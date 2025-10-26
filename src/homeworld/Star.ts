import * as THREE from "three";

export class Star {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private readonly baseColor = new THREE.Color("#fffdc1");

  constructor() {
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.baseColor });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.setScalar(1.8);
    this.mesh.position.set(18, 0, 0);
  }

  updatePulse(time: number): void {
    const strength = 0.8 + Math.sin(time * 0.5) * 0.2;
    (this.mesh.material as THREE.MeshBasicMaterial).color
      .copy(this.baseColor)
      .multiplyScalar(strength);
  }
}
