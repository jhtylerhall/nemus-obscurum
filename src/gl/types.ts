import * as THREE from 'three';

export type CameraState = {
  yaw: number;   // radians
  pitch: number; // radians
  dist: number;  // world units
  fov: number;   // radians
};

export type EngineView = {
  starCount: number;
  civCount: number;
  step: (dt: number) => void;
  getStar: (i: number) => [number, number, number];
  isCivAlive: (i: number) => boolean;
  getCivPos: (i: number) => [number, number, number];
  getCivStrat: (i: number) => number;
  getCivTech: (i: number) => number;
  isCivRevealed: (i: number) => boolean;
};

export type GeometryHandles = {
  starGeom: THREE.BufferGeometry;
  civGeom: THREE.BufferGeometry;
  haloGeom: THREE.BufferGeometry;
  starPos: Float32Array;
  civPos: Float32Array;
  haloPos: Float32Array;
  civCol: Float32Array;
  haloSize: Float32Array;
};

export type RaycastRefs = {
  camera?: THREE.PerspectiveCamera;
  civPoints?: THREE.Points;
  civIndexMap?: Int32Array;
  raycaster?: THREE.Raycaster;
};

export type GLUniforms = {
  uPR: { value: number };
  uScale: { value: number };
  uMaxSize: { value: number };
};
