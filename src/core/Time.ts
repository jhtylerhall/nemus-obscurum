const FIXED_STEP = 1 / 60;
const MAX_STEPS = 5;

export class Time {
  private readonly clock = performance;
  private lastTime = this.clock.now() / 1000;
  private accumulator = 0;
  elapsed = 0;

  tick(): { fixedDelta: number; steps: number } {
    const now = this.clock.now() / 1000;
    const frameTime = Math.min(now - this.lastTime, 0.25);
    this.lastTime = now;
    this.accumulator += frameTime;
    this.elapsed += frameTime;

    let steps = 0;
    while (this.accumulator >= FIXED_STEP && steps < MAX_STEPS) {
      this.accumulator -= FIXED_STEP;
      steps += 1;
    }

    return { fixedDelta: FIXED_STEP, steps };
  }
}
