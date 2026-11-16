import fs from "fs";
const SP = process.env.SP;
const m = await import(SP + "/v4/refs.mjs");
const spec = JSON.parse(fs.readFileSync(SP + "/v4/sample-seed-v4.json", "utf8"));
const src = fs.readFileSync("entities.ts", "utf8");
const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0; return h; };
const baseTypes = [...src.matchAll(/\{ id: "(\w+)", name: "([^"]+)", color: "(#\w+)" \}/g)].map((x) => ({ id: x[1], n: x[2], c: x[3], f: [] }));
const templates = [...baseTypes, ...spec.newTemplates.map((t) => ({ id: t.id, n: t.name, c: t.color, f: [] }))];
const tIdx = (id) => templates.findIndex((t) => t.id === id);
for (const [tpl, fs_] of Object.entries(spec.fields)) templates[tIdx(tpl)].f = fs_.map((f) => [f.label, f.relationType, f.content]);
const ents = [...src.matchAll(/\{ id: "(e\d+)", title: "([^"]*)", typeId: "(\w+)"/g)].map((x) => [x[1], x[2], tIdx(x[3])]);
for (const e of spec.newEntities) ents.push([e.id, e.title, tIdx(e.type)]);
const dates = {}; const dateLabels = []; const L = (s) => { let i = dateLabels.indexOf(s); if (i < 0) { i = dateLabels.length; dateLabels.push(s); } return i; };
const sec = (d) => Math.floor(Date.parse(d + "T00:00:00Z") / 1000);
const hearings = []; let hn = 60; const MON = ["January","February","March","April","May","June","July","August","September","October","November","December"];
for (const s of spec.hearingSessions) { const [y, mo] = s.month.split("-").map(Number); for (let k = 0; k < s.count; k++) { const id = "e" + hn++; const day = 2 + Math.floor((k * 26) / s.count); ents.push([id, `Hearing ${k + 1}, ${MON[mo - 1]} ${y} session`, tIdx("hearing")]); hearings.push(id); dates[ents.length - 1] = [[L("Date"), sec(`${y}-${String(mo).padStart(2, "0")}-${String(day).padStart(2, "0")}`), 0]]; } }
const eIdx = new Map(ents.map((e, i) => [e[0], i]));
for (const [id, ds] of Object.entries(spec.dates)) dates[eIdx.get(id)] = ds.map(([l, a, b]) => [L(l), sec(a), b ? sec(b) : 0]);
const types = m.relationTypes.filter((t) => t.id !== "no_label").map((t) => [t.id, t.label]);
for (const t of spec.relationTypes) types.push([t.id, t.label]);
const tyI = (id) => (id ? types.findIndex((t) => t[0] === id) : -1);
const edges = [], passages = []; const hubIdx = new Map(); let h = 0; let skipped = 0;
for (const r of m.references) {
  const a = eIdx.get(r.sourceEntityId), b = eIdx.get(r.targetEntityId);
  if (a === undefined || b === undefined) { skipped++; continue; }
  const ty = tyI(r.relationType === "no_label" ? null : r.relationType);
  let hub; if (r.hubId) { if (!hubIdx.has(r.hubId)) hubIdx.set(r.hubId, h++); hub = hubIdx.get(r.hubId); } else hub = h++;
  const incoming = (r.direction ?? "outgoing") === "incoming"; const from = incoming ? b : a, to = incoming ? a : b; const ei = edges.length / 4; edges.push(from, to, ty, hub);
  if (r.sourceSelection) passages.push([ei, a, r.sourceSelection.page, r.sourceSelection.text, r.targetSelection ? r.targetSelection.page : null, r.targetSelection ? r.targetSelection.text : null]);
}
const baseEdges = edges.length / 4; let added = 0;
for (const hb of spec.hubs) { const hub = h++; const members = hb.members === "ALL_HEARINGS" ? hearings : hb.members; const ty = tyI(hb.type);
  if (hb.centre) { for (const mm of members) { edges.push(eIdx.get(hb.centre), eIdx.get(mm), ty, hub); added++; } }
  else { const [first, ...rest] = members; for (const mm of rest) { edges.push(eIdx.get(first), eIdx.get(mm), ty, hub); added++; } } }
const restricted = ents.map((e, i) => (+e[0].slice(1) <= 53 && hash(e[0] + "·pub") % 5 === 0 ? i : -1)).filter((i) => i >= 0);
fs.writeFileSync(SP + "/v4/prototype/data-sample.js", "window.SAMPLE=" + JSON.stringify({ templates, types, ents, edges, passages, pageCount: { e3: 39 }, dateLabels, dates, restricted }) + ";");
console.log({ ents: ents.length, baseEdges, added, skipped, passages: passages.length, maxPage: Math.max(...passages.map((p) => p[2])), restricted: restricted.length, dated: Object.keys(dates).length, hearings: hearings.length });
