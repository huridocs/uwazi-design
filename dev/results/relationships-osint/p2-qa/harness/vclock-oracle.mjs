import { corpus } from "./expect.mjs";
const C = corpus("vegas");
const TYPES = ["volley", "single-shot", "first-shots", "corridor-shots"];
const mdv = (e, k) => (e.metadata[k] ?? [])[0]?.value;
const moments = new Map();
for (const r of C.refs) {
  if (r.type !== "captures" || !r.media || r.media.clock === undefined) continue;
  const m = C.byId.get(r.to);
  const mt = mdv(m, "moment_type");
  if (!TYPES.includes(mt)) continue;
  if (!moments.has(r.to)) moments.set(r.to, []);
  moments.get(r.to).push({ ref: r.id, rec: r.from, clock: r.media.clock, qualifier: r.media.qualifier, offset: r.media.offset });
}
const med = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
export const result = [];
for (const [mid, anns] of moments) {
  const stat = anns.filter((a) => !a.qualifier);
  if (!stat.length) continue;
  const m = med(stat.map((a) => a.clock));
  for (const a of anns) { const dev = a.clock - m; if (Math.abs(dev) > 2) result.push({ moment: mid, title: C.byId.get(mid).title, ...a, dev, median: m }); }
}
if (process.argv[1].endsWith("vclock-oracle.mjs")) {
  console.log("moments", moments.size, "outliers", result.length, "of which qualified:", result.filter(r => r.qualifier).length);
  const per = {}; for (const r of result) per[r.title] = (per[r.title] ?? 0) + 1; console.log(JSON.stringify(per));
  console.log(result.slice(0, 4).map(r => `${r.title} ${r.rec.slice(-12)} dev ${r.dev}`).join("\n"));
  const disputed = C.refs.filter(r => r.verification === "disputed" && r.type === "captures"); console.log("disputed captures", disputed.length, "outliers incl:", disputed.filter(d => result.some(x => x.ref === d.id)).length);
}
