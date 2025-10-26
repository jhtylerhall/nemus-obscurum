import * as THREE from "three";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { OrbitLines } from "./OrbitLines";
import { Planet } from "./Planet";
import { Star } from "./Star";
import { makeAmbientLight, makeStarLight } from "./Lighting";
import { CivState, createInitialCivState, stepCiv } from "./Simulation";

const FIXED_STEP = 1 / 60;
const MAX_ACCUM = 0.2;
const ORBIT_SPEED = 0.0025;
const PITCH_SPEED = 0.002;
const ZOOM_CLAMP = { min: 0.6, max: 1.6 } as const;

export type HomeworldStats = CivState;

export type HomeworldOptions = {
  width: number;
  height: number;
  pixelRatio: number;
  endFrame: () => void;
  onStats?: (stats: HomeworldStats) => void;
};

export class HomeworldApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly scene = new THREE.Scene();
  private readonly clock = new THREE.Clock();
  private readonly planet = new Planet();
  private readonly atmosphere = new Atmosphere(this.planet.mesh);
  private readonly star = new Star();
  private readonly orbits = new OrbitLines();
  private readonly starDir = new THREE.Vector3(-1, 0, 0).normalize();
  private accumulator = 0;
  private readonly civ: CivState = createInitialCivState();
  private readonly statsScratch: HomeworldStats = { ...createInitialCivState() };
  private pixelRatio: number;

  private running = false;
  private readonly endFrame: () => void;
  private readonly onStats?: (stats: HomeworldStats) => void;

  constructor(renderer: THREE.WebGLRenderer, opts: HomeworldOptions) {
    this.renderer = renderer;
    this.pixelRatio = opts.pixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(opts.width, opts.height, false);

    this.rig = new CameraRig(opts.width, opts.height);
    this.scene.background = new THREE.Color("#02040f");
    this.scene.add(makeAmbientLight());
    const sunLight = makeStarLight();
    sunLight.position.copy(this.star.mesh.position).normalize();
    this.scene.add(sunLight);
    this.scene.add(this.planet.mesh);
    this.scene.add(this.atmosphere.mesh);
    this.scene.add(this.star.mesh);
    this.scene.add(this.orbits.group);

    this.planet.setStarDirection(this.starDir);

    this.endFrame = opts.endFrame;
    this.onStats = opts.onStats;
    this.running = true;
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  resize(width: number, height: number, pixelRatio?: number): void {
    if (pixelRatio && pixelRatio !== this.pixelRatio) {
      this.pixelRatio = pixelRatio;
      this.renderer.setPixelRatio(this.pixelRatio);
    }
    this.renderer.setSize(width, height, false);
    this.rig.setSize(width, height);
  }

  orbit(deltaX: number, deltaY: number): void {
    this.rig.adjustAngles(-deltaX * ORBIT_SPEED, -deltaY * PITCH_SPEED);
  }

  zoom(scale: number): void {
    const clamped = THREE.MathUtils.clamp(scale, ZOOM_CLAMP.min, ZOOM_CLAMP.max);
    this.rig.zoomByFactor(clamped);
  }

  private frame(): void {
    if (!this.running) {
      return;
    }
    const dt = this.clock.getDelta();
    this.accumulator = Math.min(this.accumulator + dt, MAX_ACCUM);
    while (this.accumulator >= FIXED_STEP) {
      stepCiv(this.civ, FIXED_STEP);
      this.accumulator -= FIXED_STEP;
    }

    this.planet.updateSurfaceEnergy(this.civ.energyUse);
    this.atmosphere.updateGlow(this.civ.secrecy);
    this.star.updatePulse(this.clock.elapsedTime);
    this.rig.update();

    this.renderer.render(this.scene, this.rig.camera);
    this.endFrame();

    if (this.onStats) {
      this.statsScratch.population = this.civ.population;
      this.statsScratch.techLevel = this.civ.techLevel;
      this.statsScratch.secrecy = this.civ.secrecy;
      this.statsScratch.energyUse = this.civ.energyUse;
      this.statsScratch.morale = this.civ.morale;
      this.statsScratch.revealed = this.civ.revealed;
      this.onStats(this.statsScratch);
    }
  }
}
