import React, { useEffect, useRef, useImperativeHandle, useState } from "react";
import { View, PixelRatio, LayoutChangeEvent } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MiniMap } from "../ui/MiniMap";
import { Compass } from "../ui/Compass";
import { Vignette } from "../ui/Vignette";
import { CoordsHUD } from "../ui/CoordsHUD";
import { AnalogStick } from "../ui/AnalogStick";
import { EdgePointer } from "../ui/EdgePointer";
import { adaptEngine, sampleCivs } from "./engineAdapter";
import { pickStrongest, pickFrontier, pickNearest, pickDensest } from "./poi";

// ---------- Tunables ----------
const CAMERA_FAR = 8000; // generous far plane
const STAR_U_SCALE = 220.0;       // bigger point size at distance
const STAR_U_MAX   = 24.0;        // px * pixelRatio
const CIV_U_MAX    = 28.0;        // px * pixelRatio
const GUIDE_BEACONS = 10;         // how many “safety” markers when scene is empty

// ---------- small helpers ----------
function markNeedsUpdate(geom: THREE.BufferGeometry, key: string) {
  const attr = geom.getAttribute(key) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
  if (attr && "needsUpdate" in attr) { /* @ts-ignore */ attr.needsUpdate = true; }
}
function seeded(seed: number) { let s = seed | 0; return () => ((s = (1664525 * s + 1013904223) | 0) >>> 0) / 4294967296; }

function ensureSeed(engine: any) {
  const starCount = engine.starCount ?? engine.starsCount ?? 0;
  let anyAlive = false; const N = engine.civCount ?? 0;
  for (let i = 0; i < N; i++) if (engine.civAlive?.[i] || engine.isCivAlive?.(i)) { anyAlive = true; break; }
  if (starCount < 50 && typeof engine.spawnRandomStars === "function") engine.spawnRandomStars(15000);
  if (!anyAlive && typeof engine.spawnRandomCiv === "function") engine.spawnRandomCiv();
}

function safeFocusDistance(target: THREE.Vector3, worldR?: number) {
  const base = Math.max(12, worldR ? worldR * 0.6 : target.length() * 1.8);
  return Math.min(500, base);
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
function makeOuterStars(n: number, R: number) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3);
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const cosPhi = 2 * v - 1;
    const sinPhi = Math.sqrt(Math.max(0, 1 - cosPhi * cosPhi));
    const r = R * (0.94 + 0.12 * Math.random());
    p[i * 3 + 0] = r * sinPhi * Math.cos(theta);
    p[i * 3 + 1] = r * cosPhi * 0.6;
    p[i * 3 + 2] = r * sinPhi * Math.sin(theta);
    const t = Math.random();
    c[i * 3 + 0] = 0.75 + 0.25 * t * 0.2;
    c[i * 3 + 1] = 0.82 + 0.18 * t;
    c[i * 3 + 2] = 0.95 + 0.05 * Math.random();
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  g.setAttribute("color", new THREE.BufferAttribute(c, 3));
  const m = new THREE.PointsMaterial({ size: 2, sizeAttenuation: true, vertexColors: true, transparent: true });
  const mesh = new THREE.Points(g, m);
  mesh.frustumCulled = false;
  return mesh;
}
function makeNebulaSprite(size: number, tint: THREE.ColorRepresentation, seed = 1) {
  const rnd = seeded(seed);
  const data = new Uint8Array(size * size * 4);
  const cx = size / 2, cy = size / 2, R = size * 0.5;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (x - cx) / R, dy = (y - cy) / R;
    const d = Math.sqrt(dx * dx + dy * dy);
    const fall = Math.max(0, 1 - d);
    const noise = 0.6 * rnd() + 0.4 * rnd();
    const a = Math.pow(fall, 1.5) * Math.pow(noise, 1.2);
    const i = (y * size + x) * 4;
    data[i+0]=255; data[i+1]=255; data[i+2]=255; data[i+3]=Math.floor(255*a);
  }
  const tex = new THREE.DataTexture(data, size, size); tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(tint), opacity: 0.45, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const sprite = new THREE.Sprite(mat); sprite.scale.setScalar(R * 8);
  return sprite;
}

