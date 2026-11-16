// Layout timing in Node (V8). A browser main thread is about the same speed per tick; a Worker removes the jank, not the time.
import { loadCejil, loadNepal, loadSample } from "./load.mjs";
import { buildIndex } from "./graphlib.mjs";
import { createRequire } from "node:module";
const SP = "/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/6b0c84df-2009-4840-9635-261b4fd286f1/scratchpad/lay/";
const require = createRequire(SP);
const d3 = require("d3-force"); const Graph = require("graphology"); const fa2 = require("graphology-layout-forceatlas2");

function d3run(g, idx, ticks) {
  const ids = [...g.nodes.keys()]; const pos = new Map(ids.map((id, i) => [id, i]));
  const nodes = ids.map((id) => ({ id }));
  const links = idx.pairs.map((p) => ({ source: pos.get(p.a), target: pos.get(p.b) }));
  const sim = d3.forceSimulation(nodes).stop()
    .force("link", d3.forceLink(links).distance(30).strength(0.3))
    .force("charge", d3.forceManyBody().strength(-30).theta(0.9).distanceMax(300))
    .force("center", d3.forceCenter(0, 0));
  const t0 = performance.now(); let t100;
  for (let i = 0; i < ticks; i++) { sim.tick(); if (i === 99) t100 = performance.now() - t0; }
  return { total: performance.now() - t0, per100: t100 };
}
function fa2run(g, idx, iters) {
  const G = new Graph({ type: "undirected" });
  for (const id of g.nodes.keys()) G.addNode(id, { x: Math.random() * 100, y: Math.random() * 100 });
  for (const p of idx.pairs) G.addEdge(p.a, p.b);
  const t0 = performance.now();
  fa2.assign(G, { iterations: iters, settings: { barnesHutOptimize: true, strongGravityMode: false, gravity: 1, scalingRatio: 10, slowDown: 5 } });
  return performance.now() - t0;
}
function subset(g, n) { // BFS-ish: take the n highest-degree-first connected-ish nodes for a size ladder
  const idx = buildIndex(g); const order = [...g.nodes.keys()].sort((a, b) => idx.adj.get(b).size - idx.adj.get(a).size).slice(0, n); const keep = new Set(order);
  const nodes = new Map(order.map((i) => [i, g.nodes.get(i)])); const edges = g.edges.filter((e) => keep.has(e.a) && keep.has(e.b));
  return { nodes, edges };
}
const rows = [];
for (const [name, g] of [["CEJIL", loadCejil()], ["Nepal", loadNepal()], ["Sample", loadSample()]]) {
  const sizes = name === "CEJIL" ? [300, 1000, 2000, g.nodes.size] : name === "Nepal" ? [300, 1000, g.nodes.size] : [g.nodes.size];
  for (const n of sizes) {
    const sg = n === g.nodes.size ? g : subset(g, n); const idx = buildIndex(sg);
    // warm-up
    if (n > 500) d3run(sg, idx, 10);
    const a = d3run(sg, idx, 300); const b = fa2run(sg, idx, 300);
    rows.push({ corpus: name, nodes: sg.nodes.size, pairs: idx.pairs.length, d3_300ticks_ms: Math.round(a.total), d3_first100_ms: Math.round(a.per100), fa2_300it_ms: Math.round(b) });
  }
}
console.table(rows);
