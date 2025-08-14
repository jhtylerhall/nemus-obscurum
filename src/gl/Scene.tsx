// src/gl/Scene.tsx
import React, { useEffect, useRef, useImperativeHandle } from "react";
import { View, PixelRatio, LayoutChangeEvent } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import {
  PanGestureHandler,
  PinchGestureHandler,
  TapGestureHandler,
} from "react-native-gesture-handler";

// ---------------- Debug toggles ----------------
const DEBUG_USE_BUILTIN_POINTS = true;   // bigger, simple PointsMaterial for sanity
const DEBUG_SHOW_AXES = true;            // axes helper at origin
const DEBUG_SHOW_TEST_CUBE = true;       // small wireframe cube at origin
const DEBUG_AUTOFIT_CAMERA = true;       // fit camera to star cloud on boot

// -------------- Small helpers ------------------
function markNeedsUpdate(geom: THREE.BufferGeometry, key: string) {
  const attr = geom.getAttribute(key) as
    | THREE.BufferAttribute
    | THREE.InterleavedBufferAttribute
    | undefined;
  if (attr && "needsUpdate" in attr) {
    // @ts-ignore: InterleavedBufferAttribute accepts this at runtime
    attr.needsUpdate = true;
  }
}

type MaybeArr = Float32Array | Uint8Array | Int32Array | number[] | undefined;
const num = (a: MaybeArr, i: number, def = 0) => (a ? Number((a as any)[i] ?? def) : def);
const pick = <T extends MaybeArr>(...c: T[]): T | undefined => { for (const x of c) if (x != null) return x; return undefined; };
const pickNum = (...c: any[]) => { for (const x of c) if (typeof x === "number") return x as number; return 0; };

// -------------- Engine adapter -----------------
// supports either per-axis arrays or interleaved starPos [x,y,z,...]
function getStarAccessor(raw: any) {
  const sx = pick(raw.sx, raw.starX, raw.starsX);
  const sy = pick(raw.sy, raw.starY, raw.starsY);
  const sz = pick(raw.sz, raw.starZ, raw.starsZ);
  const sPos = pick(raw.sPos, raw.starPos, raw.starsPos, raw.starPositions);
  let starCount = pickNum(raw.starCount, raw.starsCount);
  if (!starCount) {
    if (sPos && (sPos as any).length % 3 === 0) starCount = (sPos as any).length / 3;
    else starCount = Math.min(sx?.length ?? 0, sy?.length ?? 0, sz?.length ?? 0);
  }
  if (sPos && (sPos as any).length >= starCount * 3) {
    return {
      starCount,
      get: (i: number) => [
        num(sPos, i * 3 + 0),
        num(sPos, i * 3 + 1),
        num(sPos, i * 3 + 2),
      ] as [number, number, number],
    };
  }
  return {
    starCount,
    get: (i: number) => [num(sx, i), num(sy, i), num(sz, i)] as [number, number, number],
  };
}

// supports either per-axis arrays or interleaved civPos [x,y,z,...]
function getCivAccessor(raw: any) {
  const cx = pick(raw.cx, raw.civX, raw.x);
  const cy = pick(raw.cy, raw.civY, raw.y);
  const cz = pick(raw.cz, raw.civZ, raw.z);
  const cPos = pick(raw.cPos, raw.civPos, raw.cPositions);
  const cAlive = pick(raw.cAlive, raw.civAlive, raw.alive);
  const cStrat = pick(raw.cStrat, raw.civStrat, raw.strat);
  const cTech  = pick(raw.cT, raw.civTech, raw.tech);
  const cRev   = pick(raw.cRevealed, raw.civRevealed, raw.revealed);

  let civCount = pickNum(raw.civCount);
  if (!civCount) {
    if (cPos && (cPos as any).length % 3 === 0) civCount = (cPos as any).length / 3;
    else civCount = Math.min(cx?.length ?? 0, cy?.length ?? 0, cz?.length ?? 0);
  }

  const posGet =
    cPos
      ? (i: number) => [num(cPos, i * 3 + 0), num(cPos, i * 3 + 1), num(cPos, i * 3 + 2)] as [number, number, number]
      : (i: number) => [num(cx, i), num(cy, i), num(cz, i)] as [number, number, number];

  return {
    civCount,
    isAlive:   (i: number) => Boolean(num(cAlive, i)),
    pos:       posGet,
    strat:     (i: number) => Math.floor(num(cStrat, i)),
    tech:      (i: number) => num(cTech, i),
    revealed:  (i: number) => Boolean(num(cRev, i)),
  };
}

