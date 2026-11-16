import { loadCejil, loadNepal, loadSample } from "./load.mjs";
import { buildIndex, components } from "./graphlib.mjs";
import fs from "node:fs";

const BUCKETS = [["1", 1, 1], ["2–5", 2, 5], ["6–50", 6, 50], ["51–500", 51, 500], [">500", 501, Infinity]];
const hist = (sizes) => BUCKETS.map(([l, lo, hi]) => { const s = sizes.filter((x) => x >= lo && x <= hi); return { bucket: l, comps: s.length, nodes: s.reduce((a, b) => a + b, 0) }; });

function analyse(name, g) {
  const idx = buildIndex(g); const ids = [...g.nodes.keys()];
  const deg = new Map(ids.map((i) => [i, idx.adj.get(i).size]));
  const refDeg = new Map(ids.map((i) => [i, 0]));
  for (const e of g.edges) { refDeg.set(e.a, (refDeg.get(e.a) ?? 0) + 1); if (e.b !== e.a) refDeg.set(e.b, (refDeg.get(e.b) ?? 0) + 1); }
  const comp = components(ids, idx.pairs);
  const isolated = ids.filter((i) => deg.get(i) === 0).length;
  // edges by type: references, relationships ((pair,type)), and what each type's hubbiness looks like
  const byType = new Map();
  const typeNodeDeg = new Map(); // type -> Map(node -> deg within type)
  for (const e of g.edges) {
    let t = byType.get(e.type); if (!t) byType.set(e.type, (t = { refs: 0 }));
    t.refs++;
    let m = typeNodeDeg.get(e.type); if (!m) typeNodeDeg.set(e.type, (m = new Map()));
    m.set(e.a, (m.get(e.a) || 0) + 1); m.set(e.b, (m.get(e.b) || 0) + 1);
  }
  const relsByType = new Map();
  for (const p of idx.pairs) for (const t of p.types) relsByType.set(t, (relsByType.get(t) || 0) + 1);
  const types = [...byType.entries()].map(([t, v]) => {
    const m = typeNodeDeg.get(t); const maxNode = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
    return { type: t, refs: v.refs, rels: relsByType.get(t) || 0, nodes: m.size, maxDeg: maxNode[1], maxNode: g.nodes.get(maxNode[0])?.title ?? maxNode[0],
      shareOfRefs: v.refs / g.edges.length };
  }).sort((a, b) => b.refs - a.refs);
  const top = ids.map((i) => ({ id: i, title: g.nodes.get(i).title, tpl: g.nodes.get(i).tpl, deg: deg.get(i), refs: refDeg.get(i) })).sort((a, b) => b.deg - a.deg).slice(0, 20);
  // degree distribution
  const dd = [0, 1, 2, 3, 5, 10, 25, 50, 100, 250, 500].map((th) => [th, ids.filter((i) => deg.get(i) >= th).length]);
  // template matrix
  const tm = new Map(); const tplCount = new Map();
  for (const n of g.nodes.values()) tplCount.set(n.tpl, (tplCount.get(n.tpl) || 0) + 1);
  for (const p of idx.pairs) { const a = g.nodes.get(p.a)?.tpl, b = g.nodes.get(p.b)?.tpl; if (!a || !b) continue; const k = a < b ? `${a} — ${b}` : `${b} — ${a}`; tm.set(k, (tm.get(k) || 0) + 1); }
  const tplPairs = [...tm.entries()].sort((a, b) => b[1] - a[1]);
  return { name, g, idx, ids, deg, comp, isolated, types, top, dd, tplCount: [...tplCount.entries()].sort((a, b) => b[1] - a[1]), tplPairs };
}

export function run(name, g, hubThreshold) {
  const a = analyse(name, g);
  const sizes = a.comp.sizes;
  const res = {
    name, nodes: a.ids.length, refs: g.edges.length, pairs: a.idx.pairs.length, dangling: g.dangling,
    comps: sizes.length, hist: hist(sizes), largest: sizes[0], largestShare: sizes[0] / a.ids.length,
    second: sizes[1], third: sizes[2], isolated: a.isolated, nonTrivial: sizes.filter((x) => x > 1).length,
    avgDeg: (2 * a.idx.pairs.length) / a.ids.length, medianDeg: [...a.deg.values()].sort((x, y) => x - y)[Math.floor(a.ids.length / 2)],
    types: a.types, top: a.top, degDist: a.dd, tplCount: a.tplCount, tplPairs: a.tplPairs.slice(0, 12), tplPairCount: a.tplPairs.length,
  };
  // Remove super-hub nodes (degree >= threshold): do components fall apart?
  const hubs = new Set(a.ids.filter((i) => a.deg.get(i) >= hubThreshold));
  const pairsNoHub = a.idx.pairs.filter((p) => !hubs.has(p.a) && !hubs.has(p.b));
  const idsNoHub = a.ids.filter((i) => !hubs.has(i));
  const c2 = components(idsNoHub, pairsNoHub);
  res.noHub = { threshold: hubThreshold, hubs: hubs.size, hubEdgesRemoved: a.idx.pairs.length - pairsNoHub.length, pairs: pairsNoHub.length, nodes: idsNoHub.length,
    comps: c2.sizes.length, largest: c2.sizes[0], largestShare: c2.sizes[0] / idsNoHub.length, isolated: idsNoHub.filter((i) => !pairsNoHub.some(() => false)).length, hist: hist(c2.sizes),
    hubList: [...hubs].map((i) => ({ title: g.nodes.get(i).title, tpl: g.nodes.get(i).tpl, deg: a.deg.get(i) })).sort((x, y) => y.deg - x.deg).slice(0, 15) };
  // isolated after hub removal
  const dgn = new Map(idsNoHub.map((i) => [i, 0])); for (const p of pairsNoHub) { dgn.set(p.a, dgn.get(p.a) + 1); dgn.set(p.b, dgn.get(p.b) + 1); }
  res.noHub.isolated = [...dgn.values()].filter((d) => d === 0).length;
  return { res, a, hubs };
}

if (process.argv[1].endsWith("full.mjs")) {
  const all = {};
  for (const [name, load, th] of [["Sample", loadSample, 20], ["CEJIL", loadCejil, 100], ["Nepal", loadNepal, 50]]) {
    const { res } = run(name, load(), th); all[name] = res;
  }
  fs.writeFileSync(new URL("./full.json", import.meta.url), JSON.stringify(all, null, 1));
  console.log(JSON.stringify(all, null, 1).slice(0, 30000));
}
