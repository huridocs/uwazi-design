// Lay out the Library's Network view ahead of time, one file per collection.
//
//   node scripts/build-network-layout.mjs [cejil|nepal|travesia|vegas|mock ...]
//
// The Network view draws a whole collection: one node per record the Library
// lists, one edge per unordered pair of records that a stored reference joins.
// Laying out CEJIL (4,398 nodes, 16,585 edges) takes seconds, so it is done
// here, once, and the view only reads positions. Nothing in the app re-runs a
// layout: filters, toggles and type changes change what is drawn, never where.
//
// Output, next to each lazy corpus's JSON (the Sample's in public/sample-data/):
//
//   { v, n, sizes: [community sizes], ids: "id\nid\n…", xy: base64 Int16 x,y }
//
// Records are grouped by community, largest first, so a community is a run of
// `sizes[i]` ids and needs no per-node byte. Positions are quantised to Int16
// over ±16,000. CEJIL comes to about 100 KB.
//
// Determinism: records are added in sorted id order, starting positions come
// from a seeded generator, Louvain takes the same seeded generator, and
// ForceAtlas2 runs synchronously for a fixed number of iterations. Two runs write
// the same bytes.
//
// Weights: an edge that touches a high-degree record (a País, an Organismo, a
// judge who signed hundreds of rulings, the Vegas map's Source) weighs 0.1 in both the layout and the
// communities, and the layout then weighs edges by community (see `layout`). At full weight those few records pull the whole collection into
// one ball around them; at 0.1 the cases and their documents keep their own
// clusters. The thresholds are the view's "hub" thresholds (`HUB_DEGREE` in
// src/data/network/graph.ts): 100 neighbours in CEJIL, 50 in Nepal and Las Vegas, 20 in the
// Sample and Red Travesía.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import Graph from "graphology";
import forceAtlas2 from "graphology-layout-forceatlas2";
import louvain from "graphology-communities-louvain";

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = (...p) => path.join(APP, "public", ...p);
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

const HUB_DEGREE = { cejil: 100, nepal: 50, travesia: 20, vegas: 50, mock: 20 };
const ITERATIONS = 800;
/** Edge weight multipliers inside and between communities, for the layout only. */
const INSIDE = 5;
const BETWEEN = 0.2;
const SEED = 20261006;

/** mulberry32: a small seeded generator, so a run is reproducible. */
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── Corpora: node ids and endpoint pairs, as the app reads them ─────────── */

function cejil() {
  const ents = readJson(pub("cejil-data", "entities.json")).filter((e) => e.language === "es");
  const rels = readJson(pub("cejil-data", "relationships.json"));
  return { ids: ents.map((e) => e.sharedId), pairs: rels.map((r) => [r.from, r.to]) };
}

function nepal() {
  const ents = readJson(pub("nepal-data", "entities.json"));
  const rels = readJson(pub("nepal-data", "relationships.json"));
  return { ids: ents.map((e) => e.sharedId), pairs: rels.map((r) => [r.from, r.to]) };
}

function vegas() {
  const ents = readJson(pub("vegas-data", "entities.json"));
  const rels = readJson(pub("vegas-data", "relationships.json"));
  return { ids: ents.map((e) => e.sharedId), pairs: rels.map((r) => [r.from, r.to]) };
}

function travesia() {
  const ents = readJson(pub("travesia-data", "entities.json"));
  const rels = readJson(pub("travesia-data", "relationships.json"));
  return { ids: ents.map((e) => e.sharedId), pairs: rels.map((r) => [r.from, r.to]) };
}

/** The Sample is TypeScript in the bundle, so bundle its two seed modules with
 *  esbuild (Vite's own copy) and read the result. */
async function mock() {
  const { build } = await import("esbuild");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "network-sample-"));
  const entry = path.join(dir, "entry.ts");
  fs.writeFileSync(
    entry,
    `import { entities } from ${JSON.stringify(path.join(APP, "src/data/entities"))};
import { references } from ${JSON.stringify(path.join(APP, "src/data/references"))};
export const ids = entities.map((e) => e.id);
export const pairs = references.map((r) => [r.sourceEntityId, r.targetEntityId]);`,
  );
  const out = path.join(dir, "out.mjs");
  await build({
    entryPoints: [entry],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: out,
    logLevel: "error",
    loader: { ".txt": "text", ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty" },
    define: { "import.meta.env": JSON.stringify({ BASE_URL: "/", DEV: false, PROD: true }) },
  });
  const mod = await import(pathToFileURL(out).href);
  fs.rmSync(dir, { recursive: true, force: true });
  return { ids: mod.ids, pairs: mod.pairs };
}

