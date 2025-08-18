// src/gl/Scene.tsx
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, PixelRatio, LayoutChangeEvent } from "react-native";
import { GLView } from "expo-gl";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import * as THREE from "three";
import { GestureDetector } from "react-native-gesture-handler";

import { MiniMap } from "../ui/MiniMap";
import { Vignette } from "../ui/Vignette";
import { CoordsHUD } from "../ui/CoordsHUD";
import { AnalogStick } from "../ui/AnalogStick";
import { pickStrongest, pickFrontier, pickNearest, pickDensest } from "./poi";
import { createCameraController } from "./cameraController";
import { initRenderer } from "./renderer3d";
import type { CameraState, RaycastRefs } from "./types";
import { createStarsMesh } from "./StarsMesh";
import { getWorld } from "../sim/world";

const DEBUG_FORCE_VISIBLE = __DEV__ && true; // set to false to disable

// Public API for parent components
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

type FocusTween = {
  active: boolean;
  t: number;
  from: THREE.Vector3;
  to: THREE.Vector3;
  dist: number;
};

export const GLScene = React.forwardRef<GLSceneHandle, Props>(function GLScene(
  { engine, maxStars, maxCivs, onFps },
  ref
) {
  const cam = useRef<CameraState>({
    yaw: Math.PI * 0.15,
    pitch: Math.PI * 0.12,
    dist: 20,
    fov: (60 * Math.PI) / 180,
  });
  const lookAt = useRef(new THREE.Vector3(0, 0, 0));
  const focusTween = useRef<FocusTween>({
    active: false,
    t: 0,
    from: new THREE.Vector3(),
    to: new THREE.Vector3(),
    dist: 20,
  });

  const rendererRef = useRef<{
    renderer: THREE.WebGLRenderer;
    pr: number;
  } | null>(null);
  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });

  // Debug refs and layout state for forced-visible scene
  const glDebugRef = useRef<ExpoWebGLRenderingContext | null>(null);
  const debugRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const debugCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width && height) {
      const w = Math.floor(width);
      const h = Math.floor(height);
      setVw(w);
      setVh(h);
      viewSize.current.w = width;
      viewSize.current.h = height;
      const r = rendererRef.current;
      if (r?.renderer) {
        r.renderer.setSize(
          Math.max(1, Math.floor(width * r.pr)),
          Math.max(1, Math.floor(height * r.pr)),
          false
        );
        // keep aspect/fov in sync
        if (threeRefs.current.camera) {
          threeRefs.current.camera.aspect = width / height;
          threeRefs.current.camera.updateProjectionMatrix();
        }
      }
    }
  };

  const threeRefs = useRef<
    RaycastRefs & {
      bgStars?: THREE.Points; // NEW: sim-driven star Points
      nebulas?: THREE.Sprite[];
      grid?: THREE.GridHelper;
      axes?: THREE.AxesHelper;
      beacons?: THREE.Points;
      scene?: THREE.Scene;
    }
  >({});

  const overlay = useRef({
    civ: [] as [number, number][],
    lastUpdate: 0,
    cam: { x: 0, y: 0, z: 0, yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 },
  });

  const stickL = useRef({ x: 0, y: 0 });
  const stickR = useRef({ x: 0, y: 0 });

  const rendererHandle = useRef<ReturnType<typeof initRenderer> | null>(null);

  const handleTap = useCallback((x: number, y: number) => {
    const { camera, civPoints, raycaster, civIndexMap } = threeRefs.current;
    if (!camera || !civPoints || !raycaster || !civIndexMap) return;
    const { w, h } = viewSize.current;
    const ndc = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    (raycaster.params as any).Points = { threshold: 0.14 * PixelRatio.get() };
    const hits = raycaster.intersectObject(civPoints, false);
    if (!hits.length) return;
    const idx = (hits[0] as any).index ?? -1;
    if (idx < 0) return;
    const engineIdx = civIndexMap[idx];
    if (engineIdx >= 0) rendererHandle.current?.focusCiv(engineIdx);
  }, []);

  const gesture = useMemo(
    () => createCameraController(cam, handleTap),
    [handleTap]
  );

  const jumpToWorldXY = useCallback((x: number, z: number) => {
    const d = Math.max(12, Math.min(200, Math.sqrt(x * x + z * z) * 1.8));
    rendererHandle.current?.focusPoint(x, 0, z, d);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      focusCiv: (i) => rendererHandle.current?.focusCiv(i),
      focusRandom: () => rendererHandle.current?.focusRandom(),
      home: () => {
        const r = (engine as any).radius ?? 50;
        const d = Math.max(20, r * 2.2);
        rendererHandle.current?.focusPoint(0, 0, 0, d);
      },
      focusStrongest: () => {
        const i = pickStrongest(engine);
        if (i >= 0) rendererHandle.current?.focusCiv(i);
      },
      focusFrontier: () => {
        const i = pickFrontier(engine);
        if (i >= 0) rendererHandle.current?.focusCiv(i);
      },
      focusDensest: () => {
        const i = pickDensest(engine);
        if (i >= 0) rendererHandle.current?.focusCiv(i);
      },
      focusNearest: () => {
        const {
          x = 0,
          y = 0,
          z = 0,
        } = threeRefs.current.camera?.position ?? {};
        const i = pickNearest(engine, { x, y, z });
        if (i >= 0) rendererHandle.current?.focusCiv(i);
      },
      jumpToWorldXY,
    }),
    [engine, jumpToWorldXY]
  );

  useEffect(() => {
    cam.current = {
      yaw: Math.PI * 0.15,
      pitch: Math.PI * 0.12,
      dist: 20,
      fov: (60 * Math.PI) / 180,
    };
    lookAt.current.set(0, 0, 0);
  }, [engine]);

  // When RN layout changes, keep debug renderer in sync
  useEffect(() => {
    const gl = glDebugRef.current;
    const renderer = debugRendererRef.current;
    const camera = debugCameraRef.current;
    if (!gl || !renderer || !camera || vw <= 0 || vh <= 0) return;

    const dpr = PixelRatio.get();
    const width = Math.max(1, Math.floor(vw * dpr));
    const height = Math.max(1, Math.floor(vh * dpr));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }, [vw, vh]);

  // NEW: ensure stars are created from the actual sim and added to the scene
  const ensureSimStars = useCallback(() => {
    const { scene, camera } = threeRefs.current;
    if (!scene || !camera) return;

    // avoid duplicates on hot reloads
    if (
      threeRefs.current.bgStars &&
      scene.children.includes(threeRefs.current.bgStars)
    ) {
      return;
    }

    // build (or get) the real world, then build a static Points cloud
    const starsPoints = createStarsMesh(PixelRatio.get());
    threeRefs.current.bgStars = starsPoints;
    scene.add(starsPoints);

    // sane camera + far clip for a big cluster
    camera.near = Math.min(camera.near, 0.1);
    camera.far = Math.max(camera.far, 1e9);
    camera.updateProjectionMatrix();

    // optional: set clear color to deep space
    rendererRef.current?.renderer.setClearColor(0x000006, 1);

    // place the camera so the real cluster is visible on boot
    const world = getWorld();
    // Prefer sim radius if engine exposes it, else approximate from params via world builder
    const radius = (engine as any).radius ?? 200_000;
    const dist = Math.max(20, radius * 2.2);
    // If the renderer has a focusPoint helper, keep using it so UI overlays/motion stay in sync
    rendererHandle.current?.focusPoint?.(0, 0, 0, dist);
  }, [engine]);

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, position: "relative" }} onLayout={onLayout}>
        {vw > 0 && vh > 0 && (
          <GLView
            style={{ flex: 1 }}
            onContextCreate={(gl) => {
              glDebugRef.current = gl;

              if (DEBUG_FORCE_VISIBLE) {
                // Use RN layout as ground truth; fall back to drawingBuffer if available
                const dpr = PixelRatio.get();
                const width =
                  gl.drawingBufferWidth || Math.max(1, Math.floor(vw * dpr));
                const height =
                  gl.drawingBufferHeight || Math.max(1, Math.floor(vh * dpr));

                // Provide "canvas" shim for three on RN
                const canvas: any = {
                  width,
                  height,
                  style: {},
                  clientWidth: width,
                  clientHeight: height,
                  addEventListener: () => {},
                  removeEventListener: () => {},
                  getContext: () => gl,
                };

                const renderer = new THREE.WebGLRenderer({
                  context: gl as any,
                  canvas,
                  alpha: false,
                  antialias: false,
                  premultipliedAlpha: false,
                  preserveDrawingBuffer: false,
                  powerPreference: "high-performance",
                  // @ts-expect-error RN/Expo specific
                  contextAttributes: (gl as any).getContextAttributes?.(),
                });
                renderer.setPixelRatio(dpr);
                renderer.setSize(width, height, false);
                renderer.setClearColor(0x0d1117, 1); // dark background
                debugRendererRef.current = renderer;

                const scene = new THREE.Scene();

                const camera = new THREE.PerspectiveCamera(
                  60,
                  width / Math.max(1, height),
                  0.1,
                  100000
                );
                camera.position.set(0, 0, 200);
                camera.lookAt(0, 0, 0);
                debugCameraRef.current = camera;

                // Debug primitives
                scene.add(new THREE.AxesHelper(100));
                scene.add(
                  new THREE.Mesh(
                    new THREE.BoxGeometry(50, 50, 50),
                    new THREE.MeshBasicMaterial({ color: 0xff3366 })
                  )
                );

                // Dense star field
                const N = 2000;
                const pos = new Float32Array(N * 3);
                for (let i = 0; i < N; i++) {
                  const r = 500 * Math.cbrt(Math.random());
                  const th = Math.acos(2 * Math.random() - 1);
                  const ph = 2 * Math.PI * Math.random();
                  pos[3 * i + 0] = r * Math.sin(th) * Math.cos(ph);
                  pos[3 * i + 1] = r * Math.sin(th) * Math.sin(ph);
                  pos[3 * i + 2] = r * Math.cos(th);
                }
                const geo = new THREE.BufferGeometry();
                geo.setAttribute(
                  "position",
                  new THREE.BufferAttribute(pos, 3)
                );
                const pts = new THREE.Points(
                  geo,
                  new THREE.PointsMaterial({
                    size: 8,
                    sizeAttenuation: false,
                    color: 0xffffff,
                    depthTest: true,
                  })
                );
                pts.frustumCulled = false;
                scene.add(pts);

                // Always-visible billboard in front of camera (so you ALWAYS see something)
                const sprite = new THREE.Sprite(
                  new THREE.SpriteMaterial({ color: 0x00ff88 })
                );
                sprite.material.depthTest = false;
                scene.add(sprite);
                const placeSprite = () => {
                  const dir = new THREE.Vector3();
                  camera.getWorldDirection(dir);
                  sprite.position
                    .copy(camera.position)
                    .add(dir.multiplyScalar(20));
                };

                console.log(
                  "GL init sizes",
                  gl.drawingBufferWidth,
                  gl.drawingBufferHeight,
                  "vw/vh",
                  vw,
                  vh,
                  "dpr",
                  dpr
                );

                renderer.setAnimationLoop(() => {
                  placeSprite();
                  renderer.render(scene, camera);
                  gl.endFrameEXP();
                });

                return; // keep your normal path intact when DEBUG is off
              }

              rendererHandle.current = initRenderer(gl, {
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
              });

              // After renderer+scene+camera exist, attach the real-sim stars
              // (initRenderer should populate threeRefs.current.scene/camera)
              // We defer to the next tick to ensure they're set.
              setTimeout(ensureSimStars, 0);
            }}
          />
        )}

        {/* Overlays */}
        <Vignette opacity={0.5} />
        <View
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            flexDirection: "row",
            gap: 8,
          }}
          pointerEvents="box-none"
        >
          <MiniMap
            radius={(engine as any).radius ?? 100}
            cameraPos={{
              x: overlay.current.cam.x,
              z: overlay.current.cam.z,
              yaw: overlay.current.cam.yaw,
              fov: overlay.current.cam.fov,
            }}
            civXY={overlay.current.civ}
            onSelect={jumpToWorldXY}
          />
        </View>
        <CoordsHUD cam={overlay.current.cam} radius={(engine as any).radius} />
        <AnalogStick
          onChange={(x, y) => {
            stickL.current = { x, y };
          }}
          style={{ position: "absolute", left: 12, bottom: 80 }}
        />
        <AnalogStick
          onChange={(x, y) => {
            stickR.current = { x, y };
          }}
          style={{ position: "absolute", right: 12, bottom: 80 }}
        />
      </View>
    </GestureDetector>
  );
});
