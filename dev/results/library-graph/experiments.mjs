import { loadCejil, loadNepal, loadSample } from "./load.mjs";
import { buildIndex, components } from "./graphlib.mjs";
import fs from "node:fs";
import { createRequire } from "node:module";
const SP = "/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/6b0c84df-2009-4840-9635-261b4fd286f1/scratchpad/lay/";
const require = createRequire(SP);
const Graph = require("graphology"); const louvain = require("graphology-communities-louvain");

const HIST = [["1", 1, 1], ["2–5", 2, 5], ["6–50", 6, 50], ["51–500", 51, 500], [">500", 501, 1e9]];
const hist = (sizes) => HIST.map(([l, lo, hi]) => `${l}: ${sizes.filter((x) => x >= lo && x <= hi).length}`).join(", ");

function withoutTypes(g, drop) {
  const edges = g.edges.filter((e) => !drop.includes(e.type));
  return { nodes: g.nodes, edges };
}
function compStats(g) {
  const idx = buildIndex(g); const c = components([...g.nodes.keys()], idx.pairs);
  return { pairs: idx.pairs.length, comps: c.sizes.length, largest: c.sizes[0], share: (c.sizes[0] / g.nodes.size * 100).toFixed(1) + "%", hist: hist(c.sizes), isolated: c.sizes.filter((x) => x === 1).length };
}
function louv(g, label) {
  const idx = buildIndex(g); const G = new Graph({ type: "undirected" });
  for (const id of g.nodes.keys()) G.addNode(id);
  for (const p of idx.pairs) G.addEdge(p.a, p.b);
  const t0 = performance.now(); const comm = louvain(G, { resolution: 1 }); const ms = performance.now() - t0;
  const sizes = new Map(); for (const c of Object.values(comm)) sizes.set(c, (sizes.get(c) || 0) + 1);
  const arr = [...sizes.values()].sort((a, b) => b - a);
  // template purity: share of nodes whose template is the community's majority template
  const byC = new Map(); for (const [id, c] of Object.entries(comm)) { const t = g.nodes.get(id).tpl; let m = byC.get(c); if (!m) byC.set(c, (m = new Map())); m.set(t, (m.get(t) || 0) + 1); }
  let pure = 0; for (const m of byC.values()) pure += Math.max(...m.values());
  console.log(`  Louvain ${label}: ${arr.length} communities (${arr.filter((x) => x > 1).length} with >1 node), top sizes ${arr.slice(0, 12).join(",")}; ≥50 nodes: ${arr.filter((x) => x >= 50).length}; ≤5 nodes: ${arr.filter((x) => x <= 5).length}; template purity ${(pure / g.nodes.size * 100).toFixed(0)}%; ${ms.toFixed(0)} ms`);
  return { comm, arr };
}

const cej = loadCejil(), nep = loadNepal(), sam = loadSample();
console.log("CEJIL all types:", compStats(cej));
for (const drop of [["Mecanismo"], ["Mecanismo", "País"], ["Mecanismo", "País", "Paises", "Relacionado a"], ["Mecanismo", "País", "Paises", "Relacionado a", "(untyped)"], ["Mecanismo", "País", "Paises", "Relacionado a", "(untyped)", "Firmantes", "Firmante Voto separado", "Multi Select"]])
  console.log("CEJIL minus", drop.join("+"), compStats(withoutTypes(cej, drop)));
louv(cej, "all types");
louv(withoutTypes(cej, ["Mecanismo", "País", "Paises"]), "minus Mecanismo+País+Paises");
console.log("Nepal all:", compStats(nep));
for (const drop of [["reports_on"], ["reports_on", "supports", "disputes"], ["reports_on", "supports", "disputes", "concerns", "depicts", "claimed_by", "published_in", "documents"]])
  console.log("Nepal minus", drop.join("+"), compStats(withoutTypes(nep, drop)));
louv(nep, "all types");
louv(withoutTypes(nep, ["reports_on", "supports", "disputes"]), "minus reports_on+supports+disputes");
console.log("Sample all:", compStats(sam));
for (const drop of [["mentions", "relates_to", "cites", "refers_to", "no_label"], ["hearing_of"], ["mentions", "relates_to", "cites", "refers_to", "no_label", "hearing_of"]])
  console.log("Sample minus", drop.join("+"), compStats(withoutTypes(sam, drop)));
louv(sam, "all");
