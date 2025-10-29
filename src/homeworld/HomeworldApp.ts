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
  onDebug?: (debug: HomeworldDebugInfo) => void;
};

export type HomeworldDebugInfo = {
  frameTimeMs: number;
  cameraRadius: number;
  cameraPhi: number;
  cameraTheta: number;
  cameraX: number;
  cameraY: number;
  cameraZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  energyUse: number;
  secrecy: number;
};

export class HomeworldApp {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly rig: CameraRig;
  private readonly scene = new THREE.Scene();
  private readonly clock = new THREE.Clock();
  private readonly planet = new Planet();
  private readonly atmosphere = new Atmosphere(this.planet.mesh);
  private readonly debugGroup = new THREE.Group();
  private readonly targetMarker: THREE.Mesh;
  private readonly sunHelper: THREE.ArrowHelper;
  private readonly sunHelperDir = new THREE.Vector3();
  private accumulator = 0;
  private readonly civ: CivState = createInitialCivState();
  private readonly statsScratch: HomeworldStats = { ...createInitialCivState() };
  private pixelRatio: number;
  private readonly focusTarget = new THREE.Vector3();
  private readonly sunDirection = new THREE.Vector3();
  private readonly debugScratch: HomeworldDebugInfo = {
    frameTimeMs: 0,
    cameraRadius: 0,
    cameraPhi: 0,
    cameraTheta: 0,
    cameraX: 0,
    cameraY: 0,
    cameraZ: 0,
    targetX: 0,
    targetY: 0,
    targetZ: 0,
    energyUse: 0,
    secrecy: 0,
  };

  private running = false;
  private debugVisible = false;
  private readonly endFrame: () => void;
  private readonly onStats?: (stats: HomeworldStats) => void;
  private readonly onDebug?: (debug: HomeworldDebugInfo) => void;

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
    const fillLight = new THREE.PointLight(0x3f5b9a, 1.1, 120, 2);
    fillLight.position.set(-7, 3, -5);
    this.scene.add(fillLight);
    this.scene.add(this.planet.mesh);
    this.scene.add(this.atmosphere.mesh);

    this.sunDirection.subVectors(sunLight.target.position, sunLight.position).normalize();
    this.planet.setStarDirection(this.sunDirection);
    this.planet.updateSurfaceEnergy(this.civ.energyUse);
    this.atmosphere.updateGlow(this.civ.secrecy);

    const markerMaterial = new THREE.MeshBasicMaterial({ color: 0xffb347 });
    this.targetMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      markerMaterial
    );
    const arrowLength = this.computePlanetRadius() * 3.5;
    this.sunHelper = new THREE.ArrowHelper(
      this.sunHelperDir.copy(this.sunDirection).multiplyScalar(-1),
      this.focusTarget,
      arrowLength,
      0x9fd3ff,
      arrowLength * 0.22,
      arrowLength * 0.12
    );
    const sunLineMaterial = this.sunHelper.line.material as THREE.Material;
    const sunConeMaterial = this.sunHelper.cone.material as THREE.Material;
    sunLineMaterial.depthTest = false;
    sunConeMaterial.depthTest = false;
    sunLineMaterial.transparent = true;
    sunConeMaterial.transparent = true;
    sunLineMaterial.opacity = 0.65;
    sunConeMaterial.opacity = 0.65;
    this.debugGroup.add(this.targetMarker);
    this.debugGroup.add(this.sunHelper);
    this.debugGroup.visible = false;
    this.scene.add(this.debugGroup);

    this.endFrame = opts.endFrame;
    this.onStats = opts.onStats;
    this.onDebug = opts.onDebug;
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

  setDebugHelpersVisible(visible: boolean): void {
    this.debugVisible = visible;
    this.debugGroup.visible = visible;
    if (visible) {
      this.updateDebugHelpers();
    }
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
    this.planet.updateFrame(this.rig.camera, this.sunDirection, dt);
    if (this.debugVisible) {
      this.updateDebugHelpers();
    }

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

    if (this.onDebug) {
      this.debugScratch.frameTimeMs = dt * 1000;
      this.debugScratch.cameraRadius = this.rig.radius;
      this.debugScratch.cameraPhi = this.rig.phi;
      this.debugScratch.cameraTheta = this.rig.theta;
      const camPos = this.rig.camera.position;
      this.debugScratch.cameraX = camPos.x;
      this.debugScratch.cameraY = camPos.y;
      this.debugScratch.cameraZ = camPos.z;
      const target = this.rig.target;
      this.debugScratch.targetX = target.x;
      this.debugScratch.targetY = target.y;
      this.debugScratch.targetZ = target.z;
      this.debugScratch.energyUse = this.civ.energyUse;
      this.debugScratch.secrecy = this.civ.secrecy;
      this.onDebug(this.debugScratch);
    }
  }

  private focusOnPlanet(): void {
    this.planet.mesh.getWorldPosition(this.focusTarget);
    const radius = this.computePlanetRadius();
    this.rig.focusOn(this.focusTarget, radius);
    if (this.debugVisible) {
      this.updateDebugHelpers();
    }
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

  private updateDebugHelpers(): void {
    this.targetMarker.position.copy(this.rig.target);
    const arrowLength = this.computePlanetRadius() * 3.5;
    this.sunHelper.position.copy(this.rig.target);
    this.sunHelper.setDirection(
      this.sunHelperDir.copy(this.sunDirection).multiplyScalar(-1)
    );
    this.sunHelper.setLength(arrowLength, arrowLength * 0.22, arrowLength * 0.12);
  }
}
