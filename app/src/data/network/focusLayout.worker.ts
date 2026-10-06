/// <reference lib="webworker" />
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { FocusRequest, FocusResponse } from "./focus";

/** Lays out a filter's matches and their neighbours off the main thread
 *  (`data/network/focus.ts` builds the request).
 *
 *  1. ForceAtlas2 over the non-hub members, seeded from their global
 *     positions, so the move from the global layout is continuous.
 *  2. Hubs go on a ring outside the drawing, each at the angle of the members
 *     it links to.
 *  3. A shorter run with the hubs fixed and their edges at a tenth of the
 *     weight, so records tied to a hub lean towards it without being pulled in.
 *
 *  Deterministic: the same request gives the same positions. */

const ctx = self as unknown as DedicatedWorkerGlobalScope;

/** FA2 settles at about this RMS radius per sqrt(member) in its own units. */
const FA2_UNIT = 10;

function layout(req: FocusRequest): FocusResponse {
  const t0 = performance.now();
  const m = req.hub.length;
  const xy = new Float32Array(req.xy);

  // Seeds into FA2's scale, about the centroid of the non-hub members.
  let cx = 0, cy = 0, free = 0;
  for (let i = 0; i < m; i++) {
    if (req.hub[i]) continue;
    cx += xy[i * 2];
    cy += xy[i * 2 + 1];
    free++;
  }
  cx /= Math.max(1, free);
  cy /= Math.max(1, free);
  let ss = 0;
  for (let i = 0; i < m; i++) if (!req.hub[i]) ss += (xy[i * 2] - cx) ** 2 + (xy[i * 2 + 1] - cy) ** 2;
  const r0 = Math.sqrt(ss / Math.max(1, free)) || 1;
  const s = (FA2_UNIT * Math.sqrt(Math.max(1, free))) / r0;

  const g = new Graph({ type: "undirected", multi: false });
  for (let i = 0; i < m; i++) {
    if (req.hub[i]) continue;
    // Two seeds on one point would never separate: nudge by index.
    const a = i * 2.399963;
    g.addNode(i, { x: (xy[i * 2] - cx) * s + Math.cos(a) * 0.01, y: (xy[i * 2 + 1] - cy) * s + Math.sin(a) * 0.01 });
  }
  const hubEdges: [number, number][] = [];
  for (let e = 0; e < req.ea.length; e++) {
    const a = req.ea[e];
    const b = req.eb[e];
    if (req.hub[a] || req.hub[b]) hubEdges.push([a, b]);
    else if (!g.hasEdge(a, b)) g.addEdge(a, b, { weight: 1 });
  }

  const iterations = Math.round(Math.min(400, Math.max(80, 120000 / Math.max(1, free))));
  const settings = {
    ...forceAtlas2.inferSettings(g),
    barnesHutOptimize: g.order > 300,
    outboundAttractionDistribution: true,
    edgeWeightInfluence: 1,
  };
  if (g.order) forceAtlas2.assign(g, { iterations, settings, getEdgeWeight: "weight" });

  // Hubs on a ring just outside the drawing.
  let R = 0;
  g.forEachNode((_, a) => (R = Math.max(R, Math.hypot(a.x, a.y))));
  R = Math.max(R, FA2_UNIT) * 1.15;
  const hubs: { i: number; angle: number }[] = [];
  for (let i = 0; i < m; i++) {
    if (!req.hub[i]) continue;
    let sx = 0, sy = 0;
    for (const [a, b] of hubEdges) {
      const o = a === i ? b : b === i ? a : -1;
      if (o < 0 || req.hub[o]) continue;
      const at = g.getNodeAttributes(o);
      sx += at.x;
      sy += at.y;
    }
    // No free neighbour, or one at the centre: keep its global direction.
    const angle = Math.hypot(sx, sy) > 1e-6 ? Math.atan2(sy, sx) : Math.atan2(xy[i * 2 + 1] - cy, xy[i * 2] - cx);
    hubs.push({ i, angle });
  }
  // Keep hubs apart on the ring: at least this angle between two.
  hubs.sort((p, q) => p.angle - q.angle);
  const gap = Math.min(0.35, (Math.PI * 2) / Math.max(1, hubs.length) * 0.8);
  for (let k = 1; k < hubs.length; k++) if (hubs[k].angle - hubs[k - 1].angle < gap) hubs[k].angle = hubs[k - 1].angle + gap;
  for (const h of hubs) g.addNode(h.i, { x: Math.cos(h.angle) * R, y: Math.sin(h.angle) * R, fixed: true });

  if (hubs.length && g.order > hubs.length) {
    for (const [a, b] of hubEdges) if (!g.hasEdge(a, b)) g.addEdge(a, b, { weight: 0.1 });
    forceAtlas2.assign(g, { iterations: Math.round(iterations / 3), settings, getEdgeWeight: "weight" });
  }

  // Back into layout units: the members' spread at the scale of the global
  // drawing's spacing, about their seed centroid.
  const back = req.unit / FA2_UNIT;
  const out = new Float32Array(m * 2);
  g.forEachNode((key, a) => {
    const i = Number(key);
    out[i * 2] = cx + a.x * back;
    out[i * 2 + 1] = cy + a.y * back;
  });
  return { id: req.id, xy: out, ms: performance.now() - t0, iterations };
}

ctx.onmessage = (e: MessageEvent<FocusRequest>) => {
  const res = layout(e.data);
  ctx.postMessage(res, [res.xy.buffer]);
};
