import * as THREE from 'three';

export function createRenderer(canvas: HTMLCanvasElement) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });

  // DPR cap for mobile; prevents microscopic stars & overdraw
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  r.setPixelRatio(DPR);
  r.setSize(canvas.clientWidth, canvas.clientHeight, false);

  // Modern color pipeline
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;

  // Non-black clear to surface "nothing is drawing" bugs
  r.setClearColor(0x0d1020, 1);
  (r as any).physicallyCorrectLights = true;

  // Handle WebGL context loss (mobile browsers!)
  const onLost = (e: Event) => { e.preventDefault(); console.warn('[WebGL] context lost'); };
  const onRestored = () => { console.warn('[WebGL] context restored'); r.setSize(canvas.clientWidth, canvas.clientHeight, false); };
  canvas.addEventListener('webglcontextlost', onLost, { passive: false });
  canvas.addEventListener('webglcontextrestored', onRestored, { passive: true });

  // Page visibility (save battery on mobile)
  const onVis = () => { /* your RAF already checks each frame; nothing required, hook if needed */ };
  document.addEventListener('visibilitychange', onVis);

  // Cleanup helper
  (r as any).__disposeExtras = () => {
    canvas.removeEventListener('webglcontextlost', onLost as any);
    canvas.removeEventListener('webglcontextrestored', onRestored as any);
    document.removeEventListener('visibilitychange', onVis);
  };

  return r;
}

export function resizeRendererToDisplaySize(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera) {
  const canvas = renderer.domElement;
  // Use bounding client rect to survive transforms/zoom
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, rect.width | 0);
  const h = Math.max(1, rect.height | 0);
  if (canvas.width !== w || canvas.height !== h) {
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}
