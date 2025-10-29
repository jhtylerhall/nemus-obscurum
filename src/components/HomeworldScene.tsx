import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { View, PixelRatio, LayoutChangeEvent } from "react-native";
import { GLView } from "expo-gl";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import * as THREE from "three";

import { HomeworldApp } from "../homeworld/HomeworldApp";
import type {
  HomeworldStats,
  HomeworldDebugInfo,
} from "../homeworld/HomeworldApp";

export type HomeworldSceneProps = {
  onStats?: (stats: HomeworldStats) => void;
  onDebug?: (debug: HomeworldDebugInfo) => void;
};

export type HomeworldSceneHandle = {
  recenter: () => void;
  setVisualDebug: (visible: boolean) => void;
};

type RendererBundle = {
  gl: ExpoWebGLRenderingContext;
  renderer: THREE.WebGLRenderer;
  app: HomeworldApp;
};

export const HomeworldScene = forwardRef<HomeworldSceneHandle, HomeworldSceneProps>(
  ({ onStats, onDebug }, ref) => {
  const bundleRef = useRef<RendererBundle | null>(null);

  useEffect(() => {
    return () => {
      const bundle = bundleRef.current;
      if (bundle) {
        bundle.app.stop();
        bundle.renderer.dispose();
        bundle.gl.endFrameEXP();
        bundleRef.current = null;
      }
    };
  }, []);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    const bundle = bundleRef.current;
    if (bundle) {
      const pixelRatio = PixelRatio.get();
      bundle.app.resize(width * pixelRatio, height * pixelRatio, pixelRatio);
    }
  }, []);

  const handleContextCreate = useCallback(
    async (gl: ExpoWebGLRenderingContext) => {
      const pixelRatio = PixelRatio.get();
      const { drawingBufferWidth, drawingBufferHeight } = gl;
      const canvas = Object.assign(gl.canvas ?? {}, {
        width: drawingBufferWidth,
        height: drawingBufferHeight,
        style: {},
        clientHeight: drawingBufferHeight,
        addEventListener: () => {},
        removeEventListener: () => {},
        getContext: (type: string) => (type.includes("webgl") ? gl : null),
      });
      (gl as any).canvas = canvas;
      if (!(gl as any).getContextAttributes) {
        (gl as any).getContextAttributes = () => ({
          alpha: true,
          depth: true,
          stencil: false,
          antialias: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
          failIfMajorPerformanceCaveat: false,
          xrCompatible: false,
        });
      }

      const renderer = new THREE.WebGLRenderer({
        context: gl as unknown as WebGLRenderingContext,
        canvas: canvas as any,
        antialias: true,
        alpha: true,
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(pixelRatio);
      renderer.setClearColor("#02040f");
      renderer.setClearAlpha(1);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;

      const app = new HomeworldApp(renderer, {
        width: drawingBufferWidth,
        height: drawingBufferHeight,
        pixelRatio,
        endFrame: () => gl.endFrameEXP(),
        onStats,
        onDebug,
      });
      app.start();

      bundleRef.current = { gl, renderer, app };
    },
    [onStats, onDebug]
  );

  useImperativeHandle(
    ref,
    () => ({
      recenter: () => {
        const bundle = bundleRef.current;
        if (bundle) {
          bundle.app.recenter();
        }
      },
      setVisualDebug: (visible: boolean) => {
        const bundle = bundleRef.current;
        if (bundle) {
          bundle.app.setDebugHelpersVisible(visible);
        }
      },
    }),
    []
  );

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <GLView style={{ flex: 1 }} onContextCreate={handleContextCreate} />
    </View>
  );
}
);

HomeworldScene.displayName = "HomeworldScene";
