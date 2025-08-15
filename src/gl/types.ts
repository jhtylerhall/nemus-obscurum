import * as THREE from 'three';

export type CameraState = { yaw: number; pitch: number; dist: number; fov: number };

export type EngineView = {
  starCount: number;
  civCount: number;
  step: (dt: number) => void;
  getStar(i: number): [number, number, number];
  isCivAlive(i: number): boolean;
  getCivPos(i: number): [number, number, number];
  getCivStrat(i: number): number;
  getCivTech(i: number): number;
  isCivRevealed(i: number): boolean;
};

export type RaycastRefs = {
  camera?: THREE.PerspectiveCamera;
  civPoints?: THREE.Points;
  civIndexMap?: Int32Array;
  raycaster?: THREE.Raycaster;
};

