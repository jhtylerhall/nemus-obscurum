// src/gl/SystemView.tsx
import React, { useCallback, useMemo, useRef } from "react";
import { View, PixelRatio, LayoutChangeEvent, StyleSheet, TouchableOpacity, Text } from "react-native";
import { GLView } from "expo-gl";
import * as THREE from "three";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import type { HomeSystem } from "../sim/homeSystem";
import { updateSystemOrbits } from "../sim/homeSystem";

type Props = {
  homeSystem: HomeSystem;
};

function computeSystemRadius(system: HomeSystem) {
  let maxOrbit = system.star.radius;
  system.planets.forEach((planet) => {
    maxOrbit = Math.max(maxOrbit, planet.orbitRadius + planet.radius);
  });
  // Add padding so orbits never kiss the viewport edge on mobile
  return maxOrbit * 1.15;
}

function getFitDistance(radius: number, fovDeg: number) {
  const halfFov = THREE.MathUtils.degToRad(fovDeg * 0.5);
  return (radius / Math.tan(halfFov)) * 1.1;
}

function createPlanetTexture(colorHex: number) {
  const size = 64;
  const data = new Uint8Array(size * size * 3);
  const base = new THREE.Color(colorHex);

  for (let y = 0; y < size; y++) {
    const lat = y / size;
    const band = Math.sin(lat * Math.PI * 3) * 0.08; // soft latitudinal bands

    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 3;
      const noise = (Math.random() - 0.5) * 0.06;
      const tint = band + noise;

      data[idx] = Math.max(0, Math.min(255, Math.round((base.r + tint) * 255)));
      data[idx + 1] = Math.max(
        0,
        Math.min(255, Math.round((base.g + tint * 0.7) * 255))
      );
      data[idx + 2] = Math.max(
        0,
        Math.min(255, Math.round((base.b + tint * 0.5) * 255))
      );
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipMapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createPlanetMaterial(planetColor: string, radius: number) {
  const color = new THREE.Color(planetColor);
  const surfaceTexture = createPlanetTexture(color.getHex());
  const material = new THREE.MeshPhongMaterial({
    color,
    map: surfaceTexture,
    bumpMap: surfaceTexture,
    bumpScale: Math.max(0.08, radius * 0.02),
    specular: new THREE.Color(0x223344),
    shininess: 32,
    emissive: color.clone().multiplyScalar(0.08),
  });
  material.flatShading = false;
  return material;
}

export function SystemView({ homeSystem }: Props) {
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameIdRef = useRef<number>(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerRef = useRef(new THREE.Vector2());

  const systemRadius = useMemo(() => computeSystemRadius(homeSystem), [homeSystem]);
  const initialDistance = useMemo(() => getFitDistance(systemRadius, 55), [systemRadius]);

  const focusTargetRef = useRef(new THREE.Vector3(0, 0, 0));
  const focusRadiusRef = useRef(systemRadius);

  // Camera orbit controls - start with better overview
  const cameraStateRef = useRef({
    distance: initialDistance,
    azimuth: Math.PI * 0.25, // 45 degrees for nice angle
    elevation: Math.PI * 0.15, // ~27 degrees - not too steep
  });

  const lastGestureRef = useRef({
    x: 0,
    y: 0,
  });

  const viewSizeRef = useRef({ w: 1, h: 1 });

  // Planet and star mesh refs
  const planetMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const orbitLinesRef = useRef<Map<string, THREE.Line>>(new Map());

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSizeRef.current = { w: width, h: height };

    if (rendererRef.current && cameraRef.current) {
      rendererRef.current.setSize(
        Math.max(1, Math.floor(width)),
        Math.max(1, Math.floor(height)),
        false
      );
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    }
  }, []);

  const updateCamera = useCallback(() => {
    if (!cameraRef.current) return;

    const { distance, azimuth, elevation } = cameraStateRef.current;
    const focus = focusTargetRef.current;

    // Spherical to Cartesian coordinates
    const x = distance * Math.cos(elevation) * Math.sin(azimuth);
    const y = distance * Math.sin(elevation);
    const z = distance * Math.cos(elevation) * Math.cos(azimuth);

    cameraRef.current.position.set(x + focus.x, y + focus.y, z + focus.z);
    cameraRef.current.lookAt(focus);
  }, []);

  // Recenter camera on homeworld
  const recenterOnHomeworld = useCallback(() => {
    // Reset to a good overview of whole system
    focusTargetRef.current.set(0, 0, 0);
    focusRadiusRef.current = systemRadius;
    cameraStateRef.current.distance = initialDistance;
    cameraStateRef.current.azimuth = Math.PI * 0.25;
    cameraStateRef.current.elevation = Math.PI * 0.15;
    updateCamera();
  }, [initialDistance, systemRadius, updateCamera]);

  const focusPlanet = useCallback(
    (planetId: string) => {
      const planet = homeSystem.planets.find((p) => p.id === planetId);
      if (!planet) return;

      focusTargetRef.current.set(planet.x, planet.y, planet.z);
      focusRadiusRef.current = planet.radius * 2.6;

      const fitDistance = getFitDistance(focusRadiusRef.current, 55);
      const closeDistance = Math.max(fitDistance, planet.radius * 4.2);
      cameraStateRef.current.distance = closeDistance;
      cameraStateRef.current.azimuth = Math.PI * 0.35;
      cameraStateRef.current.elevation = Math.PI * 0.22;
      updateCamera();
    },
    [homeSystem.planets, updateCamera]
  );

  // Gesture handling for camera rotation
  const gesture = React.useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .onBegin(() => {
        lastGestureRef.current.x = 0;
        lastGestureRef.current.y = 0;
      })
      .onUpdate((e) => {
        const sensitivity = 0.005;
        const dx = e.translationX - lastGestureRef.current.x;
        const dy = e.translationY - lastGestureRef.current.y;

        cameraStateRef.current.azimuth -= dx * sensitivity;
        cameraStateRef.current.elevation += dy * sensitivity;

        // Clamp elevation to avoid flipping
        cameraStateRef.current.elevation = Math.max(
          -Math.PI / 2 + 0.1,
          Math.min(Math.PI / 2 - 0.1, cameraStateRef.current.elevation)
        );

        lastGestureRef.current.x = e.translationX;
        lastGestureRef.current.y = e.translationY;

        updateCamera();
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onUpdate((e) => {
        const newDist = cameraStateRef.current.distance / e.scale;
        // Clamp to keep the whole system framed on small screens
        const minDistance = getFitDistance(focusRadiusRef.current, 55);
        const maxDistance = systemRadius * 5;
        cameraStateRef.current.distance = Math.max(
          minDistance,
          Math.min(maxDistance, newDist)
        );
        updateCamera();
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(250)
      .onEnd((event) => {
        const { w, h } = viewSizeRef.current;
        if (!cameraRef.current || w === 0 || h === 0) return;

        const x = (event.x / w) * 2 - 1;
        const y = -(event.y / h) * 2 + 1;
        pointerRef.current.set(x, y);

        const raycaster = raycasterRef.current;
        raycaster.setFromCamera(pointerRef.current, cameraRef.current);

        const meshes = Array.from(planetMeshesRef.current.values());
        const intersections = raycaster.intersectObjects(meshes, false);
        if (intersections.length === 0) return;

        const hit = intersections[0].object as THREE.Mesh;
        const planetId = (hit.userData as { planetId?: string } | undefined)?.planetId;
        if (planetId) {
          focusPlanet(planetId);
        }
      });

    return Gesture.Simultaneous(pan, pinch, tap);
  }, [focusPlanet, systemRadius, updateCamera]);

  const onContextCreate = useCallback(
    (gl: any) => {
      // Setup canvas shim for three.js
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
          antialias: true,
          premultipliedAlpha: false,
          preserveDrawingBuffer: false,
          powerPreference: "high-performance",
        });
      }

      // Create renderer
      const renderer = new THREE.WebGLRenderer({
        context: gl as any,
        canvas,
        alpha: true,
        antialias: true,
      });
      const pr = PixelRatio.get();
      renderer.setPixelRatio(pr);
      renderer.setSize(
        gl.drawingBufferWidth / pr,
        gl.drawingBufferHeight / pr,
        false
      );
      renderer.setClearColor(0x000000, 1);
      rendererRef.current = renderer;

      // Create scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000510);
      sceneRef.current = scene;

      // Create camera
      const camera = new THREE.PerspectiveCamera(
        55,
        gl.drawingBufferWidth / gl.drawingBufferHeight,
        Math.max(0.05, systemRadius * 0.02),
        systemRadius * 15
      );
      cameraRef.current = camera;
      updateCamera();

      // Add ambient light
      const ambientLight = new THREE.AmbientLight(0x2a2f40, 0.35);
      scene.add(ambientLight);

      const skyLight = new THREE.HemisphereLight(0x6f80a0, 0x05060a, 0.35);
      scene.add(skyLight);

      // Create star (sun) - use basic material with bright color
      const starGeometry = new THREE.SphereGeometry(homeSystem.star.radius, 32, 32);
      const starMaterial = new THREE.MeshBasicMaterial({
        color: homeSystem.star.color,
      });
      const starMesh = new THREE.Mesh(starGeometry, starMaterial);
      starMesh.position.set(
        homeSystem.star.x,
        homeSystem.star.y,
        homeSystem.star.z
      );
      scene.add(starMesh);

      // Add point light at star position
      const starLight = new THREE.PointLight(
        homeSystem.star.color,
        2.5,
        systemRadius * 6
      );
      starLight.decay = 2;
      starLight.position.copy(starMesh.position);
      scene.add(starLight);

      // Create planets
      homeSystem.planets.forEach((planet) => {
        // Planet mesh
        const planetGeometry = new THREE.SphereGeometry(planet.radius, 48, 48);
        const planetMaterial = createPlanetMaterial(planet.color, planet.radius);

        const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
        planetMesh.position.set(planet.x, planet.y, planet.z);
        planetMesh.userData = { planetId: planet.id };
        scene.add(planetMesh);
        planetMeshesRef.current.set(planet.id, planetMesh);

        // Orbit line
        const orbitPoints: THREE.Vector3[] = [];
        const segments = 128;
        for (let i = 0; i <= segments; i++) {
          const angle = (i / segments) * Math.PI * 2;
          orbitPoints.push(
            new THREE.Vector3(
              Math.cos(angle) * planet.orbitRadius,
              planet.y,
              Math.sin(angle) * planet.orbitRadius
            )
          );
        }
        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitMaterial = new THREE.LineBasicMaterial({
          color: planet.isHabitable ? 0x00ff00 : 0x444444,
          opacity: 0.3,
          transparent: true,
        });
        const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
        scene.add(orbitLine);
        orbitLinesRef.current.set(planet.id, orbitLine);

        // Add a highlight ring for the habitable planet
        if (planet.isHabitable) {
          const ringGeometry = new THREE.RingGeometry(
            planet.radius * 1.5,
            planet.radius * 1.7,
            32
          );
          const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5,
          });
          const ring = new THREE.Mesh(ringGeometry, ringMaterial);
          ring.rotation.x = Math.PI / 2;
          planetMesh.add(ring);
        }
      });

      // Add background stars
      const starfieldGeometry = new THREE.BufferGeometry();
      const starfieldPositions = new Float32Array(1000 * 3);
      for (let i = 0; i < 1000; i++) {
        starfieldPositions[i * 3] = (Math.random() - 0.5) * 500;
        starfieldPositions[i * 3 + 1] = (Math.random() - 0.5) * 500;
        starfieldPositions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      }
      starfieldGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(starfieldPositions, 3)
      );
      const starfieldMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1 * pr,
        sizeAttenuation: false,
      });
      const starfield = new THREE.Points(starfieldGeometry, starfieldMaterial);
      scene.add(starfield);

      // Animation loop
      let lastTime = Date.now();
      const animate = () => {
        frameIdRef.current = requestAnimationFrame(animate);

        const now = Date.now();
        const deltaTime = (now - lastTime) / 16.67; // Normalize to ~60fps
        lastTime = now;

        // Update planet positions
        updateSystemOrbits(homeSystem, deltaTime);

        // Update planet meshes
        homeSystem.planets.forEach((planet) => {
          const mesh = planetMeshesRef.current.get(planet.id);
          if (mesh) {
            mesh.position.set(planet.x, planet.y, planet.z);
          }
        });

        // Render
        renderer.render(scene, camera);
        gl.endFrameEXP();
      };

      animate();
    },
    [homeSystem, updateCamera]
  );

  return (
    <GestureDetector gesture={gesture}>
      <View style={styles.container} onLayout={onLayout}>
        <GLView style={styles.glView} onContextCreate={onContextCreate} />

        {/* Recenter button */}
        <TouchableOpacity
          style={styles.recenterButton}
          onPress={recenterOnHomeworld}
          activeOpacity={0.7}
        >
          <Text style={styles.recenterText}>⌖ Recenter</Text>
        </TouchableOpacity>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glView: {
    flex: 1,
  },
  recenterButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(16, 22, 43, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1f2a4b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  recenterText: {
    color: '#e6efff',
    fontSize: 14,
    fontWeight: '600',
  },
});
