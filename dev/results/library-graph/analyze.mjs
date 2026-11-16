import { loadCejil, loadNepal, loadSample } from "./load.mjs";
import { buildIndex, measure } from "./graphlib.mjs";
import { CEJIL, NEPAL, SAMPLE } from "./filters.mjs";
import fs from "node:fs";

const corpora = { Sample: [loadSample, SAMPLE, 20], CEJIL: [loadCejil, CEJIL, 100], Nepal: [loadNepal, NEPAL, 50] };
const out = {};
for (const [name, [load, filters, th]] of Object.entries(corpora)) {
  const g = load(); const idx = buildIndex(g); const hubs = new Set([...g.nodes.keys()].filter((i) => idx.adj.get(i).size >= th));
  out[name] = { total: { nodes: g.nodes.size, refs: g.edges.length, pairs: idx.pairs.length }, filters: filters.map(([label, f]) => ({ label, ...measure(g, idx, f, hubs) })), hubs: hubs.size, hubThreshold: th };
}
fs.writeFileSync(new URL("./filtered.json", import.meta.url), JSON.stringify(out, null, 1));
const f = (x, d = 1) => x.toFixed(d);
for (const [name, o] of Object.entries(out)) {
  console.log(`\n## ${name} total`, o.total);
  console.log("hubs", o.hubs, "threshold", o.hubThreshold);
  console.log("| filter | n | inner pairs | inner rels | outside pairs | outside nbrs | comps | non-trivial | largest | isolated | iso w/ outside link | max deg | avg deg | density | 1-hop closure |");
  for (const r of o.filters) console.log(`| ${r.label} | ${r.n} | ${r.inner} | ${r.innerRels} | ${r.outer} | ${r.outsideNbrs} | ${r.comps} | ${r.nonTrivialComps} | ${r.largest} | ${r.isolated} | ${r.isolatedButLinkedOut} | ${r.maxDeg} | ${f(r.avgDeg,2)} | ${f(r.density*100,2)}% | ${r.closure} | noHub inner ${r.innerNoHub}, comps ${r.compsNoHub}, nontriv ${r.nonTrivialNoHub}, largest ${r.largestNoHub}; out->hub ${r.outerToHub}, out->nonhub ${r.outerToNonHub}, nonhub nbrs ${r.outsideNonHubNbrs}, closureNoHub ${r.closureNoHub}, hubsInSet ${r.hubsInSet}`);
}
