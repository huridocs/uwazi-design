// Path finding over a `ChainGraph` (utils/chainTraversal.ts): the shortest
// paths between two entities, and the neighbours they share. Breadth-first over
// the edges in both directions; the corpus graphs are small enough (Nepal 5,319
// edges, CEJIL 16,998) to search in memory on demand.
import type { ChainGraph, GraphEdge } from "./chainTraversal";

export interface PathOptions {
  /** Longest path searched, in hops. Default 4. */
  maxHops?: number;
  /** Templates an intermediate node may not have. The two ends may. */
  skipTypeIds?: ReadonlySet<string>;
  /** Paths listed at most. Default 20. */
  maxPaths?: number;
}

export interface PathResult {
  /** Node ids, `from` first and `to` last. All of the same, shortest length. */
  paths: string[][];
  /** Hops of the shortest path; null when there is none within `maxHops`. */
  hops: number | null;
  /** True when more shortest paths exist than `maxPaths`. */
  truncated: boolean;
}

/** Every shortest path from `from` to `to`, up to `maxHops`. A layered BFS
 *  keeps every parent at the shortest distance, then the paths are read back
 *  from `to`. */
export function shortestPaths(graph: ChainGraph, from: string, to: string, opts: PathOptions = {}): PathResult {
  const maxHops = opts.maxHops ?? 4;
  const maxPaths = opts.maxPaths ?? 20;
  const skip = opts.skipTypeIds;
  if (from === to) return { paths: [], hops: null, truncated: false };

  const dist = new Map<string, number>([[from, 0]]);
  const parents = new Map<string, string[]>();
  let frontier = [from];
  let found = false;
  for (let d = 0; d < maxHops && frontier.length && !found; d++) {
    const next: string[] = [];
    for (const u of frontier) {
      for (const e of graph.neighbors(u)) {
        const v = e.neighborId;
        if (v !== to && skip?.size) {
          const t = graph.templateOf(v);
          if (t && skip.has(t)) continue;
        }
        const dv = dist.get(v);
        if (dv === undefined) {
          dist.set(v, d + 1);
          parents.set(v, [u]);
          if (v === to) found = true;
          else next.push(v);
        } else if (dv === d + 1) {
          const ps = parents.get(v)!;
          if (!ps.includes(u)) ps.push(u);
        }
      }
    }
    frontier = next;
  }
  if (!found) return { paths: [], hops: null, truncated: false };

  const paths: string[][] = [];
  let truncated = false;
  const walk = (node: string, tail: string[]) => {
    if (truncated) return;
    if (node === from) {
      if (paths.length >= maxPaths) truncated = true;
      else paths.push([from, ...tail]);
      return;
    }
    for (const p of parents.get(node) ?? []) walk(p, [node, ...tail]);
  };
  walk(to, []);
  return { paths, hops: dist.get(to)!, truncated };
}

/** The edges between two adjacent nodes, as seen from `a`, one per relation
 *  type and direction. */
export function edgesBetween(graph: ChainGraph, a: string, b: string): GraphEdge[] {
  const seen = new Set<string>();
  const out: GraphEdge[] = [];
  for (const e of graph.neighbors(a)) {
    if (e.neighborId !== b) continue;
    const key = `${e.relationType}|${e.direction}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

export interface CommonNeighbour {
  id: string;
  fromA: GraphEdge[];
  fromB: GraphEdge[];
}

/** The entities linked to both `a` and `b` (the two-hop case), with the edges
 *  that link each end to them. */
export function commonNeighbours(
  graph: ChainGraph,
  a: string,
  b: string,
  opts: { skipTypeIds?: ReadonlySet<string> } = {},
): CommonNeighbour[] {
  const skip = opts.skipTypeIds;
  const ofA = new Map<string, GraphEdge[]>();
  for (const e of graph.neighbors(a)) {
    if (e.neighborId === b || e.neighborId === a) continue;
    const t = graph.templateOf(e.neighborId);
    if (skip?.size && t && skip.has(t)) continue;
    const arr = ofA.get(e.neighborId);
    if (arr) arr.push(e);
    else ofA.set(e.neighborId, [e]);
  }
  const out = new Map<string, CommonNeighbour>();
  for (const e of graph.neighbors(b)) {
    const fromA = ofA.get(e.neighborId);
    if (!fromA) continue;
    const row = out.get(e.neighborId) ?? { id: e.neighborId, fromA, fromB: [] };
    row.fromB.push(e);
    out.set(e.neighborId, row);
  }
  return [...out.values()];
}
