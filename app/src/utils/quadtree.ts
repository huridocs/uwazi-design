/** A static point quadtree over `pos` (x, y pairs), for hit-testing a canvas
 *  drawing: built once per layout, then asked for the nearest point. */

const LEAF = 8;
const MAX_DEPTH = 16;

interface QuadNode {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Point indexes, on a leaf. */
  items?: number[];
  kids?: QuadNode[];
}

export interface Quadtree {
  /** The point nearest (x, y) within `maxDist` that `accept` allows, or -1. */
  nearest(x: number, y: number, maxDist: number, accept?: (i: number) => boolean): number;
}

export function buildQuadtree(pos: Float32Array, count = pos.length / 2): Quadtree {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < count; i++) {
    x0 = Math.min(x0, pos[i * 2]); x1 = Math.max(x1, pos[i * 2]);
    y0 = Math.min(y0, pos[i * 2 + 1]); y1 = Math.max(y1, pos[i * 2 + 1]);
  }
  const all = Array.from({ length: count }, (_, i) => i);
  const root = split({ x0, y0, x1: Math.max(x1, x0 + 1), y1: Math.max(y1, y0 + 1) }, all, 0);

  function split(box: QuadNode, items: number[], depth: number): QuadNode {
    if (items.length <= LEAF || depth >= MAX_DEPTH) return { ...box, items };
    const mx = (box.x0 + box.x1) / 2;
    const my = (box.y0 + box.y1) / 2;
    const parts: number[][] = [[], [], [], []];
    for (const i of items) parts[(pos[i * 2] >= mx ? 1 : 0) + (pos[i * 2 + 1] >= my ? 2 : 0)].push(i);
    const boxes = [
      { x0: box.x0, y0: box.y0, x1: mx, y1: my },
      { x0: mx, y0: box.y0, x1: box.x1, y1: my },
      { x0: box.x0, y0: my, x1: mx, y1: box.y1 },
      { x0: mx, y0: my, x1: box.x1, y1: box.y1 },
    ];
    return { ...box, kids: boxes.map((b, k) => split(b, parts[k], depth + 1)) };
  }

  return {
    nearest(x, y, maxDist, accept) {
      let best = -1;
      let bestD = maxDist * maxDist;
      const visit = (q: QuadNode) => {
        const dx = Math.max(q.x0 - x, 0, x - q.x1);
        const dy = Math.max(q.y0 - y, 0, y - q.y1);
        if (dx * dx + dy * dy > bestD) return;
        if (q.items) {
          for (const i of q.items) {
            const d = (pos[i * 2] - x) ** 2 + (pos[i * 2 + 1] - y) ** 2;
            if (d <= bestD && (!accept || accept(i))) {
              bestD = d;
              best = i;
            }
          }
          return;
        }
        for (const k of q.kids!) visit(k);
      };
      visit(root);
      return best;
    },
  };
}