function adaptEngine(raw: any) {
  const stars = getStarAccessor(raw);
  const civ   = getCivAccessor(raw);

  // Prefer stepN(steps @ ~60Hz); else step(dt) or advance(dt)
  let acc = 0;
  const step = (dt: number) => {
    if (typeof raw.stepN === "function") {
      acc += dt;
      let steps = Math.floor(acc * 60);
      if (steps > 0) { raw.stepN(steps); acc -= steps / 60; }
    } else if (typeof raw.step === "function") {
      raw.step.length >= 1 ? raw.step(dt) : raw.step();
    } else if (typeof raw.advance === "function") {
      raw.advance(dt);
    }
  };

  if (__DEV__ && !("__logged" in raw)) {
    (raw as any).__logged = true;
    // @ts-ignore
    console.log("[Engine keys]", Object.keys(raw));
    console.log("[Counts]", { stars: stars.starCount, civs: civ.civCount });
    console.log("[First star]", stars.starCount ? stars.get(0) : null);
    console.log("[First civ]", civ.civCount ? civ.pos(0) : null, "alive=", civ.isAlive(0));
  }

  return {
    starCount: stars.starCount,
    civCount:  civ.civCount,
    step,
    getStar:         (i: number) => stars.get(i),
    isCivAlive:      (i: number) => civ.isAlive(i),
    getCivPos:       (i: number) => civ.pos(i),
    getCivStrat:     (i: number) => civ.strat(i),
    getCivTech:      (i: number) => civ.tech(i),
    isCivRevealed:   (i: number) => civ.revealed(i),
  };
}

// -------------- Public API (focus) --------------
export type GLSceneHandle = {
  focusCiv: (engineIndex: number) => void;
  focusRandom: () => void;
};

type Props = {
  engine: any;
  maxStars: number;
  maxCivs: number;
  onFps?: (fps: number) => void;
};

// ----------- Simple point-sprite shaders -----------
const VERT = `
attribute float aSize;
attribute vec3 aColor;
varying vec3 vColor;
void main(){
  vColor=aColor;
  vec4 mv=modelViewMatrix*vec4(position,1.0);
  float d=max(1.0,-mv.z);
  gl_PointSize=max(1.0,aSize*(300.0/d));
  gl_Position=projectionMatrix*mv;
}`;
const FRAG = `
precision mediump float;
varying vec3 vColor;
void main(){
  vec2 c=gl_PointCoord-vec2(0.5);
  float r=dot(c,c);
  float a=smoothstep(0.25,0.0,r);
  gl_FragColor=vec4(vColor,a);
}`;