// ---------- Public API ----------
export type GLSceneHandle = {
  focusCiv(i: number): void;
  focusRandom(): void;
  home(): void;
  focusStrongest(): void;
  focusFrontier(): void;
  focusDensest(): void;
  focusNearest(): void;
  jumpToWorldXY(x: number, z: number): void;
};

type Props = { engine: any; maxStars: number; maxCivs: number; onFps?: (fps: number) => void; };

export const GLScene = React.forwardRef<GLSceneHandle, Props>(function GLScene(
  { engine, maxStars, maxCivs, onFps }, ref
) {
  const E = adaptEngine(engine);

  // orbit camera around a target
  const cam = useRef({ yaw: Math.PI * 0.15, pitch: Math.PI * 0.12, dist: 20, fov: (60 * Math.PI) / 180 });
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const focusTween = useRef({ active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dist: 20 });

  // renderer sizing
  const rendererOnLayout = useRef<{ renderer: THREE.WebGLRenderer; pr: number } | null>(null);
  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSize.current.w = width; viewSize.current.h = height;
    const r = rendererOnLayout.current;
    if (r?.renderer) r.renderer.setSize(Math.max(1, Math.floor(width * r.pr)), Math.max(1, Math.floor(height * r.pr)), false);
  };

  // picking/refs
  const threeRefs = useRef<{ camera?: THREE.PerspectiveCamera; civPoints?: THREE.Points; civIndexMap?: Int32Array; raycaster?: THREE.Raycaster; bgGroup?: THREE.Group; grid?: THREE.GridHelper; axes?: THREE.AxesHelper; beacons?: THREE.Points; }>({});

  // overlay refs (throttled)
  const overlay = useRef({ civ: [] as [number, number][], lastUpdate: 0, cam: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, dist: 20 } });

  // UI state for edge pointer
  const [pointerUI, setPointerUI] = useState({ show: false, x: 0, y: 0, angleDeg: 0 });
  const pointerRef = useRef({ show: false, x: 0, y: 0, angleDeg: 0 });
  useEffect(() => {
    const id = setInterval(() => setPointerUI({ ...pointerRef.current }), 66);
    return () => clearInterval(id);
  }, []);

  // analog sticks
  const stickL = useRef({ x: 0, y: 0 });
  const stickR = useRef({ x: 0, y: 0 });

  // focus bookkeeping
  const focusedIdx = useRef<number | null>(null);
  const focusPulse = useRef(0);

  // tap gesture for picking
  const tapGesture = Gesture.Tap().numberOfTaps(1).maxDeltaX(16).maxDeltaY(16).runOnJS(true)
    .onEnd((e, ok) => {
      if (!ok) return;
      const { camera, civPoints, raycaster, civIndexMap } = threeRefs.current;
      if (!camera || !civPoints || !raycaster || !civIndexMap) return;
      const { w, h } = viewSize.current;
      const ndc = new THREE.Vector2((e.x / w) * 2 - 1, -(e.y / h) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      (raycaster.params as any).Points = { threshold: 0.14 * PixelRatio.get() };
      const hits = raycaster.intersectObject(civPoints, false);
      if (!hits.length) return;
      const idx = (hits[0] as any).index ?? -1;
      if (idx < 0) return;
      const engineIdx = civIndexMap[idx];
      if (engineIdx >= 0) focusCiv(engineIdx);
    });

  // focus helpers
  function startFocusTo(target: THREE.Vector3, dist: number) {
    focusTween.current.from.copy(lookAt.current);
    focusTween.current.to.copy(target);
    focusTween.current.dist = dist;
    focusTween.current.t = 0;
    focusTween.current.active = true;
  }
  function focusCiv(i: number) {
    if (i < 0 || i >= E.civCount || !E.isCivAlive(i)) return;
    const p = E.getCivPos(i);
    const target = new THREE.Vector3(p[0], p[1], p[2]);
    const worldR = (engine as any).radius;
    const d = safeFocusDistance(target, worldR);
    startFocusTo(target, d);
    focusedIdx.current = i;
    focusPulse.current = 0;
  }
  function home() {
    const r = (engine as any).radius ?? 50;
    cam.current.yaw = Math.PI * 0.15;
    cam.current.pitch = Math.PI * 0.12;
    startFocusTo(new THREE.Vector3(0, 0, 0), Math.max(20, r * 2.2));
    focusedIdx.current = null;
  }
  function focusStrongest() { const i = pickStrongest(engine); if (i >= 0) focusCiv(i); }
  function focusFrontier()  { const i = pickFrontier(engine);  if (i >= 0) focusCiv(i); }
  function focusDensest()   { const i = pickDensest(engine);   if (i >= 0) focusCiv(i); }
  function focusNearest() {
    const { x, y, z } = threeRefs.current.camera?.position ?? { x: 0, y: 0, z: 0 };
    const i = pickNearest(engine, { x, y, z }); if (i >= 0) focusCiv(i);
  }
  function jumpToWorldXY(x: number, z: number) {
    const target = new THREE.Vector3(x, 0, z);
    const worldR = (engine as any).radius;
    const d = safeFocusDistance(target, worldR);
    startFocusTo(target, d);
    focusedIdx.current = null;
  }

  useImperativeHandle(ref, () => ({
    focusCiv, focusRandom: () => {
      let t = 200;
      while (t--) { const r = (Math.random() * E.civCount) | 0; if (E.isCivAlive(r)) { focusCiv(r); return; } }
      for (let i = 0; i < E.civCount; i++) if (E.isCivAlive(i)) { focusCiv(i); return; }
      if (typeof (engine as any).spawnRandomCiv === "function") {
        const idx = (engine as any).spawnRandomCiv();
        if (idx >= 0) focusCiv(idx);
      }
    },
    home, focusStrongest, focusFrontier, focusDensest, focusNearest, jumpToWorldXY,
  }), [engine]);

  useEffect(() => {
    cam.current = { yaw: Math.PI * 0.15, pitch: Math.PI * 0.12, dist: 20, fov: (60 * Math.PI) / 180 };
    lookAt.current.set(0, 0, 0);
  }, [engine]);

  return (
    <GestureDetector gesture={tapGesture}>
      <View style={{ flex: 1, position: 'relative' }} onLayout={onLayout}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            const canvas: any = {
              width: gl.drawingBufferWidth, height: gl.drawingBufferHeight, style: {},
              clientWidth: gl.drawingBufferWidth, clientHeight: gl.drawingBufferHeight,
              addEventListener: () => {}, removeEventListener: () => {},
              getContext: (type: string) => (type.includes("webgl") ? gl : null),
            };
            (gl as any).canvas = canvas;
            if (!(gl as any).getContextAttributes) {
              (gl as any).getContextAttributes = () => ({
                alpha: true, depth: true, stencil: false, antialias: false,
                premultipliedAlpha: false, preserveDrawingBuffer: false,
                powerPreference: "high-performance", failIfMajorPerformanceCaveat: false, xrCompatible: false,
              });
            }

            const renderer = new THREE.WebGLRenderer({
              context: gl as any, canvas, alpha: true, antialias: false,
              premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance",
              // @ts-expect-error runtime read
              contextAttributes: (gl as any).getContextAttributes(),
            });
            const pr = PixelRatio.get();
            renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
            renderer.setPixelRatio(pr);
            rendererOnLayout.current = { renderer, pr };

            const scene = new THREE.Scene();
            scene.background = new THREE.Color("#050a18");

            const camera = new THREE.PerspectiveCamera(
              60, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.05, CAMERA_FAR
            );
            threeRefs.current.camera = camera;
            threeRefs.current.raycaster = new THREE.Raycaster();

            // parallax background
            const bg = new THREE.Group();
            const R = ((engine as any).radius ?? 50) * 30;
            const farA = makeOuterStars(2200, R);
            const farB = makeOuterStars(1500, R * 1.2);
            const nebA = makeNebulaSprite(256, "#6cc3ff", 1); nebA.position.set(-R * 0.4,  R * 0.15, -R * 0.6);
            const nebB = makeNebulaSprite(256, "#f48fb1", 2); nebB.position.set( R * 0.6, -R * 0.25,  R * 0.2);
            const nebC = makeNebulaSprite(256, "#88f7c5", 3); nebC.position.set(-R * 0.2, -R * 0.3,   R * 0.7);
            bg.add(farA, farB, nebA, nebB, nebC);
            scene.add(bg);
            threeRefs.current.bgGroup = bg;

            // Make sure there's content
            ensureSeed(engine);

            // grid/axes for orientation
            const grid = new THREE.GridHelper(((engine as any).radius ?? 50) * 2, 20, 0x254066, 0x15223a);
            const axes = new THREE.AxesHelper(((engine as any).radius ?? 50) * 0.35);
            const setOpacity = (obj: THREE.Object3D, opacity: number) => {
              const mats: any[] = [];
              obj.traverse((o: any) => { if (o.material) mats.push(o.material); });
              mats.flat().forEach((m: any) => { m.transparent = true; m.opacity = opacity; });
            };
            setOpacity(grid, 0.25); setOpacity(axes, 0.55);
            scene.add(grid, axes);
            threeRefs.current.grid = grid; threeRefs.current.axes = axes;

            // uniforms
            const uniforms = { uPR: { value: pr }, uScale: { value: STAR_U_SCALE }, uMaxSize: { value: STAR_U_MAX * pr } };
            const civUniforms = { uPR: { value: pr }, uScale: { value: STAR_U_SCALE }, uMaxSize: { value: CIV_U_MAX * pr } };

            // Stars
            const starGeom = new THREE.BufferGeometry();
            const starPos = new Float32Array(maxStars * 3);
            const starCol = new Float32Array(maxStars * 3);
            const starSize = new Float32Array(maxStars);
            for (let i = 0; i < maxStars; i++) { starCol[i*3+0]=0.82; starCol[i*3+1]=0.9; starCol[i*3+2]=1.0; starSize[i]=1.6; }
            starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
            starGeom.setAttribute("aColor",   new THREE.BufferAttribute(starCol, 3));
            starGeom.setAttribute("aSize",    new THREE.BufferAttribute(starSize, 1));
            starGeom.setDrawRange(0, 0);
            const starMat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
            const starPoints = new THREE.Points(starGeom, starMat);
            starPoints.frustumCulled = false;
            scene.add(starPoints);

            // Civs
            const civGeom = new THREE.BufferGeometry();
            const civPos = new Float32Array(maxCivs * 3);
            const civCol = new Float32Array(maxCivs * 3);
            const civSize = new Float32Array(maxCivs);
            civGeom.setAttribute("position", new THREE.BufferAttribute(civPos, 3));
            civGeom.setAttribute("aColor",   new THREE.BufferAttribute(civCol, 3));
            civGeom.setAttribute("aSize",    new THREE.BufferAttribute(civSize, 1));
            civGeom.setDrawRange(0, 0);
            const civMat = new THREE.ShaderMaterial({ uniforms: civUniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
            const civPoints = new THREE.Points(civGeom, civMat);
            civPoints.frustumCulled = false;
            scene.add(civPoints);
            threeRefs.current.civPoints = civPoints;

            // Halos
            const haloGeom = new THREE.BufferGeometry();
            const haloPos = new Float32Array(maxCivs * 3);
            const haloCol = new Float32Array(maxCivs * 3);
            const haloSize = new Float32Array(maxCivs);
            for (let i = 0; i < maxCivs; i++) { haloCol[i*3+0]=0.44; haloCol[i*3+1]=0.89; haloCol[i*3+2]=1.0; }
            haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
            haloGeom.setAttribute("aColor",   new THREE.BufferAttribute(haloCol, 3));
            haloGeom.setAttribute("aSize",    new THREE.BufferAttribute(haloSize, 1));
            haloGeom.setDrawRange(0, 0);
            const haloMat = new THREE.ShaderMaterial({ uniforms: civUniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
            const haloPoints = new THREE.Points(haloGeom, haloMat);
            haloPoints.frustumCulled = false;
            scene.add(haloPoints);

            // Guide beacons (visible when < 3 civs alive)
            const beaconGeom = new THREE.BufferGeometry();
            const beaconPos = new Float32Array(GUIDE_BEACONS * 3);
            const beaconCol = new Float32Array(GUIDE_BEACONS * 3);
            const beaconSize = new Float32Array(GUIDE_BEACONS);
            for (let i=0;i<GUIDE_BEACONS;i++){ beaconCol[i*3+0]=1.0; beaconCol[i*3+1]=0.84; beaconCol[i*3+2]=0.25; beaconSize[i]=8.0; }
            beaconGeom.setAttribute("position", new THREE.BufferAttribute(beaconPos, 3));
            beaconGeom.setAttribute("aColor",   new THREE.BufferAttribute(beaconCol, 3));
            beaconGeom.setAttribute("aSize",    new THREE.BufferAttribute(beaconSize, 1));
            beaconGeom.setDrawRange(0, 0);
            const beaconMat = new THREE.ShaderMaterial({ uniforms: civUniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
            const beacons = new THREE.Points(beaconGeom, beaconMat);
            beacons.frustumCulled = false;
            scene.add(beacons);
            threeRefs.current.beacons = beacons;

            // palette
            const colSilent = [0.60, 0.65, 1.00];
            const colBroad  = [1.00, 0.82, 0.40];
            const colCaut   = [0.32, 1.00, 0.66];
            const colPree   = [1.00, 0.42, 0.42];

            // warm-up + initial stars
            if (typeof (engine as any).stepN === "function") (engine as any).stepN(90);
            for (let i = 0; i < E.starCount; i++) {
              const s = E.getStar(i);
              starPos[i*3+0]=s[0]; starPos[i*3+1]=s[1]; starPos[i*3+2]=s[2];
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
            if ((rs <= 0) && starGeom.boundingSphere) {
              const bs = starGeom.boundingSphere;
              lookAt.current.copy(bs.center); cam.current.dist = Math.max(20, Math.min(300, bs.radius * 1.8));
            } else if (rs > 0) {
              cam.current.dist = Math.max(20, rs * 2.0);
            }

            // loop
            let last = Date.now(), ema = 60;
            const loop = () => {
              const now = Date.now();
              const dt = Math.min(0.05, (now - last) / 1000);
              last = now;

              E.step(dt);
              ensureSeed(engine);

              // pulse
              if (focusedIdx.current != null) {
                focusPulse.current += dt * 2.0;
                if (focusPulse.current > Math.PI * 2) focusPulse.current -= Math.PI * 2;
              }

              // focus tween
              if (focusTween.current.active) {
                focusTween.current.t = Math.min(1, focusTween.current.t + dt * 2.5);
                const t = focusTween.current.t;
                lookAt.current.lerpVectors(focusTween.current.from, focusTween.current.to, t);
                cam.current.dist += (focusTween.current.dist - cam.current.dist) * 0.25;
                if (t >= 1 - 1e-3) focusTween.current.active = false;
              }

              // analog sticks
              cam.current.yaw += stickL.current.x * dt * 1.5;
              cam.current.pitch = Math.max(
                -Math.PI / 2 + 0.02,
                Math.min(Math.PI / 2 - 0.02, cam.current.pitch + stickL.current.y * dt * 1.5)
              );
              cam.current.dist = Math.max(
                5,
                Math.min(CAMERA_FAR, cam.current.dist - stickR.current.y * dt * 40)
              );

              // camera from spherical
              const { yaw, pitch, dist } = cam.current;
              const cx = lookAt.current.x + dist * Math.cos(pitch) * Math.cos(yaw);
              const cy = lookAt.current.y + dist * Math.sin(pitch);
              const cz = lookAt.current.z + dist * Math.cos(pitch) * Math.sin(yaw);
              camera.fov = (cam.current.fov * 180) / Math.PI;
              camera.updateProjectionMatrix();
              camera.position.set(cx, cy, cz);
              camera.lookAt(lookAt.current);
              if (threeRefs.current.bgGroup) {
                threeRefs.current.bgGroup.position.copy(camera.position).multiplyScalar(0.02);
              }

              // stars expanding
              if (E.starCount > lastStarCount) {
                for (let i = lastStarCount; i < E.starCount; i++) {
                  const s = E.getStar(i);
                  starPos[i*3+0]=s[0]; starPos[i*3+1]=s[1]; starPos[i*3+2]=s[2];
                }
                markNeedsUpdate(starGeom, "position");
                starGeom.setDrawRange(0, E.starCount);
                starGeom.computeBoundingSphere();
                lastStarCount = E.starCount;
              }

              // civs + halos
              let ci = 0, hi = 0, aliveCnt = 0;
              for (let i = 0; i < E.civCount; i++) {
                if (!E.isCivAlive(i)) continue;
                aliveCnt++;
                const p = E.getCivPos(i);
                civPos[ci*3+0]=p[0]; civPos[ci*3+1]=p[1]; civPos[ci*3+2]=p[2];

                const strat = E.getCivStrat(i);
                const c =
                  strat === 0 ? colSilent :
                  strat === 1 ? colBroad  :
                  strat === 2 ? colCaut   : colPree;
                civCol[ci*3+0]=c[0]; civCol[ci*3+1]=c[1]; civCol[ci*3+2]=c[2];

                let sz = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2);
                if (focusedIdx.current === i) {
                  const pulse = 0.5 + 0.5 * Math.sin(focusPulse.current);
                  sz += 4.0 * pulse;
                  civCol[ci*3+0] = 1.0; civCol[ci*3+1] = 0.9; civCol[ci*3+2] = 0.6; // gold tint
                }
                civSize[ci] = sz;

                civIndexMap[ci] = i; ci++;

                if (E.isCivRevealed(i)) {
                  haloPos[hi*3+0]=p[0]; haloPos[hi*3+1]=p[1]; haloPos[hi*3+2]=p[2];
                  haloSize[hi] = (2.0 + Math.min(4.0, E.getCivTech(i) * 1.2)) + 4.0;
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

              // off-screen edge pointer to nearest civ
              let nearestIdx = -1; let bestD2 = Infinity; const cx2 = camera.position.x, cy2 = camera.position.y, cz2 = camera.position.z;
              for (let i = 0; i < E.civCount; i++) {
                if (!E.isCivAlive(i)) continue;
                const p = E.getCivPos(i);
                const dx = p[0]-cx2, dy = p[1]-cy2, dz = p[2]-cz2;
                const d2 = dx*dx + dy*dy + dz*dz;
                if (d2 < bestD2) { bestD2 = d2; nearestIdx = i; }
              }
              let showPtr = false, px = 0, py = 0, angleDeg = 0;
              if (nearestIdx >= 0) {
                const p = E.getCivPos(nearestIdx);
                const v = new THREE.Vector3(p[0], p[1], p[2]).project(camera);
                const { w, h } = viewSize.current;
                const ndcX = v.x, ndcY = v.y;
                const onScreen = ndcX > -1 && ndcX < 1 && ndcY > -1 && ndcY < 1 && v.z > -1 && v.z < 1;
                if (!onScreen) {
                  const m = 22 / Math.min(w, h);
                  let x = ndcX, y = ndcY;
                  if (v.z > 1) { x = -x; y = -y; }
                  const t = Math.max(Math.abs(x)/(1-m), Math.abs(y)/(1-m));
                  const ex = (x / t) * (1-m), ey = (y / t) * (1-m);
                  px = ((ex + 1) * 0.5) * w;
                  py = ((-ey + 1) * 0.5) * h;
                  angleDeg = Math.atan2(ey, ex) * 180 / Math.PI;
                  showPtr = true;
                }
              }
              pointerRef.current = { show: showPtr, x: px, y: py, angleDeg };

              // guide beacons if scene is too empty
              const bGeom = threeRefs.current.beacons!.geometry as THREE.BufferGeometry;
              const bPos = (bGeom.getAttribute("position") as THREE.BufferAttribute).array as Float32Array;
              let bCount = 0;
              if (aliveCnt < 3) {
                const baseR = Math.max(8, ((engine as any).radius ?? 20) * 0.6);
                for (let i=0; i<GUIDE_BEACONS; i++) {
                  const a = (i / GUIDE_BEACONS) * Math.PI * 2;
                  const r = baseR * (0.8 + 0.3 * Math.sin(i*2.1));
                  const x = r * Math.cos(a), z = r * Math.sin(a);
                  bPos[i*3+0] = x; bPos[i*3+1] = 0; bPos[i*3+2] = z;
                  bCount++;
                }
              }
              if (bCount>0) { markNeedsUpdate(bGeom, "position"); bGeom.setDrawRange(0, bCount); }
              else { bGeom.setDrawRange(0, 0); }

              // overlays (throttle)
              overlay.current.cam = { x: camera.position.x, y: camera.position.y, z: camera.position.z, yaw: cam.current.yaw, pitch: cam.current.pitch, dist };
              const tNow = Date.now();
              if (tNow - overlay.current.lastUpdate > 100) {
                overlay.current.civ = sampleCivs(engine, 800);
                overlay.current.lastUpdate = tNow;
              }

              renderer.render(scene, camera);
              gl.endFrameEXP();

              const fps = 1000 / Math.max(16, Date.now() - now);
              ema = ema * 0.9 + fps * 0.1; onFps?.(Math.round(ema));
              requestAnimationFrame(loop);
            };
            loop();
          }}
        />

        {/* Overlays */}
        <Vignette opacity={0.5} />
        <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
          <Compass yaw={overlay.current.cam.yaw} pitch={overlay.current.cam.pitch} />
          <MiniMap
            radius={(engine as any).radius ?? 100}
            cameraPos={{ x: overlay.current.cam.x, z: overlay.current.cam.z, yaw: overlay.current.cam.yaw }}
            civXY={overlay.current.civ}
            onSelect={(x, z) => jumpToWorldXY(x, z)}
          />
        </View>
        <CoordsHUD cam={overlay.current.cam} radius={(engine as any).radius} />
        <EdgePointer show={pointerUI.show} x={pointerUI.x} y={pointerUI.y} angleDeg={pointerUI.angleDeg} />
        <AnalogStick
          onChange={(x, y) => {
            stickL.current = { x, y };
          }}
          style={{ position: 'absolute', left: 12, bottom: 80 }}
        />
        <AnalogStick
          onChange={(x, y) => {
            stickR.current = { x, y };
          }}
          style={{ position: 'absolute', right: 12, bottom: 80 }}
        />
      </View>
    </GestureDetector>
  );
});

