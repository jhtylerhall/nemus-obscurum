import * as THREE from "three";
import { Atmosphere } from "./Atmosphere";
import { CameraRig } from "./CameraRig";
import { Planet } from "./Planet";
import { makeAmbientLight, makeStarLight } from "./Lighting";
import { CivState, createInitialCivState, stepCiv } from "./Simulation";

const FIXED_STEP = 1 / 60;
const MAX_ACCUM = 0.2;

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
  private accumulator = 0;
  private readonly civ: CivState = createInitialCivState();
  private readonly statsScratch: HomeworldStats = { ...createInitialCivState() };
  private pixelRatio: number;
  private readonly focusTarget = new THREE.Vector3();

  private running = false;
  private readonly endFrame: () => void;
  private readonly onStats?: (stats: HomeworldStats) => void;

  constructor(renderer: THREE.WebGLRenderer, opts: HomeworldOptions) {
    this.renderer = renderer;
    this.pixelRatio = opts.pixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(opts.width, opts.height, false);

    this.rig = new CameraRig(opts.width, opts.height);
    this.focusOnPlanet();
    this.scene.background = new THREE.Color("#02040f");
    this.scene.add(makeAmbientLight());
    const sunLight = makeStarLight();
    sunLight.position.set(8, 6, 4);
    sunLight.target.position.set(0, 0, 0);
    this.scene.add(sunLight);
    this.scene.add(sunLight.target);
    this.scene.add(this.planet.mesh);
    this.scene.add(this.atmosphere.mesh);

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

  recenter(): void {
    this.focusOnPlanet();
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

  private focusOnPlanet(): void {
    this.planet.mesh.getWorldPosition(this.focusTarget);
    const radius = this.computePlanetRadius();
    this.rig.focusOn(this.focusTarget, radius);
  }

  private computePlanetRadius(): number {
    const geometry = this.planet.mesh.geometry;
    if (!geometry.boundingSphere) {
      geometry.computeBoundingSphere();
    }
    const baseRadius = geometry.boundingSphere?.radius ?? 1;
    const scale = this.planet.mesh.scale.x;
    return baseRadius * scale;
  }
}
