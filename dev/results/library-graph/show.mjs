import fs from "node:fs";
const all = JSON.parse(fs.readFileSync(new URL("./full.json", import.meta.url)));
const p = (x) => (x * 100).toFixed(1) + "%";
for (const r of Object.values(all)) {
  console.log(`\n=== ${r.name}: nodes ${r.nodes}, refs ${r.refs}, pairs ${r.pairs}, dangling ${r.dangling}, comps ${r.comps} (nonTrivial ${r.nonTrivial}), largest ${r.largest} ${p(r.largestShare)}, 2nd ${r.second}, 3rd ${r.third}, isolated ${r.isolated}, avgDeg ${r.avgDeg.toFixed(2)}, medianDeg ${r.medianDeg}`);
  console.log("hist", r.hist.map((h) => `${h.bucket}: ${h.comps}c/${h.nodes}n`).join(" | "));
  console.log("degDist (>=th: nodes)", r.degDist.map(([t, c]) => `${t}:${c}`).join(" "));
  console.log("types:"); for (const t of r.types.slice(0, 16)) console.log(`  ${t.type}: refs ${t.refs} (${p(t.shareOfRefs)}), rels ${t.rels}, nodes ${t.nodes}, maxDeg ${t.maxDeg} @ ${t.maxNode}`);
  console.log("top20:"); for (const t of r.top) console.log(`  ${t.deg} (refs ${t.refs}) ${t.title.slice(0, 60)} [${t.tpl}]`);
  console.log("noHub", JSON.stringify({ ...r.noHub, hubList: undefined, hist: r.noHub.hist.map((h) => `${h.bucket}: ${h.comps}c/${h.nodes}n`).join(" | ") }));
  console.log("hubs removed:", r.noHub.hubList.map((h) => `${h.title.slice(0, 30)}(${h.deg})`).join("; "));
  console.log("tpl counts", r.tplCount.map(([t, c]) => `${t} ${c}`).join(", "));
  console.log("tpl pairs (", r.tplPairCount, "):", r.tplPairs.map(([k, c]) => `${k} ${c}`).join("; "));
}
