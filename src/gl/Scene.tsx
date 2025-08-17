import React, {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, PixelRatio, LayoutChangeEvent } from 'react-native';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { AnalogStick } from '../ui/AnalogStick';
import { Compass } from '../ui/Compass';
import { CoordsHUD } from '../ui/CoordsHUD';
import { Vignette } from '../ui/Vignette';

// ---------- Starfield ----------
const STAR_COUNT = 8000;
const STAR_SHELL_INNER = 1200;
const STAR_SHELL_OUTER = 1500;

function randomOnShell(
  rMin: number,
  rMax: number,
  rnd: () => number = Math.random,
) {
  const u = rnd() * 2 - 1;
  const t = rnd() * 2 * Math.PI;
  const s = Math.sqrt(1 - u * u);
  const r = rMin + (rMax - rMin) * rnd();
  return { x: r * s * Math.cos(t), y: r * u, z: r * s * Math.sin(t) };
}

type StarField = { mesh: THREE.Points; positions: Float32Array };

function createStarField(
  scene: THREE.Scene,
  playerPos: THREE.Vector3,
): StarField {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const p = randomOnShell(STAR_SHELL_INNER, STAR_SHELL_OUTER);
    positions[i * 3 + 0] = playerPos.x + p.x;
    positions[i * 3 + 1] = playerPos.y + p.y;
    positions[i * 3 + 2] = playerPos.z + p.z;
  }
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  const material = new THREE.PointsMaterial({
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const mesh = new THREE.Points(geometry, material);
  scene.add(mesh);
  return { mesh, positions };
}

function recycleStarsAroundPlayer(stars: StarField, playerPos: THREE.Vector3) {
  const pos = stars.positions;
  let needsUpdate = false;
  for (let i = 0; i < STAR_COUNT; i++) {
    const ix = i * 3;
    const dx = pos[ix] - playerPos.x;
    const dy = pos[ix + 1] - playerPos.y;
    const dz = pos[ix + 2] - playerPos.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (
      d2 < STAR_SHELL_INNER * STAR_SHELL_INNER ||
      d2 > (STAR_SHELL_OUTER + 200) * (STAR_SHELL_OUTER + 200)
    ) {
      const p = randomOnShell(STAR_SHELL_OUTER - 100, STAR_SHELL_OUTER);
      pos[ix] = playerPos.x + p.x;
      pos[ix + 1] = playerPos.y + p.y;
      pos[ix + 2] = playerPos.z + p.z;
      needsUpdate = true;
    }
  }
  if (needsUpdate) {
    (
      stars.mesh.geometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
  }
}

// ---------- Ship ----------
type CameraMode = 'chase' | 'cockpit';

const SHIP_MAX_SPEED = 120;
const SHIP_ACCEL = 60;
const SHIP_STRAFE_ACCEL = 40;
const SHIP_DAMPING = 0.98;
const YAW_RATE = 1.6;
const PITCH_RATE = 1.2;

interface ShipState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  yaw: number;
  pitch: number;
  roll: number;
}

function createShip(): ShipState {
  return {
    position: new THREE.Vector3(0, 0, 0),
    velocity: new THREE.Vector3(),
    yaw: 0,
    pitch: 0,
    roll: 0,
  };
}

function updateShip(
  s: ShipState,
  leftStick: { x: number; y: number },
  rightStick: { x: number; y: number },
  dt: number,
  fwd: THREE.Vector3,
  right: THREE.Vector3,
) {
  s.yaw += leftStick.x * YAW_RATE * dt;
  s.pitch += -leftStick.y * PITCH_RATE * dt;
  s.pitch = Math.max(-Math.PI * 0.47, Math.min(Math.PI * 0.47, s.pitch));
  s.roll = THREE.MathUtils.lerp(s.roll, -leftStick.x * 0.35, 0.12);

  const thrust = rightStick.y * SHIP_ACCEL;
  const strafe = rightStick.x * SHIP_STRAFE_ACCEL;

  const cy = Math.cos(s.yaw);
  const sy = Math.sin(s.yaw);
  const cp = Math.cos(s.pitch);
  const sp = Math.sin(s.pitch);

  fwd.set(sy * cp, -sp, -cy * cp).normalize();
  right.set(cy, 0, sy).normalize();

  s.velocity.addScaledVector(fwd, thrust * dt);
  s.velocity.addScaledVector(right, strafe * dt);

  const speed = s.velocity.length();
  if (speed > SHIP_MAX_SPEED) s.velocity.multiplyScalar(SHIP_MAX_SPEED / speed);

  s.velocity.multiplyScalar(Math.pow(SHIP_DAMPING, dt * 60));
  s.position.addScaledVector(s.velocity, dt);
}

// ---------- Camera ----------
let cameraMode: CameraMode = 'chase';
export function setCameraMode(mode: CameraMode) {
  cameraMode = mode;
}

function updateCamera(
  camera: THREE.Camera,
  ship: ShipState,
  fwd: THREE.Vector3,
  mode: CameraMode,
) {
  if (mode === 'chase') {
    const back = fwd.clone().multiplyScalar(-12);
    const up = new THREE.Vector3(0, 1, 0).multiplyScalar(4);
    const camPos = ship.position.clone().add(back).add(up);
    camera.position.copy(camPos);
    camera.lookAt(ship.position.clone().add(fwd.clone().multiplyScalar(10)));
  } else {
    camera.position.copy(ship.position.clone().add(fwd.clone().multiplyScalar(1.2)));
    camera.lookAt(ship.position.clone().add(fwd.clone().multiplyScalar(20)));
  }
}

// ---------- Ship Mesh ----------
function makeShipMesh(): THREE.Object3D {
  const geo = new THREE.ConeGeometry(0.6, 2.4, 6);
  const mat = new THREE.MeshBasicMaterial({
    wireframe: true,
    opacity: 0.8,
    transparent: true,
  });
  const cone = new THREE.Mesh(geo, mat);
  cone.rotateX(Math.PI / 2);
  return cone;
}

// ---------- Utils ----------
function applyDeadzone(v: number, dz = 0.08) {
  return Math.abs(v) < dz ? 0 : v;
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
  { onFps },
  ref,
) {
  const leftStick = useRef({ x: 0, y: 0 });
  const rightStick = useRef({ x: 0, y: 0 });
  const rendererOnLayout = useRef<{
    renderer: THREE.WebGLRenderer;
    pr: number;
  } | null>(null);
  const viewSize = useRef({ w: 1, h: 1, pr: PixelRatio.get() });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    viewSize.current.w = width;
    viewSize.current.h = height;
    const r = rendererOnLayout.current;
    if (r?.renderer)
      r.renderer.setSize(
        Math.max(1, Math.floor(width * r.pr)),
        Math.max(1, Math.floor(height * r.pr)),
        false,
      );
  };

  const [hud, setHud] = useState({
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    pitch: 0,
    speed: 0,
  });
  const hudLast = useRef(0);

  useImperativeHandle(ref, () => ({
    focusCiv: () => {},
    focusRandom: () => {},
    home: () => {},
    focusStrongest: () => {},
    focusFrontier: () => {},
    focusDensest: () => {},
    focusNearest: () => {},
    jumpToWorldXY: () => {},
  }));

  useEffect(() => {
    return () => {
      rendererOnLayout.current?.renderer.dispose();
    };
  }, []);

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      <GLView
        style={{ flex: 1 }}
        onContextCreate={(gl) => {
          const canvas: any = {
            width: gl.drawingBufferWidth,
            height: gl.drawingBufferHeight,
            style: {},
            clientWidth: gl.drawingBufferWidth,
            clientHeight: gl.drawingBufferHeight,
            addEventListener: () => {},
            removeEventListener: () => {},
            getContext: (type: string) =>
              type.includes('webgl') ? gl : null,
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
              powerPreference: 'high-performance',
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
            powerPreference: 'high-performance',
            // @ts-expect-error runtime read
            contextAttributes: (gl as any).getContextAttributes(),
          });
          const pr = PixelRatio.get();
          renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
          renderer.setPixelRatio(pr);
          rendererOnLayout.current = { renderer, pr };

          const scene = new THREE.Scene();
          scene.background = new THREE.Color('#02050c');

          const camera = new THREE.PerspectiveCamera(
            60,
            gl.drawingBufferWidth / gl.drawingBufferHeight,
            0.05,
            5000,
          );

          const ship = createShip();
          const stars = createStarField(scene, ship.position);
          const shipMesh = makeShipMesh();
          scene.add(shipMesh);

          const fwd = new THREE.Vector3();
          const right = new THREE.Vector3();
          const ls = { x: 0, y: 0 };
          const rs = { x: 0, y: 0 };

          let last = Date.now();
          let ema = 60;

          function loop() {
            const now = Date.now();
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;

            ls.x = applyDeadzone(leftStick.current.x);
            ls.y = applyDeadzone(leftStick.current.y);
            rs.x = applyDeadzone(rightStick.current.x);
            rs.y = applyDeadzone(rightStick.current.y);

            updateShip(ship, ls, rs, dt, fwd, right);
            shipMesh.position.copy(ship.position);
            shipMesh.rotation.set(ship.pitch, ship.yaw, ship.roll);

            updateCamera(camera, ship, fwd, cameraMode);
            recycleStarsAroundPlayer(stars, ship.position);

            const speed = ship.velocity.length();
            if (now - hudLast.current > 100) {
              hudLast.current = now;
              setHud({
                x: ship.position.x,
                y: ship.position.y,
                z: ship.position.z,
                yaw: ship.yaw,
                pitch: ship.pitch,
                speed,
              });
            }

            renderer.render(scene, camera);
            gl.endFrameEXP();

            const fps = 1000 / Math.max(16, now - last);
            ema = ema * 0.9 + fps * 0.1;
            onFps?.(Math.round(ema));

            requestAnimationFrame(loop);
          }

          requestAnimationFrame(loop);
        }}
      />

      <Vignette opacity={0.5} />
      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', top: 8, right: 8 }}
      >
        <Compass yaw={hud.yaw} pitch={hud.pitch} />
      </View>
      <CoordsHUD
        cam={{
          x: hud.x,
          y: hud.y,
          z: hud.z,
          yaw: hud.yaw,
          pitch: hud.pitch,
          dist: hud.speed,
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 20,
          height: 20,
          marginLeft: -10,
          marginTop: -10,
        }}
      >
        <View
          style={{
            position: 'absolute',
            left: 9,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: 'rgba(200,220,255,0.3)',
          }}
        />
        <View
          style={{
            position: 'absolute',
            top: 9,
            left: 0,
            right: 0,
            height: 2,
            backgroundColor: 'rgba(200,220,255,0.3)',
          }}
        />
      </View>
      <AnalogStick
        onChange={(x, y) => {
          leftStick.current = { x, y };
        }}
        style={{ position: 'absolute', left: 12, bottom: 80 }}
      />
      <AnalogStick
        onChange={(x, y) => {
          rightStick.current = { x, y };
        }}
        style={{ position: 'absolute', right: 12, bottom: 80 }}
      />
    </View>
  );
});

