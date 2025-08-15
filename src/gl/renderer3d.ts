import { PixelRatio } from 'react-native';
import * as THREE from 'three';
import { adaptEngine, sampleCivs } from './engineAdapter';
import type { CameraState, RaycastRefs } from './types';

const VERT = `
uniform float uPR;
uniform float uScale;
uniform float uMaxSize;
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main(){
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d  = max(0.02, -mv.z);
  float sz = aSize * uPR * (uScale / d);
  gl_PointSize = clamp(sz, 1.0, uMaxSize);
  gl_Position  = projectionMatrix * mv;
}`;
const FRAG = `
precision mediump float;
varying vec3 vColor;
void main(){
  vec2 c = gl_PointCoord - vec2(0.5);
  float r = dot(c,c);
  float a = smoothstep(0.25, 0.0, r);
  gl_FragColor = vec4(vColor, a);
}`;

const DEBUG_USE_BUILTIN_POINTS = false;
const DEBUG_SHOW_AXES = false;
const DEBUG_SHOW_TEST_CUBE = false;
const DEBUG_AUTOFIT_CAMERA = true;

type InitOpts = {
  engine: any;
  maxStars: number;
  maxCivs: number;
  cam: React.MutableRefObject<CameraState>;
  threeRefs: React.MutableRefObject<RaycastRefs>;
  overlay: React.MutableRefObject<{ civ: [number, number][]; lastUpdate: number; cam: { x: number; z: number; yaw: number; pitch: number } }>;
  onFps?: (fps: number) => void;
  rendererRef: React.MutableRefObject<{ renderer: THREE.WebGLRenderer; pr: number } | null>;
};

