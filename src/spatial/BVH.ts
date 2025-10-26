type BVHNode = {
  start: number;
  count: number;
  left: number;
  right: number;
};

export class BVH {
  private readonly nodes: BVHNode[] = [];

  build(triangleCount: number): void {
    this.nodes.length = 0;
    this.nodes.push({ start: 0, count: triangleCount, left: -1, right: -1 });
  }

  traverse(callback: (start: number, count: number) => void): void {
    for (const node of this.nodes) {
      callback(node.start, node.count);
    }
  }
}
