import type React from "react";
import { PixelRatio } from "react-native";
import * as THREE from "three";

import { adaptEngine, sampleCivs } from "./engineAdapter";
import type { CameraState, RaycastRefs } from "./types";

// ---------- Tunables ----------
const CAMERA_FAR = 5000;
const STAR_U_SCALE = 220.0; // bigger point size at distance
const STAR_U_MAX = 24.0; // px * pixelRatio
const CIV_U_MAX = 28.0; // px * pixelRatio
const GUIDE_BEACONS = 10; // how many “safety” markers when scene is empty

// ---------- small helpers ----------
function markNeedsUpdate(geom: THREE.BufferGeometry, key: string) {
  const attr = geom.getAttribute(key) as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined;
  if (attr && "needsUpdate" in attr) {
    // @ts-ignore
    attr.needsUpdate = true;
  }
}
function seeded(seed: number) {
  let s = seed | 0;
  return () => ((s = (1664525 * s + 1013904223) | 0) >>> 0) / 4294967296;
}

// ---------- shaders ----------
const VERT = `
uniform float uPR; uniform float uScale; uniform float uMaxSize;
attribute float aSize; attribute vec3 aColor; varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(0.02, -mv.z);
  float sz = aSize * uPR * (uScale / d);
  gl_PointSize = clamp(sz, 1.0, uMaxSize);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
precision mediump float; varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = dot(c,c);
  float a = smoothstep(0.25, 0.0, r);
  gl_FragColor = vec4(vColor, a);
}`;

// ---------- background: parallax stars + soft nebula ----------
function makeOuterStars(n: number, R: number, dpr: number) {
  const group = new THREE.Group();

  const buildLayer = (
    count: number,
    radius: number,
    size: number,
    opacity: number,
    biasToPlane: number
  ) => {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3);
    const c = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const onBand = Math.random() < biasToPlane;
      const theta = 2 * Math.PI * Math.random();
      const phi = onBand
        ? (Math.random() - 0.5) * 0.35 // clustered into a "galactic" band
        : Math.acos(2 * Math.random() - 1) - Math.PI / 2; // uniform sphere
      const r = radius * (0.94 + 0.06 * Math.random());

      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      p[i * 3 + 0] = r * cosPhi * Math.cos(theta);
      p[i * 3 + 1] = r * sinPhi * 0.7;
      p[i * 3 + 2] = r * cosPhi * Math.sin(theta);

      // Cooler core with a few warm twinkles so the field recedes
      const cool = 0.8 + 0.15 * Math.random();
      const warm = 0.8 + 0.2 * Math.random();
      const hueMix = onBand ? 0.65 : 0.4;
      const rCol = cool * (0.7 + 0.2 * hueMix) + warm * (0.15 * (1 - hueMix));
      const gCol = cool;
      const bCol = 0.95 + 0.04 * Math.random();
      c[i * 3 + 0] = rCol;
      c[i * 3 + 1] = gCol;
      c[i * 3 + 2] = bCol;
    }

    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    g.setAttribute("color", new THREE.BufferAttribute(c, 3));
    const m = new THREE.PointsMaterial({
      size: size * dpr,
      sizeAttenuation: false,
      vertexColors: true,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });
    const mesh = new THREE.Points(g, m);
    mesh.frustumCulled = false;
    mesh.renderOrder = -5;
    return mesh;
  };

  const far = buildLayer(Math.floor(n * 0.7), R * 1.15, 1.0, 0.58, 0.75);
  const near = buildLayer(Math.floor(n * 0.3), R, 1.45, 0.38, 0.45);

  group.add(far, near);
  group.frustumCulled = false;
  return group;
}
function makeNebulaSprite(
  size: number,
  tint: THREE.ColorRepresentation,
  seed = 1
) {
  const rnd = seeded(seed);
  const data = new Uint8Array(size * size * 4);
  const cx = size / 2,
    cy = size / 2,
    R = size * 0.5;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / R,
        dy = (y - cy) / R;
      const d = Math.sqrt(dx * dx + dy * dy);
      const fall = Math.max(0, 1 - d);
      const noise = 0.6 * rnd() + 0.4 * rnd();
      const a = Math.pow(fall, 1.5) * Math.pow(noise, 1.2);
      const i = (y * size + x) * 4;
      data[i + 0] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = Math.floor(255 * a);
    }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: new THREE.Color(tint),
    opacity: 0.45,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(R * 8);
  return sprite;
}

