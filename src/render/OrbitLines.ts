import * as THREE from 'three';

export class OrbitLines {
  readonly group: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.add(this.makeOrbit(1.5e9));
    this.group.add(this.makeOrbit(3.5e8));
  }

  private makeOrbit(radius: number): THREE.Line {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineDashedMaterial({ color: 0x5b7c99, dashSize: 5e7, gapSize: 2e7 });
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    return line;
  }
}
