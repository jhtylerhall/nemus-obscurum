import { SceneSphere } from './Integrators.js';
import { Ray } from './Ray.js';

export class AccelerationStructure {
  constructor(private readonly spheres: SceneSphere[]) {}

  query(_ray: Ray): SceneSphere[] {
    // Placeholder: return all spheres
    return this.spheres;
  }
}
