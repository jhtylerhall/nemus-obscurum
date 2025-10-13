import * as THREE from 'three';

export type OrbitDefinition = {
  center: THREE.Object3D;
  body: THREE.Object3D;
  radius: number;
  angularVelocity: number;
  phase?: number;
};

export class OrbitSystem {
  private readonly entries: { def: OrbitDefinition; angle: number }[] = [];

  public add(def: OrbitDefinition): void {
    const entry = { def, angle: def.phase ?? Math.random() * Math.PI * 2 };
    this.entries.push(entry);
    this.updateEntry(entry);
  }

  public update(dt: number): void {
    for (const entry of this.entries) {
      entry.angle += entry.def.angularVelocity * dt;
      this.updateEntry(entry);
    }
  }

  private updateEntry(entry: { def: OrbitDefinition; angle: number }): void {
    const x = Math.cos(entry.angle) * entry.def.radius;
    const z = Math.sin(entry.angle) * entry.def.radius;
    entry.def.body.position.copy(entry.def.center.position).add(new THREE.Vector3(x, 0, z));
  }
}
