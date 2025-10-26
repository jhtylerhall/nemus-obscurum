import * as THREE from 'three';
import planetVertex from './shaders/planet.vert.glsl?raw';
import planetFragment from './shaders/planet.frag.glsl?raw';

function makeTexture(color: THREE.ColorRepresentation): THREE.DataTexture {
  const width = 2;
  const height = 2;
  const data = new Uint8Array(width * height * 3);
  const colorObj = new THREE.Color(color);
  for (let i = 0; i < data.length; i += 3) {
    data[i] = Math.floor(colorObj.r * 255);
    data[i + 1] = Math.floor(colorObj.g * 255);
    data[i + 2] = Math.floor(colorObj.b * 255);
  }
  const texture = new THREE.DataTexture(data, width, height);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeCityMask(): THREE.DataTexture {
  const size = 4;
  const data = new Uint8Array(size * size);
  for (let z = 0; z < size; z += 1) {
    for (let x = 0; x < size; x += 1) {
      const idx = z * size + x;
      data[idx] = (x + z) % 2 === 0 ? 255 : 32;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.needsUpdate = true;
  return texture;
}

export class Planet {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: Record<string, THREE.Uniform>;

  constructor() {
    const geometry = new THREE.SphereGeometry(1, 128, 128);

    this.uniforms = {
      uCamPos: new THREE.Uniform(new THREE.Vector3()),
      uStarDir: new THREE.Uniform(new THREE.Vector3(1, 0, 0)),
      uDayColor: new THREE.Uniform(new THREE.Color('#6db9ff')),
      uNightEmit: new THREE.Uniform(new THREE.Color('#ffd37f')),
      uSpecPower: new THREE.Uniform(32),
      uSpecStrength: new THREE.Uniform(0.6),
      uAlbedo: new THREE.Uniform(makeTexture('#3355ff')),
      uCityMask: new THREE.Uniform(makeCityMask()),
    } satisfies Record<string, THREE.Uniform>;

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: planetVertex,
      fragmentShader: planetFragment,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.setScalar(6.37e6);
    this.mesh.onBeforeRender = (_renderer, _scene, camera) => {
      (this.uniforms.uCamPos.value as THREE.Vector3).copy((camera as THREE.PerspectiveCamera).position);
    };
  }

  updateSurfaceEnergy(energyUse: number): void {
    const dayColor = new THREE.Color('#3366ff').lerp(new THREE.Color('#88e0ff'), energyUse);
    const nightColor = new THREE.Color('#1b1d3b').lerp(new THREE.Color('#ffd37f'), energyUse);
    (this.uniforms.uDayColor.value as THREE.Color).copy(dayColor);
    (this.uniforms.uNightEmit.value as THREE.Color).copy(nightColor);
  }
}
