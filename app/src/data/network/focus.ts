// Focus layout for the Network view: a filter's matches and their one-hop
// neighbours, re-laid out on their own so they read as a graph instead of
// scattered points across the whole collection. The layout runs in
// `focusLayout.worker.ts`; this file picks the members, sends them, and keeps
// the last few results so returning to a filter costs nothing.
import { otherEnd, type NetworkGraph } from "./graph";
import type { NetworkPlacement } from "./layout";

/** Focus is offered up to this many matches. Past it the members (matches
 *  plus neighbours) get too many for a layout that should take well under a
 *  second, and the set is the collection more than a part of it. */
export const FOCUS_MAX = 1000;

export interface FocusRequest {
  id: number;
  /** Per member: 1 for a hub, which is pinned at the edge. */
  hub: Uint8Array;
  /** Per member: seed x, y (its global position). */
  xy: Float32Array;
  /** Edges between members, as member indexes. */
  ea: Uint32Array;
  eb: Uint32Array;
  /** Layout units per member of spacing, so the result's scale matches the
   *  global drawing's. */
  unit: number;
}

export interface FocusResponse {
  id: number;
  xy: Float32Array;
  ms: number;
  iterations: number;
}

export interface FocusLayout {
  /** Every node's position: members re-laid out, the rest where they were. */
  pos: Float32Array;
  /** Per node: 1 for a member of the focus layout. */
  member: Uint8Array;
  /** Bounds of the members, for the layout's base zoom. */
  extent: { minX: number; maxX: number; minY: number; maxY: number };
  ms: number;
}

interface Members {
  nodes: number[];
  req: Omit<FocusRequest, "id">;
}

/** The matches, their non-hub neighbours and the hubs they touch, over the
 *  edges drawn. Only edges with a matching end take part, as only those draw. */
export function focusMembers(
  g: NetworkGraph,
  placement: NetworkPlacement,
  match: Uint8Array,
  edgeOn: Uint8Array,
  nodeOn: Uint8Array,
  hubDegree: number,
): Members {
  const n = g.ids.length;
  const local = new Int32Array(n).fill(-1);
  const nodes: number[] = [];
  const add = (i: number) => {
    if (local[i] < 0) {
      local[i] = nodes.length;
      nodes.push(i);
    }
  };
  for (let i = 0; i < n; i++) if (match[i] && nodeOn[i]) add(i);
  const matchCount = nodes.length;
  const ea: number[] = [];
  const eb: number[] = [];
  for (let k = 0; k < matchCount; k++) {
    const i = nodes[k];
    for (let j = g.adjStart[i]; j < g.adjStart[i + 1]; j++) {
      const e = g.adjEdge[j];
      if (!edgeOn[e]) continue;
      const o = otherEnd(g, e, i);
      // A match–match edge is seen from both ends: keep it once.
      if (match[o] && o < i) continue;
      add(o);
      ea.push(local[i]);
      eb.push(local[o]);
    }
  }
  const hub = new Uint8Array(nodes.length);
  const xy = new Float32Array(nodes.length * 2);
  nodes.forEach((i, k) => {
    hub[k] = g.degree[i] >= hubDegree ? 1 : 0;
    xy[k * 2] = placement.pos[i * 2];
    xy[k * 2 + 1] = placement.pos[i * 2 + 1];
  });
  const { minX, maxX, minY, maxY } = placement.extent;
  const unit = (Math.max(maxX - minX, maxY - minY) / Math.sqrt(Math.max(1, n))) * 0.7 || 100;
  return { nodes, req: { hub, xy, ea: Uint32Array.from(ea), eb: Uint32Array.from(eb), unit } };
}

/** Every node's position with the members moved to the worker's result. */
function assemble(placement: NetworkPlacement, nodes: number[], xy: Float32Array, ms: number): FocusLayout {
  const pos = new Float32Array(placement.pos);
  const member = new Uint8Array(pos.length / 2);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach((i, k) => {
    const x = xy[k * 2];
    const y = xy[k * 2 + 1];
    pos[i * 2] = x;
    pos[i * 2 + 1] = y;
    member[i] = 1;
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  });
  if (minX > maxX) minX = maxX = minY = maxY = 0;
  return { pos, member, extent: { minX, maxX, minY, maxY }, ms };
}

let worker: Worker | null = null;
let nextId = 1;
const waiting = new Map<number, (r: FocusResponse | null) => void>();
const results = new Map<string, FocusLayout>();
const RESULTS_KEPT = 8;

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./focusLayout.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return null;
  }
  worker.onmessage = (e: MessageEvent<FocusResponse>) => {
    waiting.get(e.data.id)?.(e.data);
    waiting.delete(e.data.id);
  };
  worker.onerror = () => {
    for (const done of waiting.values()) done(null);
    waiting.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}

/** A focus layout already computed for `key`, if any. */
export const cachedFocus = (key: string) => results.get(key) ?? null;

/** Lay out `members` in the worker. Resolves null when there is no worker or
 *  it fails; the view then stays on the global layout. */
export function runFocus(key: string, placement: NetworkPlacement, members: Members): Promise<FocusLayout | null> {
  const hit = results.get(key);
  if (hit) return Promise.resolve(hit);
  // A newer request supersedes the one in flight: the worker is restarted
  // rather than left to finish a layout nobody will draw.
  if (waiting.size) {
    for (const done of waiting.values()) done(null);
    waiting.clear();
    worker?.terminate();
    worker = null;
  }
  const w = getWorker();
  if (!w) return Promise.resolve(null);
  const id = nextId++;
  return new Promise((resolve) => {
    waiting.set(id, (r) => {
      if (!r) return resolve(null);
      const out = assemble(placement, members.nodes, r.xy, r.ms);
      results.set(key, out);
      if (results.size > RESULTS_KEPT) results.delete(results.keys().next().value!);
      resolve(out);
    });
    const req: FocusRequest = { id, ...members.req };
    w.postMessage(req);
  });
}