const CORPORA = {
  cejil: { load: cejil, out: pub("cejil-data", "network.json") },
  nepal: { load: nepal, out: pub("nepal-data", "network.json") },
  travesia: { load: travesia, out: pub("travesia-data", "network.json") },
  vegas: { load: vegas, out: pub("vegas-data", "network.json") },
  mock: { load: mock, out: pub("sample-data", "network.json") },
};

/* ── Layout ─────────────────────────────────────────────────────────────── */

function layout(name, { ids, pairs }) {
  const rand = rngFrom(SEED);
  const graph = new Graph({ type: "undirected", multi: false });
  const sorted = [...new Set(ids)].sort();
  for (const id of sorted) graph.addNode(id, { x: (rand() - 0.5) * 1000, y: (rand() - 0.5) * 1000 });
  // One edge per unordered pair; references to records the Library does not
  // list (the Sample's dangling ids) are dropped, as the view drops them.
  const keyed = new Map();
  for (const [a, b] of pairs) {
    if (a === b || !graph.hasNode(a) || !graph.hasNode(b)) continue;
    const [x, y] = a < b ? [a, b] : [b, a];
    keyed.set(`${x}\u0000${y}`, [x, y]);
  }
  for (const k of [...keyed.keys()].sort()) {
    const [x, y] = keyed.get(k);
    graph.addEdge(x, y, { weight: 1 });
  }
  const hub = HUB_DEGREE[name];
  graph.forEachEdge((e, attr, a, b) => {
    if (graph.degree(a) >= hub || graph.degree(b) >= hub) graph.setEdgeAttribute(e, "weight", 0.1);
  });

  // Communities first, so the layout can keep each one together: edges inside
  // a community pull 5×, edges between communities 0.2×. Without this the
  // communities interleave across one disc (each member's spread measured
  // 0.47 of the whole drawing's in CEJIL; with it, 0.21). linLog mode is off:
  // with the inferred scaling it spread CEJIL evenly over the disc (0.99).
  const communities = louvain(graph, { rng: rngFrom(SEED), getEdgeWeight: "weight" });
  graph.forEachEdge((e, attr, a, b) =>
    graph.setEdgeAttribute(e, "weight", attr.weight * (communities[a] === communities[b] ? INSIDE : BETWEEN)),
  );

  const t0 = performance.now();
  const settings = {
    ...forceAtlas2.inferSettings(graph),
    barnesHutOptimize: graph.order > 500,
    outboundAttractionDistribution: true,
    edgeWeightInfluence: 1,
  };
  forceAtlas2.assign(graph, { iterations: ITERATIONS, settings, getEdgeWeight: "weight" });
  const tLayout = performance.now() - t0;

  // Quantise to Int16 over ±16,000, centred on the bounding box.
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  graph.forEachNode((_, a) => {
    minX = Math.min(minX, a.x); maxX = Math.max(maxX, a.x);
    minY = Math.min(minY, a.y); maxY = Math.max(maxY, a.y);
  });
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const scale = 16000 / Math.max(1e-9, (maxX - minX) / 2, (maxY - minY) / 2);

  // Communities renumbered largest first (ties by smallest member id).
  const members = new Map();
  for (const id of sorted) {
    const c = communities[id];
    if (!members.has(c)) members.set(c, []);
    members.get(c).push(id);
  }
  const groups = [...members.values()].sort((a, b) => b.length - a.length || (a[0] < b[0] ? -1 : 1));
  const order = groups.flat();
  const xy = new Int16Array(order.length * 2);
  order.forEach((id, i) => {
    const a = graph.getNodeAttributes(id);
    xy[i * 2] = Math.round((a.x - cx) * scale);
    xy[i * 2 + 1] = Math.round((a.y - cy) * scale);
  });
  const body = {
    v: 1,
    n: order.length,
    sizes: groups.map((g) => g.length),
    ids: order.join("\n"),
    xy: Buffer.from(xy.buffer).toString("base64"),
  };
  return { body, edges: graph.size, tLayout, communities: groups.length };
}

const wanted = process.argv.slice(2);
for (const name of wanted.length ? wanted : Object.keys(CORPORA)) {
  const corpus = CORPORA[name];
  if (!corpus) throw new Error(`Unknown collection "${name}"`);
  const data = await corpus.load();
  const { body, edges, tLayout, communities } = layout(name, data);
  fs.mkdirSync(path.dirname(corpus.out), { recursive: true });
  const json = JSON.stringify(body);
  fs.writeFileSync(corpus.out, json);
  const big = body.sizes.filter((s) => s >= 50).length;
  console.log(
    `${name}: ${body.n} nodes, ${edges} edges, ${communities} communities (${big} of ≥50), ` +
      `layout ${(tLayout / 1000).toFixed(2)} s, ${(json.length / 1024).toFixed(1)} KB → ${path.relative(APP, corpus.out)}`,
  );
}
