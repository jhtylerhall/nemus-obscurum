import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { makeStarLight, makeAmbientLight } from './Lighting';
import { SceneGraph } from './SceneGraph';
import { Time } from './Time';
import { stepCiv } from '../sim/CivUpdate';
import { createInitialCiv, CivState } from '../sim/CivState';
import { resolveAid, resolveStrike } from '../sim/Events';
import { HUD } from '../ui/HUD';
import { Panels } from '../ui/Panels';

/**
 * App orchestrates renderer, scene graph, and simulation update loop.
 */
export class App {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sceneGraph: SceneGraph;
  private readonly rig: CameraRig;
  private readonly time: Time;
  private readonly civ: CivState;
  private readonly hud: HUD;

  public constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const mount = document.getElementById('app') ?? document.body;
    mount.appendChild(this.renderer.domElement);

    this.sceneGraph = new SceneGraph();
    this.sceneGraph.scene.add(makeStarLight());
    this.sceneGraph.scene.add(makeAmbientLight());

    this.rig = new CameraRig();
    this.time = new Time();
    this.civ = createInitialCiv();

    this.hud = new HUD();
    new Panels([
      { label: 'Aid Drop', onSelect: () => resolveAid(this.civ, 1) },
      { label: 'Orbital Strike', onSelect: () => resolveStrike(this.civ, 1) },
    ]);

    window.addEventListener('resize', () => this.onResize());
    this.onResize();
  }

  public start(): void {
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private frame(): void {
    const { steps, alpha } = this.time.tick();

    for (let i = 0; i < steps; i += 1) {
      stepCiv(this.civ, this.time.fixedDelta);
      this.sceneGraph.orbits.update(this.time.fixedDelta);
      this.sceneGraph.orbitSystem.update(this.time.fixedDelta);
    }

    this.sceneGraph.updatePlanetEnergy(this.civ.energyUse, alpha);
    this.sceneGraph.syncCamera(this.rig.camera);
    this.hud.update({
      population: this.civ.population,
      techLevel: this.civ.techLevel,
      energyUse: this.civ.energyUse,
    });
    this.rig.update();
    this.renderer.render(this.sceneGraph.scene, this.rig.camera);
  }

  private onResize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.rig.onResize();
  }
}
