import * as THREE from 'three';

export function createStar(radius = 7e8): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshBasicMaterial({ color: 0xfff6b0 });
  const star = new THREE.Mesh(geometry, material);
  star.layers.enable(1);
  return star;
}
