import * as THREE from 'three';

/**
 * Time manages fixed-step integration with interpolation alpha.
 */
export class Time {
  private readonly clock = new THREE.Clock();
  private accumulator = 0;
  public readonly fixedDelta = 1 / 60;

  public tick(): { steps: number; alpha: number } {
    const dt = this.clock.getDelta();
    this.accumulator += dt;

    let steps = 0;
    while (this.accumulator >= this.fixedDelta) {
      this.accumulator -= this.fixedDelta;
      steps += 1;
    }

    const alpha = this.accumulator / this.fixedDelta;
    return { steps, alpha };
  }
}
