import * as THREE from 'three';
import atmosphereVert from './shaders/atmosphere.vert.glsl?raw';
import atmosphereFrag from './shaders/atmosphere.frag.glsl?raw';

export class Atmosphere {
  public readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

  public constructor(radius: number) {
    const geometry = new THREE.SphereGeometry(radius * 1.05, 64, 64);
    const material = new THREE.ShaderMaterial({
      vertexShader: atmosphereVert,
      fragmentShader: atmosphereFrag,
      side: THREE.BackSide,
      transparent: true,
      uniforms: {
        uRadius: { value: radius * 1.05 },
        uColor: { value: new THREE.Color('#3fa9ff') },
      },
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }
}
