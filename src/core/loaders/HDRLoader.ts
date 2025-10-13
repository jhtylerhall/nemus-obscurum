import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

/**
 * Loads an HDR environment map and configures tone mapping.
 */
export async function loadHDR(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.DataTexture> {
  const loader = new RGBELoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        resolve(texture);
      },
      undefined,
      (err) => reject(err)
    );
  });
}
