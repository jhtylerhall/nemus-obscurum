import { Ray } from './Ray.ts';
import type { Hit } from './Intersections.ts';
import type { Shape } from './Shapes.ts';

export class LinearAccel {
  private readonly shapes: Shape[];

  public constructor(shapes: Shape[]) {
    this.shapes = shapes;
  }

  public trace(ray: Ray): { hit: Hit; shape: Shape } | null {
    let closest: { hit: Hit; shape: Shape } | null = null;
    for (const shape of this.shapes) {
      const hit = shape.intersect(ray);
      if (!hit) continue;
      if (!closest || hit.t < closest.hit.t) {
        closest = { hit, shape };
      }
    }
    return closest;
  }
}
