import * as THREE from 'three';

export type Triangle = {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
};

export class BVHNode {
  public readonly bounds: THREE.Box3;
  public readonly triangles: Triangle[];
  public readonly left: BVHNode | null;
  public readonly right: BVHNode | null;

  public constructor(triangles: Triangle[], depth = 0) {
    this.bounds = new THREE.Box3();
    this.triangles = triangles;
    for (const tri of triangles) {
      this.bounds.expandByPoint(tri.a);
      this.bounds.expandByPoint(tri.b);
      this.bounds.expandByPoint(tri.c);
    }

    if (triangles.length <= 4 || depth > 16) {
      this.left = null;
      this.right = null;
      return;
    }

    const size = new THREE.Vector3();
    this.bounds.getSize(size);
    const axis = size.x > size.y && size.x > size.z ? 'x' : size.y > size.z ? 'y' : 'z';

    const sorted = [...triangles].sort((t1, t2) =>
      ((t1.a[axis] + t1.b[axis] + t1.c[axis]) / 3) - ((t2.a[axis] + t2.b[axis] + t2.c[axis]) / 3)
    );
    const mid = Math.floor(sorted.length / 2);
    this.left = new BVHNode(sorted.slice(0, mid), depth + 1);
    this.right = new BVHNode(sorted.slice(mid), depth + 1);
  }

  public intersects(ray: THREE.Ray): boolean {
    if (!ray.intersectsBox(this.bounds)) {
      return false;
    }
    if (this.left === null && this.right === null) {
      return this.triangles.some((tri) => ray.intersectTriangle(tri.a, tri.b, tri.c, false, new THREE.Vector3()) !== null);
    }
    const leftHit = this.left?.intersects(ray) ?? false;
    const rightHit = this.right?.intersects(ray) ?? false;
    return leftHit || rightHit;
  }
}
