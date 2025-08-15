import React, { useRef, useImperativeHandle } from 'react';
import { View, PixelRatio, LayoutChangeEvent } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { GestureDetector } from 'react-native-gesture-handler';
import { createCameraController } from './cameraController';
import { Compass } from '../ui/Compass';
import { MiniMap } from '../ui/MiniMap';
import { initRenderer } from './renderer3d';
import type { CameraState, RaycastRefs } from './types';

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

export const GLScene = React.forwardRef<GLSceneHandle, Props>(function GLScene({ engine, maxStars, maxCivs, onFps }, ref) {
  const cam = useRef<CameraState>({ yaw: 0, pitch: 0, dist: 20, fov: (60 * Math.PI) / 180 });
  const rendererRef = useRef<{ renderer: THREE.WebGLRenderer; pr: number } | null>(null);
  const threeRefs = useRef<RaycastRefs>({});
  const overlay = useRef({
    civ: [] as [number, number][],
    lastUpdate: 0,
    cam: { x: 0, z: 0, yaw: 0, pitch: 0 },
  });
  const handleRef = useRef<GLSceneHandle>({ focusCiv: () => {}, focusRandom: () => {} });

  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSize.current.w = width;
    viewSize.current.h = height;
    const r = rendererRef.current;
    if (r?.renderer) {
      r.renderer.setSize(Math.max(1, Math.floor(width * r.pr)), Math.max(1, Math.floor(height * r.pr)), false);
    }
  };

  const onTap = (x: number, y: number) => {
    const cam3 = threeRefs.current.camera;
    const pts = threeRefs.current.civPoints;
    const ray = threeRefs.current.raycaster;
    const map = threeRefs.current.civIndexMap;
    if (!cam3 || !pts || !ray || !map) return;
    const { w, h } = viewSize.current;
    const ndc = new THREE.Vector2((x / w) * 2 - 1, -(y / h) * 2 + 1);
    ray.setFromCamera(ndc, cam3);
    (ray.params as any).Points = { threshold: 0.12 * PixelRatio.get() };
    const hits = ray.intersectObject(pts, false);
    if (hits.length) {
      const idx = (hits[0] as any).index ?? -1;
      if (idx >= 0) {
        const engineIdx = map[idx];
        if (engineIdx >= 0) handleRef.current.focusCiv(engineIdx);
      }
    }
  };

  const gesture = createCameraController(cam, onTap);

  useImperativeHandle(ref, () => ({
    focusCiv: (i: number) => handleRef.current.focusCiv(i),
    focusRandom: () => handleRef.current.focusRandom(),
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1, position: 'relative' }} onLayout={onLayout}>
        <GLView
          style={{ flex: 1 }}
          onContextCreate={(gl) => {
            handleRef.current = initRenderer(gl, {
              engine,
              maxStars,
              maxCivs,
              cam,
              threeRefs,
              overlay,
              onFps,
              rendererRef,
            });
          }}
        />
        <View style={{ position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 }} pointerEvents="box-none">
          <Compass yaw={overlay.current.cam.yaw} pitch={overlay.current.cam.pitch} />
          <MiniMap
            radius={(engine as any).radius ?? 100}
            cameraPos={{ x: overlay.current.cam.x, z: overlay.current.cam.z, yaw: overlay.current.cam.yaw }}
            civXY={overlay.current.civ}
          />
        </View>
      </View>
    </GestureDetector>
  );
});
