// src/gl/Scene.tsx
import React, { useEffect, useRef, useImperativeHandle } from "react";
import { View, PixelRatio, LayoutChangeEvent } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { MiniMap } from "../ui/MiniMap";
import { Compass } from "../ui/Compass";
import { Vignette } from "../ui/Vignette";
import { adaptEngine, sampleCivs } from "./engineAdapter";
import { pickStrongest, pickFrontier, pickNearest, pickDensest } from "./poi";

// ---------- Settings ----------
const DEBUG_USE_BUILTIN_POINTS = false;
const CAMERA_FAR = 5000;

// ---------- helpers ----------
function markNeedsUpdate(geom: THREE.BufferGeometry, key: string) {
  const attr = geom.getAttribute(key) as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
  if (attr && "needsUpdate" in attr) {
    // @ts-ignore
    attr.needsUpdate = true;
  }
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

// ---------- background (complete) ----------
function seeded(seed: number) { let s = seed | 0; return () => ((s = (1664525 * s + 1013904223) | 0) >>> 0) / 4294967296; }

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
    p[i * 3 + 1] = r * cosPhi * 0.6; // galactic squish
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
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - cx) / R, dy = (y - cy) / R;
      const d = Math.sqrt(dx * dx + dy * dy);
      const fall = Math.max(0, 1 - d);
      const noise = 0.6 * rnd() + 0.4 * rnd();
      const a = Math.pow(fall, 1.5) * Math.pow(noise, 1.2);
      const i = (y * size + x) * 4;
      data[i + 0] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = Math.floor(255 * a);
    }
  }
  const tex = new THREE.DataTexture(data, size, size);
  tex.needsUpdate = true;
  const mat = new THREE.SpriteMaterial({
    map: tex, color: new THREE.Color(tint),
    opacity: 0.45, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(R * 8);
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

type Props = {
  engine: any;
  maxStars: number;
  maxCivs: number;
  onFps?: (fps: number) => void;
};

export const GLScene = React.forwardRef<GLSceneHandle, Props>(function GLScene(
  { engine, maxStars, maxCivs, onFps },
  ref
) {
  const E = adaptEngine(engine);

  // camera orbiting a target
  const cam = useRef({ yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 });
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const focusTween = useRef({ active: false, t: 0, from: new THREE.Vector3(), to: new THREE.Vector3(), dist: 20 });

  // renderer sizing
  const rendererOnLayout = useRef<{ renderer: THREE.WebGLRenderer; pr: number } | null>(null);
  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSize.current.w = width; viewSize.current.h = height;
    const r = rendererOnLayout.current;
    if (r?.renderer) {
      r.renderer.setSize(Math.max(1, Math.floor(width * r.pr)), Math.max(1, Math.floor(height * r.pr)), false);
    }
  };

  // picking
  const threeRefs = useRef<{ camera?: THREE.PerspectiveCamera; civPoints?: THREE.Points; civIndexMap?: Int32Array; raycaster?: THREE.Raycaster; bgStars?: THREE.Points; nebulas?: THREE.Sprite[]; }>({});

  // overlay refs (throttled)
  const overlay = useRef({ civ: [] as [number, number][], lastUpdate: 0, cam: { x: 0, z: 0, yaw: 0, pitch: 0 } });

  // gestures (Pan/Pinch/Tap)
  const panPrev = useRef({ tx: 0, ty: 0 });
  const panGesture = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => { focusTween.current.active = false; panPrev.current.tx = 0; panPrev.current.ty = 0; })
    .onUpdate((e) => {
      const dx = e.translationX - panPrev.current.tx;
      const dy = e.translationY - panPrev.current.ty;
      panPrev.current.tx = e.translationX; panPrev.current.ty = e.translationY;
      const k = 0.002;
      cam.current.yaw += dx * k;
      cam.current.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, cam.current.pitch - dy * k));
    })
    .onEnd(() => { panPrev.current.tx = 0; panPrev.current.ty = 0; });

  const pinchScaleLast = useRef(1);
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => { pinchScaleLast.current = 1; focusTween.current.active = false; })
    .onUpdate((e) => {
      const factor = e.scale / (pinchScaleLast.current || 1);
      pinchScaleLast.current = e.scale;
      const nfov = cam.current.fov / factor;
      cam.current.fov = Math.max((20 * Math.PI) / 180, Math.min((100 * Math.PI) / 180, nfov));
    })
    .onEnd(() => { pinchScaleLast.current = 1; });

  const tapGesture = Gesture.Tap()
    .numberOfTaps(1).maxDeltaX(16).maxDeltaY(16).runOnJS(true)
    .onEnd((e, ok) => {
      if (!ok) return;
      const { camera, civPoints, raycaster, civIndexMap } = threeRefs.current;
      if (!camera || !civPoints || !raycaster || !civIndexMap) return;
      const { w, h } = viewSize.current;
      const ndc = new THREE.Vector2((e.x / w) * 2 - 1, -(e.y / h) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      (raycaster.params as any).Points = { threshold: 0.12 * PixelRatio.get() };
      const hits = raycaster.intersectObject(civPoints, false);
      if (!hits.length) return;
      const idx = (hits[0] as any).index ?? -1;
      if (idx < 0) return;
      const engineIdx = civIndexMap[idx];
      if (engineIdx >= 0) focusCiv(engineIdx);
    });
  const gestures = Gesture.Simultaneous(pinchGesture, panGesture, tapGesture);

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
    const d = Math.max(8, Math.min(160, target.length() * 1.6));
    startFocusTo(target, d);
  }
  function home() {
    const r = (engine as any).radius ?? 20;
    startFocusTo(new THREE.Vector3(0, 0, 0), Math.max(20, r * 2.2));
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
    const d = Math.max(8, Math.min(160, target.length() * 1.6));
    startFocusTo(target, d);
  }

  // expose API
  useImperativeHandle(ref, () => ({
    focusCiv, focusRandom: () => { let t=200; while (t--) { const r = (Math.random() * E.civCount) | 0; if (E.isCivAlive(r)) { focusCiv(r); return; } } },
    home, focusStrongest, focusFrontier, focusDensest, focusNearest, jumpToWorldXY,
  }), [engine]);

  useEffect(() => {
    cam.current = { yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 };
    lookAt.current.set(0, 0, 0);
  }, [engine]);

  return (
    <GestureDetector gesture={gestures}>
      <View style={{ flex: 1, position: 'relative', borderWidth: 2, borderColor: '#112b11' }} onLayout={onLayout}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            const canvas: any = {
              width: gl.drawingBufferWidth,
              height: gl.drawingBufferHeight,
              style: {},
              clientWidth: gl.drawingBufferWidth,
              clientHeight: gl.drawingBufferHeight,
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
            scene.background = new THREE.Color("#0b1020");

            const camera = new THREE.PerspectiveCamera(
              60, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.05, CAMERA_FAR
            );
            camera.position.set(0, 0, cam.current.dist);
            threeRefs.current.camera = camera;
            threeRefs.current.raycaster = new THREE.Raycaster();

            // cinematic background
            const R = ((engine as any).radius ?? 50) * 30;
            const bgStars = makeOuterStars(3000, R);
            scene.add(bgStars);
            const nebA = makeNebulaSprite(256, "#6cc3ff", 1);
            const nebB = makeNebulaSprite(256, "#f48fb1", 2);
            const nebC = makeNebulaSprite(256, "#88f7c5", 3);
            nebA.position.set(-R * 0.4,  R * 0.15, -R * 0.6);
            nebB.position.set( R * 0.6, -R * 0.25,  R * 0.2);
            nebC.position.set(-R * 0.2, -R * 0.3,   R * 0.7);
            scene.add(nebA, nebB, nebC);
            threeRefs.current.bgStars = bgStars;
            threeRefs.current.nebulas = [nebA, nebB, nebC];

            // === engine-driven point clouds ===
            const uniforms = { uPR: { value: pr }, uScale: { value: 140.0 }, uMaxSize: { value: 18.0 * pr } };

            // Stars
            const starGeom = new THREE.BufferGeometry();
            const starPos = new Float32Array(maxStars * 3);
            const starCol = new Float32Array(maxStars * 3);
            const starSize = new Float32Array(maxStars);
            for (let i = 0; i < maxStars; i++) {
              starCol[i * 3 + 0] = 0.82; starCol[i * 3 + 1] = 0.9; starCol[i * 3 + 2] = 1.0;
              starSize[i] = 1.2;
            }
            starGeom.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
            starGeom.setAttribute("aColor",   new THREE.BufferAttribute(starCol, 3));
            starGeom.setAttribute("aSize",    new THREE.BufferAttribute(starSize, 1));
            starGeom.setDrawRange(0, 0);
            const starMat = DEBUG_USE_BUILTIN_POINTS
              ? new THREE.PointsMaterial({ size: 6, sizeAttenuation: true, vertexColors: true })
              : new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
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
              : new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
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
            for (let i = 0; i < maxCivs; i++) {
              haloCol[i * 3 + 0] = 0.44; haloCol[i * 3 + 1] = 0.89; haloCol[i * 3 + 2] = 1.0;
            }
            haloGeom.setAttribute("position", new THREE.BufferAttribute(haloPos, 3));
            haloGeom.setAttribute("aColor",   new THREE.BufferAttribute(haloCol, 3));
            haloGeom.setAttribute("aSize",    new THREE.BufferAttribute(haloSize, 1));
            haloGeom.setDrawRange(0, 0);
            const haloMat = new THREE.ShaderMaterial({
              vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
              uniforms,
            });
            const haloPoints = new THREE.Points(haloGeom, haloMat);
            haloPoints.frustumCulled = false;
            scene.add(haloPoints);

            // colors
            const colSilent = [0.60, 0.65, 1.00];
            const colBroad  = [1.00, 0.82, 0.40];
            const colCaut   = [0.32, 1.00, 0.66];
            const colPree   = [1.00, 0.42, 0.42];

            // pre-warm engine & upload initial stars
            if (typeof (engine as any).stepN === "function") (engine as any).stepN(120);
            for (let i = 0; i < E.starCount; i++) {
              const s = E.getStar(i);
              starPos[i * 3 + 0] = s[0]; starPos[i * 3 + 1] = s[1]; starPos[i * 3 + 2] = s[2];
            }
            markNeedsUpdate(starGeom, "position");
            starGeom.setDrawRange(0, E.starCount);
            starGeom.computeBoundingSphere();
            let lastStarCount = E.starCount;

            // index map for picking
            const civIndexMap = new Int32Array(maxCivs);
            civIndexMap.fill(-1);
            threeRefs.current.civIndexMap = civIndexMap;

            // loop
            let last = Date.now(), ema = 60;
            const loop = () => {
              const now = Date.now();
              const dt = Math.min(0.05, (now - last) / 1000);
              last = now;

              E.step(dt);

              // focus tween
              if (focusTween.current.active) {
                focusTween.current.t = Math.min(1, focusTween.current.t + dt * 2.5); // ~0.4s
                const t = focusTween.current.t;
                lookAt.current.lerpVectors(focusTween.current.from, focusTween.current.to, t);
                cam.current.dist += (focusTween.current.dist - cam.current.dist) * 0.25;
                if (t >= 1 - 1e-3) focusTween.current.active = false;
              }

              // camera position from spherical around lookAt
              const { yaw, pitch, dist } = cam.current;
              const cx = lookAt.current.x + dist * Math.cos(pitch) * Math.cos(yaw);
              const cy = lookAt.current.y + dist * Math.sin(pitch);
              const cz = lookAt.current.z + dist * Math.cos(pitch) * Math.sin(yaw);
              camera.fov = (cam.current.fov * 180) / Math.PI;
              camera.updateProjectionMatrix();
              camera.position.set(cx, cy, cz);
              camera.lookAt(lookAt.current);

              // parallax on nebulas (subtle)
              const nebs = threeRefs.current.nebulas || [];
              for (let i = 0; i < nebs.length; i++) {
                const s = 0.02 + i * 0.01;
                nebs[i].position.addScaledVector(camera.position, s * 0.0);
              }

              // expanding stars
              if (E.starCount > lastStarCount) {
                for (let i = lastStarCount; i < E.starCount; i++) {
                  const s = E.getStar(i);
                  starPos[i * 3 + 0] = s[0]; starPos[i * 3 + 1] = s[1]; starPos[i * 3 + 2] = s[2];
                }
                markNeedsUpdate(starGeom, "position");
                starGeom.setDrawRange(0, E.starCount);
                starGeom.computeBoundingSphere();
                lastStarCount = E.starCount;
              }

              // civs + halos
              let ci = 0, hi = 0;
              for (let i = 0; i < E.civCount; i++) {
                if (!E.isCivAlive(i)) continue;
                const p = E.getCivPos(i);
                civPos[ci * 3 + 0] = p[0]; civPos[ci * 3 + 1] = p[1]; civPos[ci * 3 + 2] = p[2];

                const strat = E.getCivStrat(i);
                const c =
                  strat === 0 ? colSilent :
                  strat === 1 ? colBroad  :
                  strat === 2 ? colCaut   : colPree;
                civCol[ci * 3 + 0] = c[0]; civCol[ci * 3 + 1] = c[1]; civCol[ci * 3 + 2] = c[2];
                civSize[ci] = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2);

                civIndexMap[ci] = i; ci++;

                if (E.isCivRevealed(i)) {
                  haloPos[hi * 3 + 0] = p[0]; haloPos[hi * 3 + 1] = p[1]; haloPos[hi * 3 + 2] = p[2];
                  haloSize[hi] = 2.0 + Math.min(4.0, E.getCivTech(i) * 1.2) + 4.0;
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

              // overlays: throttle
              overlay.current.cam = { x: camera.position.x, z: camera.position.z, yaw: cam.current.yaw, pitch: cam.current.pitch };
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
          }}
        />

        {/* Overlays */}
        <Vignette opacity={0.55} />
        <View style={{ position: 'absolute', top: 4, right: 4, flexDirection: 'row', gap: 4 }} pointerEvents="box-none">
          <Compass yaw={overlay.current.cam.yaw} pitch={overlay.current.cam.pitch} size={72} />
          <MiniMap
            radius={(engine as any).radius ?? 100}
            cameraPos={{ x: overlay.current.cam.x, z: overlay.current.cam.z, yaw: overlay.current.cam.yaw }}
            civXY={overlay.current.civ}
            size={100}
            onSelect={(x, z) => jumpToWorldXY(x, z)}
          />
        </View>
      </View>
    </GestureDetector>
  );
});
