import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export async function loadHDR(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.DataTexture | null> {
  const loader = new RGBELoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        renderer.toneMappingExposure = 1.2;
        resolve(texture);
      },
      undefined,
      (error) => {
        reject(error);
      },
    );
  }).catch(() => null);
}
