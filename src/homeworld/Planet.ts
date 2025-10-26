import * as THREE from "three";

const BASE_DAY = new THREE.Color("#1b2f5b");
const ENERGIZED_DAY = new THREE.Color("#4aa9ff");
const NIGHT_BASE = new THREE.Color("#0b1024");
const NIGHT_CITY = new THREE.Color("#ffd37f");

export class Planet {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>;

  constructor() {
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.65,
      metalness: 0,
      emissiveIntensity: 0.4,
    });
    material.color.copy(BASE_DAY);
    material.emissive.copy(NIGHT_BASE);

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.setScalar(2.6);
  }

  updateSurfaceEnergy(energyUse: number): void {
    const material = this.mesh.material;
    material.color.lerpColors(BASE_DAY, ENERGIZED_DAY, energyUse);
    material.emissive.lerpColors(NIGHT_BASE, NIGHT_CITY, THREE.MathUtils.clamp(energyUse * 0.6, 0, 1));
    material.emissiveIntensity = 0.35 + energyUse * 0.5;
  }
}
