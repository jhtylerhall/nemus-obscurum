import * as THREE from 'three';

type OrbitEntry = {
  path: THREE.Line;
  indicator: THREE.Mesh;
  angularSpeed: number;
  radius: number;
  angle: number;
};

export class OrbitLines {
  public readonly group = new THREE.Group();
  private readonly orbits: OrbitEntry[] = [];

  public addOrbit(radius: number, angularSpeed: number, color = 0x4f6dff): void {
    const segments = 128;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const theta = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(theta) * radius, 0, Math.sin(theta) * radius));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 });
    const line = new THREE.Line(geometry, material);
    line.rotation.x = Math.PI / 2;

    const indicator = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 0.04, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xf5d76e })
    );

    this.group.add(line);
    this.group.add(indicator);
    this.orbits.push({
      path: line,
      indicator,
      angularSpeed,
      radius,
      angle: Math.random() * Math.PI * 2,
    });
  }

  public update(dt: number): void {
    for (const orbit of this.orbits) {
      orbit.angle += orbit.angularSpeed * dt;
      const x = Math.cos(orbit.angle) * orbit.radius;
      const z = Math.sin(orbit.angle) * orbit.radius;
      orbit.indicator.position.set(x, 0, z);
    }
  }
}
