const fs = require("fs"); const path = require("path");
const [,, dir, tag] = process.argv;
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json") && f.startsWith(tag));
const by = {};
for (const f of files) {
  const cfg = f.replace(tag + "-", "").replace(".json", "");
  for (const r of JSON.parse(fs.readFileSync(path.join(dir, f)))) {
    const k = r.id; by[k] = by[k] || { surface: r.surface, cfg: {} };
    by[k].cfg[cfg] = r;
  }
}
for (const [id, v] of Object.entries(by).sort()) {
  const lines = [];
  for (const [cfg, r] of Object.entries(v.cfg)) {
    if (r.error) { lines.push(`  [${cfg}] ERROR ${r.error}`); continue; }
    const bits = [];
    if (r.pageOverflowX) bits.push(`PAGE-OVERFLOW sw=${r.scrollW}`);
    if (r.offscreen?.length) bits.push(`OFF: ${r.offscreen.slice(0, 4).join("; ")}`);
    if (r.clipped?.length) bits.push(`CLIPPED: ${r.clipped.slice(0, 4).join("; ")}`);
    if (r.smallInputs?.length) bits.push(`INPUT<16: ${r.smallInputs.slice(0, 3).join("; ")}`);
    if (r.fails?.length) bits.push(`STEPFAIL: ${r.fails.map(f=>f.slice(0,50)).join(" / ")}`);
    if (r.fixedCollisions?.length) bits.push(`COLL: ${r.fixedCollisions.slice(0, 3).join("; ")}`);
    if (r.dialogs?.some(d => d.includes("DOES-NOT-FIT"))) bits.push(`DLG: ${r.dialogs.join("; ")}`);
    if (r.tinyText?.length) bits.push(`TINY(${r.tinyTextCount}): ${r.tinyText.slice(0, 4).join("; ")}`);
    if (r.hoverOnly?.length) bits.push(`HOVER: ${[...new Set(r.hoverOnly)].join("; ")}`);
    if (r.errs?.length) bits.push(`JSERR: ${r.errs[0]}`);
    if (bits.length) lines.push(`  [${cfg}] ${bits.join(" | ")}`);
  }
  const u24 = new Set(); for (const r of Object.values(v.cfg)) for (const s of r.under24 || []) u24.add(s.replace(/ \d+×\d+$/, "") + " " + s.match(/\d+×\d+$/)?.[0]);
  console.log(`## ${id} — ${v.surface}  <24: ${[...u24].slice(0, 10).join("; ")}`);
  lines.forEach(l => console.log(l));
}
