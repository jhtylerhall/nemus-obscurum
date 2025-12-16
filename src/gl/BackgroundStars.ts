// src/gl/BackgroundStars.ts
// Procedural background starfield that always renders behind the solar system.
// Uses a sprite-based Points cloud that follows the camera position so it feels infinitely far.

import * as THREE from "three";

type BackgroundStarsOptions = {
  count?: number;
  radius?: number;
  seed?: number;
  pixelRatio?: number;
  twinkleStrength?: number;
};

export type BackgroundStarsInstance = {
  points: THREE.Points;
  update(camera: THREE.Camera, timeSeconds: number): void;
};

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), 1 | r);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createStarSpriteTexture(size = 64) {
  const canvas: any =
    (typeof document !== "undefined" && document.createElement("canvas")) ||
    null;

  if (canvas) {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        size / 2,
        size / 2,
        0,
        size / 2,
        size / 2,
        size / 2
      );
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.35, "rgba(255,255,255,0.65)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;
      texture.generateMipmaps = true;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      return texture;
    }
  }

  // Fallback path for environments without a 2D canvas: synthesize the sprite via DataTexture.
  const data = new Uint8Array(size * size * 4);
  const center = size / 2;
  const radius = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - center;
      const dy = y - center;
      const d = Math.sqrt(dx * dx + dy * dy) / radius;
      const falloff = Math.max(0, 1 - d);
      const alpha = Math.pow(falloff, 1.6);
      const i = (y * size + x) * 4;
      data[i + 0] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.floor(255 * alpha);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.generateMipmaps = true;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export function createBackgroundStars(
  opts: BackgroundStarsOptions = {}
): BackgroundStarsInstance {
  const {
    count = 4500,
    radius = 12000,
    seed = 7,
    pixelRatio = 1,
    twinkleStrength = 0.08,
  } = opts;

  const rng = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const twinklePhase = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    // Uniform distribution on a spherical shell (no clustering at the poles).
    const u = rng();
    const v = rng();
    const theta = 2 * Math.PI * u;
    const cosPhi = 2 * v - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const r = radius * (0.92 + 0.08 * rng());

    positions[i * 3 + 0] = r * sinPhi * Math.cos(theta);
    positions[i * 3 + 1] = r * cosPhi;
    positions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

    // Subtle color temperature variation (cool blue to warm yellow) with brightness baked in.
    const temp = rng() * 2 - 1; // -1..1
    const baseLum = 0.7 + Math.pow(rng(), 2.5) * 0.6;
    const warm = Math.max(0, temp);
    const cool = Math.max(0, -temp);
    const rCol = Math.min(1, baseLum + warm * 0.18);
    const gCol = Math.min(1, baseLum - warm * 0.05 + cool * 0.05);
    const bCol = Math.min(1, baseLum + cool * 0.25);
    colors[i * 3 + 0] = rCol;
    colors[i * 3 + 1] = gCol;
    colors[i * 3 + 2] = bCol;

    // Many small stars, a few bright ones.
    const magnitude = Math.pow(rng(), 2.8);
    sizes[i] = 1.2 + magnitude * 3.2;

    twinklePhase[i] = rng() * Math.PI * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute("aTwinkle", new THREE.BufferAttribute(twinklePhase, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: createStarSpriteTexture() },
      uPixelRatio: { value: pixelRatio },
      uTime: { value: 0 },
      uTwinkleStrength: { value: twinkleStrength },
    },
    vertexShader: `
      uniform float uPixelRatio;
      attribute float aSize;
      attribute float aTwinkle;
      varying float vTwinkle;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vTwinkle = aTwinkle;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Keep roughly constant on screen (no size attenuation) for "infinitely far" feel.
        gl_PointSize = aSize * uPixelRatio;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      precision mediump float;
      uniform sampler2D uTexture;
      uniform float uTime;
      uniform float uTwinkleStrength;
      varying float vTwinkle;
      varying vec3 vColor;
      void main() {
        vec4 sprite = texture2D(uTexture, gl_PointCoord);
        float twinkle = 1.0 + uTwinkleStrength * sin(uTime + vTwinkle);
        float alpha = sprite.a * twinkle;
        if (alpha < 0.01) discard;
        gl_FragColor = vec4(vColor * twinkle, 1.0) * vec4(sprite.rgb, alpha);
      }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    transparent: true,
    vertexColors: true,
  });
  material.toneMapped = false;

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = -1000; // ensure background draws before the solar system without touching depth

  return {
    points,
    update(camera, timeSeconds) {
      points.position.copy(camera.position); // lock translation to camera → no parallax
      (material.uniforms.uTime as THREE.IUniform).value = timeSeconds;
    },
  };
}