export const GLScene = React.forwardRef<GLSceneHandle, Props>(function GLScene(
  { engine, maxStars, maxCivs, onFps },
  ref
) {
  const E = adaptEngine(engine);

  // camera (start farther out)
  const cam = useRef({ yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 });
  const panState = useRef({ x: 0, y: 0 });
  const pinchState = useRef({ scale: 1 });

  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSize.current.w = width;
    viewSize.current.h = height;
  };

  // focus animation
  const focusActive = useRef(false);
  const focusTarget = useRef(new THREE.Vector3());
  const focusDist = useRef(6);

  // Three refs
  const threeRefs = useRef<{
    camera?: THREE.PerspectiveCamera;
    civPoints?: THREE.Points;
    civIndexMap?: Int32Array;
    raycaster?: THREE.Raycaster;
  }>({});

  // Expose API
  useImperativeHandle(ref, () => ({
    focusCiv: (idx: number) => {
      if (idx < 0 || idx >= E.civCount || !E.isCivAlive(idx)) return;
      const [x, y, z] = E.getCivPos(idx);
      focusTarget.current.set(x, y, z);
      focusDist.current = Math.max(2.0, Math.min(120.0, new THREE.Vector3(x, y, z).length() * 1.8));
      focusActive.current = true;
    },
    focusRandom: () => {
      let tries = 200;
      while (tries--) {
        const r = Math.floor(Math.random() * E.civCount);
        if (E.isCivAlive(r)) { (ref as any)?.current?.focusCiv(r); return; }
      }
      for (let i = 0; i < E.civCount; i++) if (E.isCivAlive(i)) { (ref as any)?.current?.focusCiv(i); return; }
    },
  }), [engine]);

  useEffect(() => {
    cam.current = { yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 };
  }, [engine]);

  // gestures
  const onPan = (e: any) => {
    const { translationX, translationY } = e.nativeEvent;
    const dx = translationX - panState.current.x;
    const dy = translationY - panState.current.y;
    panState.current = { x: translationX, y: translationY };
    const k = 0.002;
    cam.current.yaw += dx * k;
    cam.current.pitch -= dy * k;
    cam.current.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, cam.current.pitch));
    focusActive.current = false;
  };
  const onPanEnd = () => { panState.current = { x: 0, y: 0 }; };
  const onPinch = (e: any) => {
    const { scale } = e.nativeEvent;
    const factor = scale / (pinchState.current.scale || 1);
    pinchState.current.scale = scale;
    const nfov = cam.current.fov / factor;
    cam.current.fov = Math.max((20 * Math.PI) / 180, Math.min((100 * Math.PI) / 180, nfov));
    focusActive.current = false;
  };
  const onPinchEnd = () => { pinchState.current.scale = 1; };

  // tap → raycast → focus
  const onTap = (e: any) => {
    const { x, y } = e.nativeEvent;
    const cam3 = threeRefs.current.camera;
    const pts = threeRefs.current.civPoints;
    const ray = threeRefs.current.raycaster;
    const map = threeRefs.current.civIndexMap;
    if (!cam3 || !pts || !ray || !map) return;

    const { w, h } = viewSize.current;
    const ndc = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);
    ray.setFromCamera(ndc, cam3);
    (ray.params as any).Points = { threshold: 0.12 };
    const hits = ray.intersectObject(pts, false);
    if (hits.length) {
      const idx = (hits[0] as any).index ?? -1;
      if (idx >= 0) {
        const engineIdx = map[idx];
        if (engineIdx >= 0) (ref as any)?.current?.focusCiv(engineIdx);
      }
    }
  };

  return (
    <PanGestureHandler onGestureEvent={onPan} onHandlerStateChange={onPanEnd}>
      <PinchGestureHandler onGestureEvent={onPinch} onHandlerStateChange={onPinchEnd}>
        <TapGestureHandler numberOfTaps={1} maxDeltaX={16} maxDeltaY={16} onActivated={onTap}>
          <View style={{ flex: 1 }} onLayout={onLayout}>
            <GLView
              style={{ flex: 1 }}
              onContextCreate={(gl) => {
                // canvas-like stub + attributes polyfill (Hermes-safe)
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
                    alpha: true, depth: true, stencil: false, antialias: false,
                    premultipliedAlpha: false, preserveDrawingBuffer: false,
                    powerPreference: "high-performance", failIfMajorPerformanceCaveat: false, xrCompatible: false,
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
                  // @ts-expect-error runtime only
                  contextAttributes: (gl as any).getContextAttributes(),
                });
                const pr = PixelRatio.get();
                renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
                renderer.setPixelRatio(pr);

                const scene = new THREE.Scene();
                scene.background = new THREE.Color("#0b1020");

                const camera = new THREE.PerspectiveCamera(
                  60,
                  gl.drawingBufferWidth / gl.drawingBufferHeight,
                  0.05,
                  5000 // far plane
                );
                camera.position.set(0, 0, cam.current.dist);
                threeRefs.current.camera = camera;
                threeRefs.current.raycaster = new THREE.Raycaster();

                if (DEBUG_SHOW_AXES) scene.add(new THREE.AxesHelper(3));
                if (DEBUG_SHOW_TEST_CUBE) {
                  const cube = new THREE.Mesh(
                    new THREE.BoxGeometry(0.3, 0.3, 0.3),
                    new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true })
                  );
                  scene.add(cube);
                }

                // ===== Buffer Geometries =====
                // Stars
                const starGeom = new THREE.BufferGeometry();
                const starPos = new Float32Array(maxStars * 3);
                const starCol = new Float32Array(maxStars * 3);
                const starSize = new Float32Array(maxStars);
                for (let i = 0; i < maxStars; i++) {
                  starCol[i * 3 + 0] = 0.82; starCol[i * 3 + 1] = 0.9; starCol[i * 3 + 2] = 1.0;
                  starSize[i] = 2.5;
                }
                starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
                starGeom.setAttribute("aColor",   new THREE.BufferAttribute(starCol, 3));
                starGeom.setAttribute("aSize",    new THREE.BufferAttribute(starSize, 1));
                starGeom.setDrawRange(0, 0);
                const starMat = DEBUG_USE_BUILTIN_POINTS
                  ? new THREE.PointsMaterial({ size: 6, sizeAttenuation: true, vertexColors: true })
                  : new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
                if (DEBUG_USE_BUILTIN_POINTS) {
                  starGeom.deleteAttribute?.("aColor");
                  starGeom.setAttribute("color", new THREE.BufferAttribute(starCol, 3));
                }
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
                const civMat = DEBUG_USE_BUILTIN_POINTS
                  ? new THREE.PointsMaterial({ size: 8, sizeAttenuation: true, vertexColors: true })
                  : new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
                if (DEBUG_USE_BUILTIN_POINTS) {
                  civGeom.deleteAttribute?.("aColor");
                  civGeom.setAttribute("color", new THREE.BufferAttribute(civCol, 3));
                }
                const civPoints = new THREE.Points(civGeom, civMat);
                civPoints.frustumCulled = false;
                scene.add(civPoints);
                threeRefs.current.civPoints = civPoints;

                // Halos
                const haloGeom = new THREE.BufferGeometry();
                const haloPos = new Float32Array(maxCivs * 3);
                const haloCol = new Float32Array(maxCivs * 3);
                const haloSize = new Float32Array(maxCivs);
                for (let i = 0; i < maxCivs; i++) { haloCol[i * 3 + 0] = 0.44; haloCol[i * 3 + 1] = 0.89; haloCol[i * 3 + 2] = 1.0; }
                haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
                haloGeom.setAttribute("aColor",   new THREE.BufferAttribute(haloCol, 3));
                haloGeom.setAttribute("aSize",    new THREE.BufferAttribute(haloSize, 1));
                haloGeom.setDrawRange(0, 0);
                const haloMat = new THREE.ShaderMaterial({
                  vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
                });
                const haloPoints = new THREE.Points(haloGeom, haloMat);
                haloPoints.frustumCulled = false;
                scene.add(haloPoints);

                const colSilent = [0.60, 0.65, 1.00];
                const colBroad  = [1.00, 0.82, 0.40];
                const colCaut   = [0.32, 1.00, 0.66];
                const colPree   = [1.00, 0.42, 0.42];

                // ---- PREWARM: advance so positions aren't [0,0,0] ----
                if (typeof (engine as any).stepN === "function") {
                  (engine as any).stepN(120); // ~2s at 60Hz; adjust if too much
                } else if (typeof (engine as any).step === "function") {
                  (engine as any).step(0.033);
                }

                // ---- Initial stars upload + optional auto-fit ----
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

                if (DEBUG_AUTOFIT_CAMERA && E.starCount > 0 && starGeom.boundingSphere) {
                  const r = starGeom.boundingSphere.radius || 20;
                  const fit = Math.max(20, r * 2.2);
                  cam.current.dist = fit;
                  camera.position.set(fit, 0, 0);
                  camera.lookAt(0, 0, 0);
                  // @ts-ignore
                  console.log("[AutoFit]", { radius: r, dist: fit });
                }

                // index map: visible civ buffer index -> engine index
                const civIndexMap = new Int32Array(maxCivs);
                civIndexMap.fill(-1);
                threeRefs.current.civIndexMap = civIndexMap;

                // ----- Frame loop -----
                let last = Date.now();
                let ema = 60;

                const loop = () => {
                  const now = Date.now();
                  const dt = Math.min(0.05, (now - last) / 1000);
                  last = now;

                  E.step(dt); // uses stepN under-the-hood if present

                  // camera (+ optional focus easing)
                  camera.fov = (cam.current.fov * 180) / Math.PI;
                  camera.updateProjectionMatrix();
                  const { yaw, pitch, dist } = cam.current;
                  camera.position.set(
                    dist * Math.cos(pitch) * Math.cos(yaw),
                    dist * Math.sin(pitch),
                    dist * Math.cos(pitch) * Math.sin(yaw)
                  );
                  camera.lookAt(0, 0, 0);

                  // stars: append if count grows
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

                  // civs/halos
                  let ci = 0, hi = 0;
                  for (let i = 0; i < E.civCount; i++) {
                    if (!E.isCivAlive(i)) continue;

                    const p = E.getCivPos(i);
                    civPos[ci * 3 + 0] = p[0];
                    civPos[ci * 3 + 1] = p[1];
                    civPos[ci * 3 + 2] = p[2];

                    const strat = E.getCivStrat(i);
                    const c =
                      strat === 0 ? colSilent :
                      strat === 1 ? colBroad  :
                      strat === 2 ? colCaut   : colPree;

                    civCol[ci * 3 + 0] = c[0];
                    civCol[ci * 3 + 1] = c[1];
                    civCol[ci * 3 + 2] = c[2];
                    civSize[ci] = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2);

                    civIndexMap[ci] = i; // buffer index -> engine index
                    ci++;

                    if (E.isCivRevealed(i)) {
                      haloPos[hi * 3 + 0] = p[0];
                      haloPos[hi * 3 + 1] = p[1];
                      haloPos[hi * 3 + 2] = p[2];
                      haloSize[hi] = (2.0 + Math.min(4.0, E.getCivTech(i) * 1.2)) + 4.0;
                      hi++;
                    }
                  }
                  markNeedsUpdate(civGeom, "position");
                  markNeedsUpdate(civGeom, DEBUG_USE_BUILTIN_POINTS ? "color" : "aColor");
                  markNeedsUpdate(civGeom, "aSize");
                  civGeom.setDrawRange(0, ci);
                  civGeom.computeBoundingSphere();

                  markNeedsUpdate(haloGeom, "position");
                  markNeedsUpdate(haloGeom, "aSize");
                  haloGeom.setDrawRange(0, hi);
                  haloGeom.computeBoundingSphere();

                  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
                  renderer.setPixelRatio(pr);
                  renderer.render(scene, camera);
                  gl.endFrameEXP();

                  const fps = 1000 / Math.max(16, Date.now() - now);
                  ema = ema * 0.9 + fps * 0.1;
                  onFps?.(Math.round(ema));

                  requestAnimationFrame(loop);
                };

                loop();
              }}
            />
          </View>
        </TapGestureHandler>
      </PinchGestureHandler>
    </PanGestureHandler>
  );
});
