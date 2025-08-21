import * as THREE from 'three';
import { useEffect, useRef } from 'react';

export function useTouchLook(camera: THREE.PerspectiveCamera | undefined, dom: HTMLElement | undefined) {
  const state = useRef({ lastX: 0, lastY: 0, active: false, touches: [] as Touch[] });
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');

  useEffect(() => {
    if (!camera || !dom) return;
    const onStart = (e: TouchEvent) => {
      state.current.touches = Array.from(e.touches);
      if (e.touches.length === 1) {
        state.current.active = true;
        state.current.lastX = e.touches[0].clientX;
        state.current.lastY = e.touches[0].clientY;
      }
    };
    const onMove = (e: TouchEvent) => {
      const t = e.touches;
      // One finger: look
      if (t.length === 1 && state.current.active) {
        const dx = t[0].clientX - state.current.lastX;
        const dy = t[0].clientY - state.current.lastY;
        state.current.lastX = t[0].clientX;
        state.current.lastY = t[0].clientY;

        // Adjust yaw/pitch
        euler.setFromQuaternion(camera.quaternion);
        const yawSpeed = 0.0025; const pitchSpeed = 0.0025;
        euler.y -= dx * yawSpeed;
        euler.x -= dy * pitchSpeed;
        euler.x = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, euler.x));
        camera.quaternion.setFromEuler(euler);
      }
      // Two fingers: pinch to dolly forward/back
      if (t.length === 2) {
        const d = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        const prev = state.current.touches;
        if (prev.length === 2) {
          const prevDist = d(prev[0], prev[1]);
          const nowDist = d(t[0], t[1]);
          const delta = (nowDist - prevDist) * 0.05; // scale
          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
          camera.position.addScaledVector(forward, delta);
        }
        state.current.touches = Array.from(t);
      }
    };
    const onEnd = () => { state.current.active = false; state.current.touches = []; };

    dom.addEventListener('touchstart', onStart, { passive: true });
    dom.addEventListener('touchmove', onMove, { passive: true });
    dom.addEventListener('touchend', onEnd, { passive: true });
    dom.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      dom.removeEventListener('touchstart', onStart);
      dom.removeEventListener('touchmove', onMove);
      dom.removeEventListener('touchend', onEnd);
      dom.removeEventListener('touchcancel', onEnd);
    };
  }, [camera, dom]);
}
