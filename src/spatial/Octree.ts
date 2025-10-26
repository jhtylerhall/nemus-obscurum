import * as THREE from 'three';

type Node = {
  bounds: THREE.Box3;
  children: Node[];
  items: number[];
};

export class Octree {
  private readonly root: Node;
  private readonly maxDepth: number;
  private readonly maxItems: number;

  constructor(bounds: THREE.Box3, maxDepth = 6, maxItems = 16) {
    this.root = { bounds: bounds.clone(), children: [], items: [] };
    this.maxDepth = maxDepth;
    this.maxItems = maxItems;
  }

  insert(index: number, position: THREE.Vector3): void {
    this.insertNode(this.root, index, position, 0);
  }

  query(range: THREE.Box3, result: number[]): number[] {
    this.queryNode(this.root, range, result);
    return result;
  }

  private insertNode(node: Node, index: number, position: THREE.Vector3, depth: number): void {
    if (!node.bounds.containsPoint(position)) {
      return;
    }

    if (node.children.length === 0 && (node.items.length < this.maxItems || depth >= this.maxDepth)) {
      node.items.push(index);
      return;
    }

    if (node.children.length === 0) {
      this.subdivide(node);
    }

    for (const child of node.children) {
      this.insertNode(child, index, position, depth + 1);
    }
  }

  private queryNode(node: Node, range: THREE.Box3, result: number[]): void {
    if (!range.intersectsBox(node.bounds)) {
      return;
    }

    result.push(...node.items);
    for (const child of node.children) {
      this.queryNode(child, range, result);
    }
  }

  private subdivide(node: Node): void {
    const { min, max } = node.bounds;
    const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);
    const children: Node[] = [];
    for (let xi = 0; xi < 2; xi += 1) {
      for (let yi = 0; yi < 2; yi += 1) {
        for (let zi = 0; zi < 2; zi += 1) {
          const childMin = new THREE.Vector3(
            xi === 0 ? min.x : center.x,
            yi === 0 ? min.y : center.y,
            zi === 0 ? min.z : center.z,
          );
          const childMax = new THREE.Vector3(
            xi === 0 ? center.x : max.x,
            yi === 0 ? center.y : max.y,
            zi === 0 ? center.z : max.z,
          );
          children.push({ bounds: new THREE.Box3(childMin, childMax), children: [], items: [] });
        }
      }
    }
    node.children = children;
  }
}
