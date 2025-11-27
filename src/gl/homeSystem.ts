// src/gl/homeSystem.ts
// Home star system primitives: star, homeworld, and simple orbit/rotation update
import * as THREE from "three";

type HomeSystem = {
  group: THREE.Group;
  update(dt: number): void;
};

export function createHomeSystem(): HomeSystem {
  const group = new THREE.Group();

  // --- Star (emissive) ---
  const starGeometry = new THREE.SphereGeometry(1.2, 48, 48);
  const starMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0xfff6d5),
    emissive: new THREE.Color(0xffd27f),
    emissiveIntensity: 2.4,
    roughness: 0.2,
    metalness: 0.0,
  });
  const starMesh = new THREE.Mesh(starGeometry, starMaterial);
  group.add(starMesh);

  const starLight = new THREE.PointLight(0xffe6a3, 2.6, 50, 2);
  starLight.position.set(0, 0, 0);
  group.add(starLight);

  const ambient = new THREE.AmbientLight(0x1c273f, 0.5);
  group.add(ambient);

  // --- Homeworld ---
  const homeRadius = 0.7;
  const homeworldGeometry = new THREE.SphereGeometry(homeRadius, 48, 32);
  const homeworldMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x5fb0ff),
    emissive: new THREE.Color(0x0b1f3a),
    emissiveIntensity: 0.08,
    metalness: 0.1,
    roughness: 0.72,
  });
  const homeworld = new THREE.Mesh(homeworldGeometry, homeworldMaterial);
  homeworld.castShadow = false;
  homeworld.receiveShadow = false;

  const orbitRadius = 6;
  homeworld.position.set(orbitRadius, 0, 0);

  const orbitCurve = new THREE.EllipseCurve(
    0,
    0,
    orbitRadius,
    orbitRadius,
    0,
    2 * Math.PI
  );
  const orbitPoints = orbitCurve.getPoints(128);
  const orbitPathGeometry = new THREE.BufferGeometry().setFromPoints(orbitPoints);
  orbitPathGeometry.rotateX(-Math.PI / 2);
  const orbitPathMaterial = new THREE.LineDashedMaterial({
    color: 0x18385c,
    dashSize: 0.6,
    gapSize: 0.35,
    transparent: true,
    opacity: 0.4,
  });
  const orbitPath = new THREE.Line(orbitPathGeometry, orbitPathMaterial);
  orbitPath.computeLineDistances();

  group.add(orbitPath);
  group.add(homeworld);

  let theta = 0;
  const orbitSpeed = 0.45; // radians/sec
  const rotationSpeed = 0.6; // radians/sec

  return {
    group,
    update: (dt: number) => {
      theta += dt * orbitSpeed;
      const x = Math.cos(theta) * orbitRadius;
      const z = Math.sin(theta) * orbitRadius;
      homeworld.position.set(x, 0, z);
      homeworld.rotation.y += dt * rotationSpeed;
    },
  };
}
