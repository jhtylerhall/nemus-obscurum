import * as THREE from "three";

import { planetVertexShader, planetFragmentShader } from "./shaders";

const BASE_DAY = new THREE.Color("#2b4a98");
const ENERGIZED_DAY = new THREE.Color("#89c9ff");
const NIGHT_BASE = new THREE.Color("#060912");
const NIGHT_CITY = new THREE.Color("#ffd18a");

type PlanetUniforms = {
  uCamPos: THREE.Uniform<THREE.Vector3>;
  uStarDir: THREE.Uniform<THREE.Vector3>;
  uDayColor: THREE.Uniform<THREE.Color>;
  uNightEmit: THREE.Uniform<THREE.Color>;
  uSpecPower: THREE.Uniform<number>;
  uSpecStrength: THREE.Uniform<number>;
  uAlbedo: THREE.Uniform<THREE.Texture>;
  uCityMask: THREE.Uniform<THREE.Texture>;
};

const PLANET_TEXTURES = generatePlanetTextures();

export class Planet {
  readonly mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private readonly uniforms: PlanetUniforms;

  constructor() {
    this.uniforms = {
      uCamPos: new THREE.Uniform(new THREE.Vector3(0, 0, 10)),
      uStarDir: new THREE.Uniform(new THREE.Vector3(1, 0, 0)),
      uDayColor: new THREE.Uniform(BASE_DAY.clone()),
      uNightEmit: new THREE.Uniform(NIGHT_BASE.clone()),
      uSpecPower: new THREE.Uniform(52),
      uSpecStrength: new THREE.Uniform(0.22),
      uAlbedo: new THREE.Uniform(PLANET_TEXTURES.albedo),
      uCityMask: new THREE.Uniform(PLANET_TEXTURES.cityMask),
    } satisfies PlanetUniforms;

    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      transparent: false,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.setScalar(2.6);
    this.mesh.rotation.y = Math.PI * 0.18;
  }

  setStarDirection(direction: THREE.Vector3): void {
    this.uniforms.uStarDir.value.copy(direction);
  }

  updateSurfaceEnergy(energyUse: number): void {
    this.uniforms.uDayColor.value.lerpColors(BASE_DAY, ENERGIZED_DAY, energyUse);
    const glow = THREE.MathUtils.clamp(energyUse * 0.85, 0, 1);
    this.uniforms.uNightEmit.value.lerpColors(NIGHT_BASE, NIGHT_CITY, glow);
    this.uniforms.uSpecPower.value = 48 + energyUse * 36;
    this.uniforms.uSpecStrength.value = 0.18 + energyUse * 0.35;
  }

  updateFrame(
    camera: THREE.PerspectiveCamera,
    starDirection: THREE.Vector3,
    deltaSeconds: number
  ): void {
    this.mesh.rotation.y += deltaSeconds * 0.12;
    this.uniforms.uCamPos.value.copy(camera.position);
    this.uniforms.uStarDir.value.copy(starDirection);
  }
}

function generatePlanetTextures(): {
  albedo: THREE.DataTexture;
  cityMask: THREE.DataTexture;
} {
  const width = 512;
  const height = 256;
  const albedoData = new Uint8Array(width * height * 3);
  const cityData = new Uint8Array(width * height * 3);

  for (let y = 0; y < height; y += 1) {
    const v = y / (height - 1);
    const lat = (v - 0.5) * Math.PI;
    const latBand = 1 - Math.min(1, Math.abs(lat) / (Math.PI * 0.5));
    for (let x = 0; x < width; x += 1) {
      const u = x / width;
      const lon = (u - 0.5) * Math.PI * 2;
      const baseNoise = fract(Math.sin(lon * 1.9 + lat * 1.3) * 43758.5453);
      const detailNoise = fract(
        Math.sin(lon * 4.7 + lat * 3.1 + baseNoise * 2.3) * 24634.6345
      );
      const ridgeNoise = fract(
        Math.sin(lon * 9.1 - lat * 7.7 + detailNoise * 5.2) * 13589.913
      );
      const elevation =
        baseNoise * 0.5 +
        detailNoise * 0.35 +
        ridgeNoise * 0.15 +
        Math.cos(lat) * 0.18 -
        0.42;
      const isLand = elevation > 0;

      const idx = (y * width + x) * 3;
      let r: number;
      let g: number;
      let b: number;

      if (isLand) {
        const mountains = Math.max(0, elevation * 2.4);
        const moisture = Math.max(0, latBand * 1.05 - elevation * 0.3);
        r = 70 + moisture * 55 + mountains * 60;
        g = 98 + moisture * 85 - mountains * 50;
        b = 58 + moisture * 45 - mountains * 70;
      } else {
        const depth = 0.48 + baseNoise * 0.18 - latBand * 0.12;
        r = 18 + depth * 45;
        g = 46 + depth * 70;
        b = 104 + depth * 120;
      }

      albedoData[idx] = clampToByte(r);
      albedoData[idx + 1] = clampToByte(g);
      albedoData[idx + 2] = clampToByte(b);

      const coastline = Math.max(0, 1 - Math.abs(elevation) * 18);
      const tradeNoise = fract(
        Math.sin(lon * 11.7 + lat * 17.9 + baseNoise * 8.1) * 95718.123
      );
      const hubNoise = fract(
        Math.sin(lon * 23.3 - lat * 21.7 + detailNoise * 9.4) * 6832.471
      );
      let city = 0;
      if (isLand) {
        const density =
          tradeNoise * 0.7 +
          hubNoise * 0.5 +
          coastline * 0.9 +
          latBand * 0.55 -
          0.8;
        city = Math.pow(Math.max(0, density), 1.8);
      }
      const cityByte = clampToByte(city * 255);
      cityData[idx] = cityByte;
      cityData[idx + 1] = cityByte;
      cityData[idx + 2] = cityByte;
    }
  }

  const albedo = new THREE.DataTexture(
    albedoData,
    width,
    height,
    THREE.RGBFormat
  );
  albedo.needsUpdate = true;
  albedo.colorSpace = THREE.SRGBColorSpace;
  albedo.wrapS = THREE.RepeatWrapping;
  albedo.wrapT = THREE.ClampToEdgeWrapping;
  albedo.generateMipmaps = true;
  albedo.magFilter = THREE.LinearFilter;
  albedo.minFilter = THREE.LinearMipmapLinearFilter;

  const cityMask = new THREE.DataTexture(
    cityData,
    width,
    height,
    THREE.RGBFormat
  );
  cityMask.needsUpdate = true;
  cityMask.colorSpace = THREE.SRGBColorSpace;
  cityMask.wrapS = THREE.RepeatWrapping;
  cityMask.wrapT = THREE.ClampToEdgeWrapping;
  cityMask.generateMipmaps = true;
  cityMask.magFilter = THREE.LinearFilter;
  cityMask.minFilter = THREE.LinearMipmapLinearFilter;

  return { albedo, cityMask };
}

function clampToByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function fract(value: number): number {
  return value - Math.floor(value);
}
