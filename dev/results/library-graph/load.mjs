// Loaders: each returns { nodes: Map<id,node>, edges: [{a,b,type}], dangling }
// Run from the repo root: node dev/results/library-graph/analyze.mjs
import fs from "node:fs";
import path from "node:path";

export const ROOT = path.resolve(new URL("../../..", import.meta.url).pathname);
const J = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
export const fold = (s) => String(s).normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const labelsOf = (md) => {
  const out = [];
  for (const [k, vals] of Object.entries(md || {})) {
    if (k === "preview") continue;
    for (const v of vals || []) {
      if (typeof v.label === "string") out.push(v.label);
      else if (typeof v.value === "string") out.push(v.value);
    }
  }
  return out;
};

export function loadCejil() {
  const E = J("app/public/cejil-data/entities.json").filter((e) => e.language === "es");
  const R = J("app/public/cejil-data/relationships.json");
  const nodes = new Map();
  const DATE_KEYS = ["fecha", "presentaci_n_ante_la_corteidh", "denuncia_ante_la_cidh"];
  for (const e of E) {
    let date = null;
    for (const k of DATE_KEYS) {
      const v = e.metadata?.[k]?.[0]?.value;
      if (typeof v === "number" && v > 0) { date = v * 1000; break; }
    }
    const geo = !!(e.metadata?.ubicaci_n_geogr_fica_geolocation?.length || e.metadata?.localizaci_n_geolocation?.length);
    const country = e.templateName === "País" ? e.title : e.metadata?.pa_s?.[0]?.label;
    nodes.set(e.sharedId, {
      id: e.sharedId, title: e.title.trim(), tpl: e.templateName.trim(), country,
      descriptors: (e.metadata?.descriptores || []).map((v) => v.label).filter(Boolean),
      date, geo, text: fold([e.title, ...labelsOf(e.metadata)].join(" ")),
      props: {},
    });
  }
  // Geolocated records borrow the date of a connected Causa (adapt.ts createdOf).
  const causaDate = new Map();
  for (const n of nodes.values()) if (n.tpl === "Causa" && n.date) causaDate.set(n.id, n.date);
  for (const r of R) {
    for (const [x, y] of [[r.from, r.to], [r.to, r.from]]) {
      const n = nodes.get(x);
      if (n && n.geo && n.date === null && causaDate.has(y)) n.date = causaDate.get(y);
    }
  }
  const edges = R.map((r) => ({ a: r.from, b: r.to, type: r.typeName || "(untyped)" }));
  return { nodes, edges, dangling: 0 };
}

export function loadNepal() {
  const E = J("app/public/nepal-data/entities.json");
  const R = J("app/public/nepal-data/relationships.json");
  const nodes = new Map();
  for (const e of E) {
    const md = e.metadata || {};
    const lab = (k) => (md[k] || []).map((v) => v.label ?? (typeof v.value === "string" ? v.value : null)).filter(Boolean);
    const when = md.when?.[0]?.value;
    const from = e.date !== undefined ? e.date * 1000 : null;
    const to = typeof when?.to === "number" ? when.to * 1000 : from;
    nodes.set(e.sharedId, {
      id: e.sharedId, title: e.title, tpl: e.template, date: from, dateTo: to,
      verification: (md.verification || md.verification_status)?.[0]?.label,
      props: { event_type: lab("event_type"), district: lab("district"), occurred_at: lab("occurred_at"), action_type: lab("action_type"), publisher: lab("publisher"), media_kind: lab("media_kind"), outcome: lab("outcome") },
      text: fold([e.title, ...labelsOf(md)].join(" ")),
    });
  }
  const edges = R.map((r) => ({ a: r.from, b: r.to, type: r.type }));
  return { nodes, edges, dangling: 0 };
}

export function loadSample() {
  const S = J("dev/results/library-graph/sample-seed.json");
  const nodes = new Map();
  for (const e of S.entities) {
    nodes.set(e.id, {
      id: e.id, title: e.title, tpl: e.typeId, date: Date.parse(e.createdAt), published: e.published,
      props: {}, text: fold(e.title + " " + (e.typeId || "")),
    });
  }
  const edges = []; let dangling = 0; const missing = new Set();
  for (const r of S.references) {
    if (!nodes.has(r.sourceEntityId) || !nodes.has(r.targetEntityId)) { dangling++; if (!nodes.has(r.sourceEntityId)) missing.add(r.sourceEntityId); if (!nodes.has(r.targetEntityId)) missing.add(r.targetEntityId); continue; }
    if (r.sourceEntityId === r.targetEntityId) continue;
    edges.push({ a: r.sourceEntityId, b: r.targetEntityId, type: r.relationType });
  }
  return { nodes, edges, dangling, missing: [...missing] };
}
