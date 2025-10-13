import * as THREE from 'three';
import planetVert from './shaders/planet.vert.glsl?raw';
import planetFrag from './shaders/planet.frag.glsl?raw';

function makeSolidTexture(r: number, g: number, b: number): THREE.DataTexture {
  const data = new Uint8Array([r, g, b, 255]);
  const tex = new THREE.DataTexture(data, 1, 1);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Planet {
  public readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private energy = 0.1;

  public constructor(radius = 6.4e6) {
    const geometry = new THREE.SphereGeometry(radius, 128, 128);
    const uniforms = {
      uCamPos: { value: new THREE.Vector3() },
      uStarDir: { value: new THREE.Vector3(1, 0.2, 0.5).normalize() },
      uDayColor: { value: new THREE.Color('#8ec5ff') },
      uNightEmit: { value: new THREE.Color('#ffd27f') },
      uSpecPower: { value: 64 },
      uSpecStrength: { value: 0.5 },
      uAlbedo: { value: makeSolidTexture(120, 180, 255) },
      uCityMask: { value: makeSolidTexture(64, 64, 64) },
    } satisfies Record<string, { value: THREE.Texture | THREE.Vector3 | THREE.Color | number }>;

    const material = new THREE.ShaderMaterial({
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      uniforms,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
  }

  public setEnergyUse(value: number, alpha: number): void {
    this.energy = THREE.MathUtils.lerp(this.energy, value, alpha);
    const dayColor = this.mesh.material.uniforms.uDayColor.value as THREE.Color;
    dayColor.setHSL(0.55, 0.5, 0.35 + this.energy * 0.3);
    const night = this.mesh.material.uniforms.uNightEmit.value as THREE.Color;
    night.setHSL(0.12, 0.75, 0.2 + this.energy * 0.5);
  }

  public syncCamera(camera: THREE.PerspectiveCamera): void {
    (this.mesh.material.uniforms.uCamPos.value as THREE.Vector3).copy(camera.position);
  }
}
