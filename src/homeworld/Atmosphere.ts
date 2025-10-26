import * as THREE from "three";
import { atmosphereVertexShader, atmosphereFragmentShader } from "./shaders";

export class Atmosphere {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: Record<string, THREE.Uniform>;

  constructor(planet: THREE.Mesh) {
    this.uniforms = {
      uColor: new THREE.Uniform(new THREE.Color("#7fb9ff")),
      uIntensity: new THREE.Uniform(0.4),
    } satisfies Record<string, THREE.Uniform>;

    const geometry = new THREE.SphereGeometry(1.05, 64, 64);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.copy(planet.scale).multiplyScalar(1.05);
  }

  updateGlow(secrecy: number): void {
    const base = 0.2 + (1 - secrecy) * 0.6;
    this.uniforms.uIntensity.value = base;
  }
}
