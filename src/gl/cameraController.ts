import { Gesture } from 'react-native-gesture-handler';
import type { CameraState } from './types';

export function createCameraController(
  camRef: React.MutableRefObject<Pick<CameraState, 'yaw' | 'pitch' | 'fov'>>,
  onTap: (x: number, y: number) => void
) {
  const panPrev = { tx: 0, ty: 0 };
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onStart(() => {
      panPrev.tx = 0; panPrev.ty = 0;
    })
    .onUpdate((e) => {
      const dx = e.translationX - panPrev.tx;
      const dy = e.translationY - panPrev.ty;
      panPrev.tx = e.translationX; panPrev.ty = e.translationY;
      const k = 0.002;
      camRef.current.yaw += dx * k;
      camRef.current.pitch = Math.max(-Math.PI / 2 + 0.02, Math.min(Math.PI / 2 - 0.02, camRef.current.pitch - dy * k));
    });

  const pinchScale = { last: 1 };
  const pinch = Gesture.Pinch()
    .runOnJS(true)
    .onStart(() => { pinchScale.last = 1; })
    .onUpdate((e) => {
      const factor = e.scale / (pinchScale.last || 1);
      pinchScale.last = e.scale;
      const nfov = camRef.current.fov / factor;
      camRef.current.fov = Math.max((20 * Math.PI) / 180, Math.min((100 * Math.PI) / 180, nfov));
    });

  const tap = Gesture.Tap()
    .numberOfTaps(1)
    .maxDeltaX(16)
    .maxDeltaY(16)
    .runOnJS(true)
    .onEnd((e, ok) => { if (ok) onTap(e.x, e.y); });

  return Gesture.Simultaneous(pinch, pan, tap);
}
