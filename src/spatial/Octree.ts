import * as THREE from 'three';

export type OctreeNode<T> = {
  bounds: THREE.Box3;
  depth: number;
  values: T[];
  children: OctreeNode<T>[];
};

export class Octree<T extends { position: THREE.Vector3 }> {
  private readonly root: OctreeNode<T>;
  private readonly maxDepth: number;
  private readonly capacity: number;

  public constructor(bounds: THREE.Box3, capacity = 16, maxDepth = 6) {
    this.root = { bounds, depth: 0, values: [], children: [] };
    this.capacity = capacity;
    this.maxDepth = maxDepth;
  }

  public insert(value: T): void {
    this.insertNode(this.root, value);
  }

  public query(range: THREE.Sphere, target: T[] = []): T[] {
    this.queryNode(this.root, range, target);
    return target;
  }

  private insertNode(node: OctreeNode<T>, value: T): void {
    if (node.children.length === 0) {
      node.values.push(value);
      if (node.values.length > this.capacity && node.depth < this.maxDepth) {
        this.subdivide(node);
      }
      return;
    }
    for (const child of node.children) {
      if (child.bounds.containsPoint(value.position)) {
        this.insertNode(child, value);
        return;
      }
    }
    node.values.push(value);
  }

  private subdivide(node: OctreeNode<T>): void {
    const { min, max } = node.bounds;
    const center = node.bounds.getCenter(new THREE.Vector3());
    const children: OctreeNode<T>[] = [];
    for (let ix = 0; ix < 2; ix += 1) {
      for (let iy = 0; iy < 2; iy += 1) {
        for (let iz = 0; iz < 2; iz += 1) {
          const childMin = new THREE.Vector3(
            ix === 0 ? min.x : center.x,
            iy === 0 ? min.y : center.y,
            iz === 0 ? min.z : center.z
          );
          const childMax = new THREE.Vector3(
            ix === 0 ? center.x : max.x,
            iy === 0 ? center.y : max.y,
            iz === 0 ? center.z : max.z
          );
          children.push({
            bounds: new THREE.Box3(childMin, childMax),
            depth: node.depth + 1,
            values: [],
            children: [],
          });
        }
      }
    }
    const oldValues = node.values;
    node.values = [];
    node.children = children;
    for (const value of oldValues) {
      this.insertNode(node, value);
    }
  }

  private queryNode(node: OctreeNode<T>, range: THREE.Sphere, target: T[]): void {
    if (!range.intersectsBox(node.bounds)) {
      return;
    }
    for (const value of node.values) {
      if (range.containsPoint(value.position)) {
        target.push(value);
      }
    }
    for (const child of node.children) {
      this.queryNode(child, range, target);
    }
  }
}