// ---------- types ----------
type FocusTween = {
  active: boolean;
  t: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  dist: number;
};

type InitOpts = {
  engine: any;
  maxStars: number;
  maxCivs: number;
  cam: React.MutableRefObject<CameraState>;
  lookAt: React.MutableRefObject<THREE.Vector3>;
  focusTween: React.MutableRefObject<FocusTween>;
  stickL: React.MutableRefObject<{ x: number; y: number }>;
  stickR: React.MutableRefObject<{ x: number; y: number }>;
  overlay: React.MutableRefObject<{
    civ: [number, number][];
    lastUpdate: number;
    cam: {
      x: number;
      y: number;
      z: number;
      yaw: number;
      pitch: number;
      dist: number;
      fov: number;
    };
  }>;
  threeRefs: React.MutableRefObject<
    RaycastRefs & {
      bgStars?: THREE.Object3D;
      nebulas?: THREE.Sprite[];
      grid?: THREE.GridHelper;
      axes?: THREE.AxesHelper;
      beacons?: THREE.Points;
      scene?: THREE.Scene;
    }
  >;
  onFps?: (fps: number) => void;
  rendererRef: React.MutableRefObject<{
    renderer: THREE.WebGLRenderer;
    pr: number;
  } | null>;
};

type RendererHandle = {
  focusCiv(i: number): void;
  focusRandom(): void;
  focusPoint(x: number, y: number, z: number, dist: number): void;
};

