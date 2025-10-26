import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { makeStarLight } from './Lighting';
import { Time } from './Time';
import { Planet } from '../render/Planet';
import { Atmosphere } from '../render/Atmosphere';
import { Star } from '../render/Star';
import { OrbitLines } from '../render/OrbitLines';
import { createInitialCivState, stepCiv } from '../sim/CivUpdate';
import { HUD } from '../ui/HUD';
import { Panels } from '../ui/Panels';

export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly cameraRig: CameraRig;
  private readonly time: Time;
  private readonly planet: Planet;
  private readonly atmosphere: Atmosphere;
  private readonly star: Star;
  private readonly orbits: OrbitLines;
  private readonly civ = createInitialCivState();
  private readonly hud: HUD;

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030712);
    this.cameraRig = new CameraRig();
    this.time = new Time();

    this.planet = new Planet();
    this.atmosphere = new Atmosphere(this.planet.mesh);
    this.star = new Star();
    this.orbits = new OrbitLines();

    this.scene.add(this.planet.mesh);
    this.scene.add(this.atmosphere.mesh);
    this.scene.add(this.star.mesh);
    this.scene.add(this.orbits.group);
    this.scene.add(makeStarLight());

    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(this.renderer.domElement);

    const uiLayer = document.createElement('div');
    uiLayer.style.position = 'fixed';
    uiLayer.style.top = '0';
    uiLayer.style.left = '0';
    uiLayer.style.width = '100%';
    uiLayer.style.height = '100%';
    uiLayer.style.pointerEvents = 'none';
    document.body.appendChild(uiLayer);

    this.hud = new HUD(uiLayer);
    new Panels(uiLayer, [
      { label: 'Home', onSelect: () => this.resetCamera() },
      { label: 'Boost morale', onSelect: () => this.adjustMorale(0.1) },
      { label: 'Reduce secrecy', onSelect: () => this.adjustSecrecy(-0.1) },
    ]);

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame(): void {
    const { fixedDelta, steps } = this.time.tick();
    for (let i = 0; i < steps; i += 1) {
      stepCiv(this.civ, fixedDelta);
    }

    this.planet.updateSurfaceEnergy(this.civ.energyUse);
    this.atmosphere.updateGlow(this.civ.secrecy);
    this.star.updatePulse(this.time.elapsed);
    this.cameraRig.update();

    this.hud.update({
      population: this.civ.population,
      techLevel: this.civ.techLevel,
      energyUse: this.civ.energyUse,
    });

    this.renderer.render(this.scene, this.cameraRig.camera);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.cameraRig.onResize(width / height);
  }

  private resetCamera(): void {
    this.cameraRig.onResize(window.innerWidth / window.innerHeight);
  }

  private adjustMorale(amount: number): void {
    this.civ.morale = Math.max(0.1, this.civ.morale + amount);
  }

  private adjustSecrecy(amount: number): void {
    this.civ.secrecy = THREE.MathUtils.clamp(this.civ.secrecy + amount, 0, 1);
  }
}
