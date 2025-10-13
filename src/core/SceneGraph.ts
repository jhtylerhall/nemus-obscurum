import * as THREE from 'three';
import { Atmosphere } from '../render/Atmosphere';
import { Planet } from '../render/Planet';
import { createStar } from '../render/Star';
import { OrbitLines } from '../render/OrbitLines';
import { OrbitSystem } from '../sim/Orbits';

/**
 * SceneGraph owns the Three.js scene hierarchy and renderable nodes.
 */
export class SceneGraph {
  public readonly scene: THREE.Scene;
  public readonly planet: Planet;
  public readonly atmosphere: Atmosphere;
  public readonly star: THREE.Mesh;
  public readonly orbits: OrbitLines;
  public readonly orbitSystem: OrbitSystem;

  private readonly planetGroup: THREE.Group;
  private readonly moon: THREE.Mesh;

  public constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#05070d');
    this.scene.fog = new THREE.FogExp2('#05070d', 1e-9);

    this.star = createStar();
    this.scene.add(this.star);

    this.planet = new Planet();
    this.atmosphere = new Atmosphere(this.planet.mesh.geometry.parameters.radius);

    this.planetGroup = new THREE.Group();
    this.planetGroup.add(this.planet.mesh);
    this.planetGroup.add(this.atmosphere.mesh);
    this.scene.add(this.planetGroup);

    this.orbits = new OrbitLines();
    this.orbits.addOrbit(1.5e7, Math.PI / (60 * 60 * 6));
    this.scene.add(this.orbits.group);

    this.orbitSystem = new OrbitSystem();
    this.moon = new THREE.Mesh(new THREE.SphereGeometry(1.5e6, 48, 48), new THREE.MeshStandardMaterial({ color: 0xbfc4d5 }));
    this.scene.add(this.moon);
    this.orbitSystem.add({
      center: this.planetGroup,
      body: this.moon,
      radius: 1.6e7,
      angularVelocity: Math.PI / (60 * 60 * 24),
    });

    const ambientNebula = new THREE.Points(
      new THREE.BufferGeometry().setFromPoints(this.makeNebulaPoints()),
      new THREE.PointsMaterial({ size: 1.2e7, color: 0x203050, transparent: true, opacity: 0.15 })
    );
    this.scene.add(ambientNebula);
  }

  public updatePlanetEnergy(energy: number, alpha: number): void {
    this.planet.setEnergyUse(energy, alpha);
    const base = 0.35 + energy * 0.25;
    this.atmosphere.mesh.material.uniforms.uColor.value.setHSL(0.55, 0.6, base);
  }

  public syncCamera(camera: THREE.PerspectiveCamera): void {
    this.planet.syncCamera(camera);
  }

  private makeNebulaPoints(): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const radius = 5e8;
    for (let i = 0; i < 120; i += 1) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = radius * (0.5 + Math.random() * 0.5);
      const x = Math.sin(phi) * Math.cos(theta) * r;
      const y = Math.cos(phi) * r * 0.2;
      const z = Math.sin(phi) * Math.sin(theta) * r;
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }
}