export function initRenderer(gl: any, opts: InitOpts): RendererHandle {
  const {
    engine,
    maxStars,
    maxCivs,
    cam,
    lookAt,
    focusTween,
    stickL,
    stickR,
    overlay,
    threeRefs,
    onFps,
    rendererRef,
  } = opts;
  const E = adaptEngine(engine);

  const canvas: any = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: (type: string) => (type.includes("webgl") ? gl : null),
  };
  (gl as any).canvas = canvas;
  if (!(gl as any).getContextAttributes) {
    (gl as any).getContextAttributes = () => ({
      alpha: true,
      depth: true,
      stencil: false,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
      xrCompatible: false,
    });
  }

  const renderer = new THREE.WebGLRenderer({
    context: gl as any,
    canvas,
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
    // @ts-expect-error runtime
    contextAttributes: (gl as any).getContextAttributes(),
  });
  const pr = PixelRatio.get();
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setPixelRatio(pr);
  rendererRef.current = { renderer, pr };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#02050c");

  const camera = new THREE.PerspectiveCamera(
    60,
    gl.drawingBufferWidth / gl.drawingBufferHeight,
    0.05,
    CAMERA_FAR
  );
  threeRefs.current.camera = camera;
  threeRefs.current.scene = scene;
  threeRefs.current.raycaster = new THREE.Raycaster();

  // background
  const R = ((engine as any).radius ?? 50) * 36;
  const bgStars = makeOuterStars(3400, R, pr);
  const bgGroup = new THREE.Group();
  bgGroup.add(bgStars);

  const nebA = makeNebulaSprite(256, "#6cc3ff", 1);
  const nebB = makeNebulaSprite(256, "#f48fb1", 2);
  const nebC = makeNebulaSprite(256, "#88f7c5", 3);
  nebA.position.set(-R * 0.45, R * 0.08, -R * 0.55);
  nebB.position.set(R * 0.62, -R * 0.28, R * 0.25);
  nebC.position.set(-R * 0.25, -R * 0.32, R * 0.72);
  bgGroup.add(nebA, nebB, nebC);

  bgGroup.frustumCulled = false;
  bgGroup.renderOrder = -5;
  scene.add(bgGroup);
  threeRefs.current.bgStars = bgGroup;
  threeRefs.current.nebulas = [nebA, nebB, nebC];

  // grid/axes for orientation
  const grid = new THREE.GridHelper(
    ((engine as any).radius ?? 50) * 2,
    20,
    0x254066,
    0x15223a
  );
  const axes = new THREE.AxesHelper(((engine as any).radius ?? 50) * 0.35);
  const setOpacity = (obj: THREE.Object3D, opacity: number) => {
    const mats: any[] = [];
    obj.traverse((o: any) => {
      if (o.material) mats.push(o.material);
    });
    mats.flat().forEach((m: any) => {
      m.transparent = true;
      m.opacity = opacity;
    });
  };
  setOpacity(grid, 0.25);
  setOpacity(axes, 0.55);
  scene.add(grid, axes);
  threeRefs.current.grid = grid;
  threeRefs.current.axes = axes;

  // uniforms
  const uniforms = {
    uPR: { value: pr },
    uScale: { value: STAR_U_SCALE },
    uMaxSize: { value: STAR_U_MAX * pr },
  };
  const civUniforms = {
    uPR: { value: pr },
    uScale: { value: STAR_U_SCALE },
    uMaxSize: { value: CIV_U_MAX * pr },
  };

  // Stars
  const starGeom = new THREE.BufferGeometry();
  const starPos = new Float32Array(maxStars * 3);
  const starCol = new Float32Array(maxStars * 3);
  const starSize = new Float32Array(maxStars);
  for (let i = 0; i < maxStars; i++) {
    starCol[i * 3 + 0] = 0.82;
    starCol[i * 3 + 1] = 0.9;
    starCol[i * 3 + 2] = 1.0;
    starSize[i] = 1.6;
  }
  starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeom.setAttribute("aColor", new THREE.BufferAttribute(starCol, 3));
  starGeom.setAttribute("aSize", new THREE.BufferAttribute(starSize, 1));
  starGeom.setDrawRange(0, 0);
  const starMat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeom, starMat);
  starPoints.frustumCulled = false;
  scene.add(starPoints);

  // Civs
  const civGeom = new THREE.BufferGeometry();
  const civPos = new Float32Array(maxCivs * 3);
  const civCol = new Float32Array(maxCivs * 3);
  const civSize = new Float32Array(maxCivs);
  civGeom.setAttribute("position", new THREE.BufferAttribute(civPos, 3));
  civGeom.setAttribute("aColor", new THREE.BufferAttribute(civCol, 3));
  civGeom.setAttribute("aSize", new THREE.BufferAttribute(civSize, 1));
  civGeom.setDrawRange(0, 0);
  const civMat = new THREE.ShaderMaterial({
    uniforms: civUniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const civPoints = new THREE.Points(civGeom, civMat);
  civPoints.frustumCulled = false;
  scene.add(civPoints);
  threeRefs.current.civPoints = civPoints;

  // Halos
  const haloGeom = new THREE.BufferGeometry();
  const haloPos = new Float32Array(maxCivs * 3);
  const haloCol = new Float32Array(maxCivs * 3);
  const haloSize = new Float32Array(maxCivs);
  for (let i = 0; i < maxCivs; i++) {
    haloCol[i * 3 + 0] = 0.44;
    haloCol[i * 3 + 1] = 0.89;
    haloCol[i * 3 + 2] = 1.0;
  }
  haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
  haloGeom.setAttribute("aColor", new THREE.BufferAttribute(haloCol, 3));
  haloGeom.setAttribute("aSize", new THREE.BufferAttribute(haloSize, 1));
  haloGeom.setDrawRange(0, 0);
  const haloMat = new THREE.ShaderMaterial({
    uniforms: civUniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const haloPoints = new THREE.Points(haloGeom, haloMat);
  haloPoints.frustumCulled = false;
  scene.add(haloPoints);

  // Guide beacons
  const beaconGeom = new THREE.BufferGeometry();
  const beaconPos = new Float32Array(GUIDE_BEACONS * 3);
  const beaconCol = new Float32Array(GUIDE_BEACONS * 3);
  const beaconSize = new Float32Array(GUIDE_BEACONS);
  for (let i = 0; i < GUIDE_BEACONS; i++) {
    beaconCol[i * 3 + 0] = 1.0;
    beaconCol[i * 3 + 1] = 0.84;
    beaconCol[i * 3 + 2] = 0.25;
    beaconSize[i] = 8.0;
  }
  beaconGeom.setAttribute("position", new THREE.BufferAttribute(beaconPos, 3));
  beaconGeom.setAttribute("aColor", new THREE.BufferAttribute(beaconCol, 3));
  beaconGeom.setAttribute("aSize", new THREE.BufferAttribute(beaconSize, 1));
  beaconGeom.setDrawRange(0, 0);
  const beaconMat = new THREE.ShaderMaterial({
    uniforms: civUniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
  });
  const beacons = new THREE.Points(beaconGeom, beaconMat);
  beacons.frustumCulled = false;
  scene.add(beacons);
  threeRefs.current.beacons = beacons;

  // palette
  const colSilent = [0.6, 0.65, 1.0];
  const colBroad = [1.0, 0.82, 0.4];
  const colCaut = [0.32, 1.0, 0.66];
  const colPree = [1.0, 0.42, 0.42];

  // warm-up + initial stars
  if (typeof (engine as any).stepN === "function") (engine as any).stepN(90);
  for (let i = 0; i < E.starCount; i++) {
    const s = E.getStar(i);
    starPos[i * 3 + 0] = s[0];
    starPos[i * 3 + 1] = s[1];
    starPos[i * 3 + 2] = s[2];
  }
  markNeedsUpdate(starGeom, "position");
  starGeom.setDrawRange(0, E.starCount);
  starGeom.computeBoundingSphere();
  let lastStarCount = E.starCount;

  // pick indices map
  const civIndexMap = new Int32Array(maxCivs);
  civIndexMap.fill(-1);
  threeRefs.current.civIndexMap = civIndexMap;

  // auto-frame on first content
  const rs = (engine as any).radius ?? 0;
  if (rs <= 0 && starGeom.boundingSphere) {
    const bs = starGeom.boundingSphere;
    lookAt.current.copy(bs.center);
    cam.current.dist = Math.max(20, Math.min(300, bs.radius * 1.8));
  } else if (rs > 0) {
    cam.current.dist = Math.max(20, rs * 2.0);
  }

  // loop
  let focusedIdx: number | null = null;
  let focusPulse = 0;
  let last = Date.now(),
    ema = 60;
  const loop = () => {
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    E.step(dt);

    if (focusedIdx != null) {
      focusPulse += dt * 2.0;
      if (focusPulse > Math.PI * 2) focusPulse -= Math.PI * 2;
    }

    if (focusTween.current.active) {
      focusTween.current.t = Math.min(1, focusTween.current.t + dt * 2.5);
      const t = focusTween.current.t;
      lookAt.current.lerpVectors(
        focusTween.current.from,
        focusTween.current.to,
        t
      );
      cam.current.dist += (focusTween.current.dist - cam.current.dist) * 0.25;
      if (t >= 1 - 1e-3) focusTween.current.active = false;
    }

    cam.current.yaw += stickL.current.x * dt * 1.5;
    cam.current.pitch = Math.max(
      -Math.PI / 2 + 0.02,
      Math.min(
        Math.PI / 2 - 0.02,
        cam.current.pitch + stickL.current.y * dt * 1.5
      )
    );
    cam.current.dist = Math.max(
      5,
      Math.min(CAMERA_FAR, cam.current.dist - stickR.current.y * dt * 40)
    );

    const { yaw, pitch, dist } = cam.current;
    const cx = lookAt.current.x + dist * Math.cos(pitch) * Math.cos(yaw);
    const cy = lookAt.current.y + dist * Math.sin(pitch);
    const cz = lookAt.current.z + dist * Math.cos(pitch) * Math.sin(yaw);
    camera.fov = (cam.current.fov * 180) / Math.PI;
    camera.updateProjectionMatrix();
    camera.position.set(cx, cy, cz);
    camera.lookAt(lookAt.current);

    if (threeRefs.current.bgStars) {
      threeRefs.current.bgStars.position.copy(camera.position);
      threeRefs.current.bgStars.rotation.y += dt * 0.006;
      threeRefs.current.bgStars.rotation.x += dt * 0.0025;
    }

    if (E.starCount > lastStarCount) {
      for (let i = lastStarCount; i < E.starCount; i++) {
        const s = E.getStar(i);
        starPos[i * 3 + 0] = s[0];
        starPos[i * 3 + 1] = s[1];
        starPos[i * 3 + 2] = s[2];
      }
      markNeedsUpdate(starGeom, "position");
      starGeom.setDrawRange(0, E.starCount);
      starGeom.computeBoundingSphere();
      lastStarCount = E.starCount;
    }

    let ci = 0,
      hi = 0,
      aliveCnt = 0;
    for (let i = 0; i < E.civCount; i++) {
      if (!E.isCivAlive(i)) continue;
      aliveCnt++;
      const p = E.getCivPos(i);
      civPos[ci * 3 + 0] = p[0];
      civPos[ci * 3 + 1] = p[1];
      civPos[ci * 3 + 2] = p[2];

      const strat = E.getCivStrat(i);
      const c =
        strat === 0
          ? colSilent
          : strat === 1
          ? colBroad
          : strat === 2
          ? colCaut
          : colPree;
      civCol[ci * 3 + 0] = c[0];
      civCol[ci * 3 + 1] = c[1];
      civCol[ci * 3 + 2] = c[2];
      let sz = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2);
      if (focusedIdx === i) {
        const pulse = 0.5 + 0.5 * Math.sin(focusPulse);
        sz += 4.0 * pulse;
        civCol[ci * 3 + 0] = 1.0;
        civCol[ci * 3 + 1] = 0.9;
        civCol[ci * 3 + 2] = 0.6;
      }
      civSize[ci] = sz;

      civIndexMap[ci] = i;
      ci++;

      if (E.isCivRevealed(i)) {
        haloPos[hi * 3 + 0] = p[0];
        haloPos[hi * 3 + 1] = p[1];
        haloPos[hi * 3 + 2] = p[2];
        haloSize[hi] = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2) + 4.0;
        hi++;
      }
    }
    markNeedsUpdate(civGeom, "position");
    markNeedsUpdate(civGeom, "aColor");
    markNeedsUpdate(civGeom, "aSize");
    civGeom.setDrawRange(0, ci);
    civGeom.computeBoundingSphere();

    markNeedsUpdate(haloGeom, "position");
    markNeedsUpdate(haloGeom, "aSize");
    haloGeom.setDrawRange(0, hi);
    haloGeom.computeBoundingSphere();

    const bGeom = beacons.geometry as THREE.BufferGeometry;
    const bPos = (bGeom.getAttribute("position") as THREE.BufferAttribute)
      .array as Float32Array;
    let bCount = 0;
    if (aliveCnt < 3) {
      const baseR = Math.max(8, ((engine as any).radius ?? 20) * 0.6);
      for (let i = 0; i < GUIDE_BEACONS; i++) {
        const a = (i / GUIDE_BEACONS) * Math.PI * 2;
        const r = baseR * (0.8 + 0.3 * Math.sin(i * 2.1));
        const x = r * Math.cos(a),
          z = r * Math.sin(a);
        bPos[i * 3 + 0] = x;
        bPos[i * 3 + 1] = 0;
        bPos[i * 3 + 2] = z;
        bCount++;
      }
    }
    if (bCount > 0) {
      markNeedsUpdate(bGeom, "position");
      bGeom.setDrawRange(0, bCount);
    } else {
      bGeom.setDrawRange(0, 0);
    }

    overlay.current.cam = {
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      yaw: cam.current.yaw,
      pitch: cam.current.pitch,
      dist,
      fov: cam.current.fov,
    };
    const tNow = Date.now();
    if (tNow - overlay.current.lastUpdate > 100) {
      overlay.current.civ = sampleCivs(engine, 800);
      overlay.current.lastUpdate = tNow;
    }

    renderer.render(scene, camera);
    gl.endFrameEXP();

    const fps = 1000 / Math.max(16, Date.now() - now);
    ema = ema * 0.9 + fps * 0.1;
    onFps?.(Math.round(ema));

    requestAnimationFrame(loop);
  };
  loop();

  function focusPoint(x: number, y: number, z: number, dist: number) {
    focusTween.current.from.copy(lookAt.current);
    focusTween.current.to.set(x, y, z);
    focusTween.current.dist = dist;
    focusTween.current.t = 0;
    focusTween.current.active = true;
    focusedIdx = null;
  }

  function focusCiv(idx: number) {
    if (idx < 0 || idx >= E.civCount || !E.isCivAlive(idx)) return;
    const p = E.getCivPos(idx);
    const target = new THREE.Vector3(p[0], p[1], p[2]);
    const d = Math.max(12, Math.min(200, target.length() * 1.8));
    focusPoint(target.x, target.y, target.z, d);
    focusedIdx = idx;
    focusPulse = 0;
  }

  function focusRandom() {
    let tries = 200;
    while (tries--) {
      const r = (Math.random() * E.civCount) | 0;
      if (E.isCivAlive(r)) {
        focusCiv(r);
        return;
      }
    }
    for (let i = 0; i < E.civCount; i++)
      if (E.isCivAlive(i)) {
        focusCiv(i);
        return;
      }
  }

  return { focusCiv, focusRandom, focusPoint };
}