export function initRenderer(gl: any, opts: InitOpts) {
  const { engine, maxStars, maxCivs, cam, threeRefs, overlay, onFps, rendererRef } = opts;
  const E = adaptEngine(engine);

  const canvas: any = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    style: {},
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: (type: string) => (type.includes('webgl') ? gl : null),
  };
  (gl as any).canvas = canvas;
  if (!(gl as any).getContextAttributes) {
    (gl as any).getContextAttributes = () => ({
      alpha: true, depth: true, stencil: false, antialias: false,
      premultipliedAlpha: false, preserveDrawingBuffer: false,
      powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false, xrCompatible: false,
    });
  }

  const focusActive = { current: false };
  const focusTarget = new THREE.Vector3();
  let focusDist = 6;

  const renderer = new THREE.WebGLRenderer({
    context: gl as any,
    canvas,
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance',
    // @ts-expect-error
    contextAttributes: (gl as any).getContextAttributes(),
  });
  const pr = PixelRatio.get();
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setPixelRatio(pr);
  rendererRef.current = { renderer, pr };

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0b1020');

  const camera = new THREE.PerspectiveCamera(
    60,
    gl.drawingBufferWidth / gl.drawingBufferHeight,
    0.05,
    5000
  );
  camera.position.set(0, 0, cam.current.dist);
  threeRefs.current.camera = camera;
  threeRefs.current.raycaster = new THREE.Raycaster();

  if (DEBUG_SHOW_AXES) scene.add(new THREE.AxesHelper(3));
  if (DEBUG_SHOW_TEST_CUBE) {
    scene.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
      )
    );
  }

  const starGeom = new THREE.BufferGeometry();
  const starPos = new Float32Array(maxStars * 3);
  const starCol = new Float32Array(maxStars * 3);
  const starSize = new Float32Array(maxStars);
  for (let i = 0; i < maxStars; i++) {
    starCol[i * 3 + 0] = 0.82; starCol[i * 3 + 1] = 0.9; starCol[i * 3 + 2] = 1.0;
    starSize[i] = 1.2;
  }
  starGeom.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeom.setAttribute('aColor', new THREE.BufferAttribute(starCol, 3));
  starGeom.setAttribute('aSize', new THREE.BufferAttribute(starSize, 1));
  starGeom.setDrawRange(0, 0);

  const uniforms = {
    uPR: { value: pr },
    uScale: { value: 140.0 },
    uMaxSize: { value: 18.0 * pr },
  };

  const starMat = DEBUG_USE_BUILTIN_POINTS
    ? new THREE.PointsMaterial({ size: 6, sizeAttenuation: true, vertexColors: true })
    : new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      });
  if (DEBUG_USE_BUILTIN_POINTS) {
    starGeom.deleteAttribute?.('aColor');
    starGeom.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  }
  const starPoints = new THREE.Points(starGeom, starMat);
  starPoints.frustumCulled = false;
  scene.add(starPoints);

  const civGeom = new THREE.BufferGeometry();
  const civPos = new Float32Array(maxCivs * 3);
  const civCol = new Float32Array(maxCivs * 3);
  const civSize = new Float32Array(maxCivs);
  civGeom.setAttribute('position', new THREE.BufferAttribute(civPos, 3));
  civGeom.setAttribute('aColor', new THREE.BufferAttribute(civCol, 3));
  civGeom.setAttribute('aSize', new THREE.BufferAttribute(civSize, 1));
  civGeom.setDrawRange(0, 0);
  const civMat = DEBUG_USE_BUILTIN_POINTS
    ? new THREE.PointsMaterial({ size: 8, sizeAttenuation: true, vertexColors: true })
    : new THREE.ShaderMaterial({
        uniforms,
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      });
  if (DEBUG_USE_BUILTIN_POINTS) {
    civGeom.deleteAttribute?.('aColor');
    civGeom.setAttribute('color', new THREE.BufferAttribute(civCol, 3));
  }
  const civPoints = new THREE.Points(civGeom, civMat);
  civPoints.frustumCulled = false;
  scene.add(civPoints);
  threeRefs.current.civPoints = civPoints;

  const haloGeom = new THREE.BufferGeometry();
  const haloPos = new Float32Array(maxCivs * 3);
  const haloCol = new Float32Array(maxCivs * 3);
  const haloSize = new Float32Array(maxCivs);
  for (let i = 0; i < maxCivs; i++) {
    haloCol[i * 3 + 0] = 0.44; haloCol[i * 3 + 1] = 0.89; haloCol[i * 3 + 2] = 1.0;
  }
  haloGeom.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  haloGeom.setAttribute('aColor', new THREE.BufferAttribute(haloCol, 3));
  haloGeom.setAttribute('aSize', new THREE.BufferAttribute(haloSize, 1));
  haloGeom.setDrawRange(0, 0);
  const haloMat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const haloPoints = new THREE.Points(haloGeom, haloMat);
  haloPoints.frustumCulled = false;
  scene.add(haloPoints);

  const colSilent = [0.60, 0.65, 1.00];
  const colBroad = [1.00, 0.82, 0.40];
  const colCaut = [0.32, 1.00, 0.66];
  const colPree = [1.00, 0.42, 0.42];

  if (typeof (engine as any).stepN === 'function') {
    (engine as any).stepN(120);
  } else if (typeof (engine as any).step === 'function') {
    (engine as any).step(0.033);
  }

  for (let i = 0; i < E.starCount; i++) {
    const s = E.getStar(i);
    starPos[i * 3 + 0] = s[0];
    starPos[i * 3 + 1] = s[1];
    starPos[i * 3 + 2] = s[2];
  }
  starGeom.attributes.position.needsUpdate = true;
  starGeom.setDrawRange(0, E.starCount);
  starGeom.computeBoundingSphere();
  let lastStarCount = E.starCount;

  if (DEBUG_AUTOFIT_CAMERA && E.starCount > 0) {
    const r = (engine as any).radius ?? starGeom.boundingSphere?.radius ?? 20;
    const fit = Math.max(20, r * 2.2);
    cam.current.dist = fit;
    camera.position.set(fit, 0, 0);
    camera.lookAt(0, 0, 0);
  }

  const civIndexMap = new Int32Array(maxCivs);
  civIndexMap.fill(-1);
  threeRefs.current.civIndexMap = civIndexMap;

  let last = Date.now();
  let ema = 60;

  function loop() {
    const now = Date.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    E.step(dt);

    if (focusActive.current) {
      const t = 0.12;
      const v = focusTarget;
      const r = Math.sqrt(v.x * v.x + v.z * v.z);
      const targetYaw = Math.atan2(v.z, v.x);
      const targetPitch = Math.atan2(v.y, r);
      cam.current.yaw += (targetYaw - cam.current.yaw) * t;
      cam.current.pitch += (targetPitch - cam.current.pitch) * t;
      cam.current.dist += (focusDist - cam.current.dist) * t;
      if (
        Math.abs(targetYaw - cam.current.yaw) < 1e-3 &&
        Math.abs(targetPitch - cam.current.pitch) < 1e-3
      ) {
        focusActive.current = false;
      }
    }

    camera.fov = (cam.current.fov * 180) / Math.PI;
    camera.updateProjectionMatrix();
    const { yaw, pitch, dist } = cam.current;
    camera.position.set(
      dist * Math.cos(pitch) * Math.cos(yaw),
      dist * Math.sin(pitch),
      dist * Math.cos(pitch) * Math.sin(yaw)
    );
    camera.lookAt(0, 0, 0);

    overlay.current.cam = { x: camera.position.x, z: camera.position.z, yaw, pitch };
    const tnow = Date.now();
    if (tnow - overlay.current.lastUpdate > 100) {
      overlay.current.civ = sampleCivs(engine, 800);
      overlay.current.lastUpdate = tnow;
    }

    if (E.starCount > lastStarCount) {
      for (let i = lastStarCount; i < E.starCount; i++) {
        const s = E.getStar(i);
        starPos[i * 3 + 0] = s[0];
        starPos[i * 3 + 1] = s[1];
        starPos[i * 3 + 2] = s[2];
      }
      starGeom.attributes.position.needsUpdate = true;
      starGeom.setDrawRange(0, E.starCount);
      starGeom.computeBoundingSphere();
      lastStarCount = E.starCount;
    }

    let ci = 0, hi = 0;
    for (let i = 0; i < E.civCount; i++) {
      if (!E.isCivAlive(i)) continue;
      const p = E.getCivPos(i);
      civPos[ci * 3 + 0] = p[0];
      civPos[ci * 3 + 1] = p[1];
      civPos[ci * 3 + 2] = p[2];
      const strat = E.getCivStrat(i);
      const c = strat === 0 ? colSilent : strat === 1 ? colBroad : strat === 2 ? colCaut : colPree;
      civCol[ci * 3 + 0] = c[0];
      civCol[ci * 3 + 1] = c[1];
      civCol[ci * 3 + 2] = c[2];
      civSize[ci] = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2);
      civIndexMap[ci] = i;
      ci++;
      if (E.isCivRevealed(i)) {
        haloPos[hi * 3 + 0] = p[0];
        haloPos[hi * 3 + 1] = p[1];
        haloPos[hi * 3 + 2] = p[2];
        haloSize[hi] = (2.0 + Math.min(4.0, E.getCivTech(i) * 1.2)) + 4.0;
        hi++;
      }
    }
    civGeom.attributes.position.needsUpdate = true;
    civGeom.attributes[DEBUG_USE_BUILTIN_POINTS ? 'color' : 'aColor'].needsUpdate = true;
    civGeom.attributes.aSize.needsUpdate = true;
    civGeom.setDrawRange(0, ci);
    civGeom.computeBoundingSphere();

    haloGeom.attributes.position.needsUpdate = true;
    haloGeom.attributes.aSize.needsUpdate = true;
    haloGeom.setDrawRange(0, hi);
    haloGeom.computeBoundingSphere();

    renderer.render(scene, camera);
    gl.endFrameEXP();

    const fps = 1000 / Math.max(16, Date.now() - now);
    ema = ema * 0.9 + fps * 0.1;
    onFps?.(Math.round(ema));

    requestAnimationFrame(loop);
  }
  loop();

  function focusCiv(idx: number) {
    if (idx < 0 || idx >= E.civCount || !E.isCivAlive(idx)) return;
    const [x, y, z] = E.getCivPos(idx);
    focusTarget.set(x, y, z);
    focusDist = Math.max(2.0, Math.min(120.0, new THREE.Vector3(x, y, z).length() * 1.8));
    focusActive.current = true;
  }
  function focusRandom() {
    let tries = 200;
    while (tries--) {
      const r = Math.floor(Math.random() * E.civCount);
      if (E.isCivAlive(r)) { focusCiv(r); return; }
    }
    for (let i = 0; i < E.civCount; i++) if (E.isCivAlive(i)) { focusCiv(i); return; }
  }

  return { focusCiv, focusRandom };
}
