/* eslint-disable no-console */
/**
 * CEJIL seed importer — one-shot converter from a CEJIL Uwazi mongodump into the
 * prototype's namespaced seed under app/src/data/cejil/*, plus real public PDFs
 * into app/public/cejil-docs/.
 *
 * The raw dump is NEVER committed (see .gitignore). To regenerate:
 *   1. Extract the dump's .bson files somewhere (default: /tmp/cejil).
 *   2. Have `bson` installed (the dump dir already has it, hence NODE_PATH below).
 *   3. NODE_PATH=/tmp/cejil/node_modules node app/scripts/import-cejil.cjs
 *
 * Policy (public design repo): published + non-permissioned entities only; no
 * account/mailer/analytics settings; binary PDFs fetched from the public
 * instance (summa.cejil.org) only for one primary document per sampled case.
 */
const fs = require("fs");
const path = require("path");
const { BSON } = require("bson");

const DUMP = process.env.CEJIL_DUMP_DIR || "/tmp/cejil";
const REPO = path.resolve(__dirname, "..");
const OUT = path.join(REPO, "src/data/cejil");
const PDF_DIR = path.join(REPO, "public/cejil-docs");
const CASE_COUNT = Number(process.env.CEJIL_CASES || 30);
const PDF_CAP = Number(process.env.CEJIL_PDF_CAP || 80);
const FILE_HOST = "https://summa.cejil.org/api/files";

const readAll = (file) => {
  const buf = fs.readFileSync(path.join(DUMP, file));
  const docs = [];
  let off = 0;
  while (off < buf.length) {
    const size = buf.readInt32LE(off);
    if (size <= 0 || off + size > buf.length) break;
    docs.push(BSON.deserialize(buf.subarray(off, off + size)));
    off += size;
  }
  return docs;
};

console.log("Reading collections from", DUMP);
const templates = readAll("templates.bson");
const relationtypes = readAll("relationtypes.bson");
const dictionaries = readAll("dictionaries.bson");
const settingsDoc = readAll("settings.bson")[0];
const entities = readAll("entities.bson");
const connections = readAll("connections.bson");
const pages = readAll("pages.bson");

const tplName = Object.fromEntries(templates.map((t) => [String(t._id), t.name]));
const relName = Object.fromEntries(relationtypes.map((r) => [String(r._id), r.name]));
const causaTplId = String(templates.find((t) => t.name === "Causa")._id);

// es doc per sharedId → template lookup
const esBySid = {};
for (const e of entities) if (e.language === "es") esBySid[e.sharedId] = e;
const tplOfSid = (sid) => (esBySid[sid] ? tplName[String(esBySid[sid].template)] : undefined);

// files (document type) by entity sharedId — streamed (860MB)
const filesByEntity = {};
{
  const fd = fs.openSync(path.join(DUMP, "files.bson"), "r");
  const stat = fs.fstatSync(fd);
  const CHUNK = 1 << 24;
  let carry = Buffer.alloc(0);
  let pos = 0;
  while (pos < stat.size) {
    const len = Math.min(CHUNK, stat.size - pos);
    const chunk = Buffer.alloc(len);
    fs.readSync(fd, chunk, 0, len, pos);
    pos += len;
    let b = carry.length ? Buffer.concat([carry, chunk]) : chunk;
    let off = 0;
    while (off + 4 <= b.length) {
      const size = b.readInt32LE(off);
      if (size <= 0) { off = b.length; break; }
      if (off + size > b.length) break;
      const d = BSON.deserialize(b.subarray(off, off + size));
      off += size;
      if (d.type === "document" && d.entity) (filesByEntity[d.entity] = filesByEntity[d.entity] || []).push(d);
    }
    carry = b.subarray(off);
  }
  fs.closeSync(fd);
}
console.log("entities:", entities.length, "| connections:", connections.length, "| entities w/ docs:", Object.keys(filesByEntity).length);

// connections grouped by hub + by entity
const byHub = {};
const hubsByEntity = {};
for (const c of connections) {
  (byHub[String(c.hub)] = byHub[String(c.hub)] || []).push(c);
  (hubsByEntity[c.entity] = hubsByEntity[c.entity] || []).push(String(c.hub));
}

// ── selection: the FULL published corpus by default; CEJIL_SAMPLE_ONLY keeps
//    the legacy top-CASE_COUNT-causa sample. Causas are still ranked by
//    connectivity so the PDF-featuring pass prefers the best-connected cases. ──
const SAMPLE_ONLY = !!process.env.CEJIL_SAMPLE_ONLY;
const matesOf = (sid) => {
  const mates = new Set();
  for (const h of hubsByEntity[sid] || []) for (const m of byHub[h]) if (m.entity !== sid) mates.add(m.entity);
  return mates;
};
const rankedCausas = entities
  .filter((e) => e.language === "es" && String(e.template) === causaTplId && e.published)
  .map((e) => ({ sid: e.sharedId, title: e.title, mates: matesOf(e.sharedId) }))
  .sort((a, b) => b.mates.size - a.mates.size);
const causas = SAMPLE_ONLY ? rankedCausas.slice(0, CASE_COUNT) : rankedCausas;

const sampled = SAMPLE_ONLY
  ? (() => {
      const s = new Set();
      for (const c of causas) {
        s.add(c.sid);
        for (const m of c.mates) s.add(m);
      }
      return s;
    })()
  : new Set(entities.filter((e) => e.language === "es" && e.published).map((e) => e.sharedId));

// ── entities (all 3 languages, published, non-permissioned) ──
const outEntities = entities
  .filter((e) => sampled.has(e.sharedId) && e.published && !(e.permissions && e.permissions.length))
  .map((e) => ({
    _id: String(e._id),
    sharedId: e.sharedId,
    language: e.language,
    title: e.title,
    template: String(e.template),
    templateName: tplName[String(e.template)] || null,
    published: !!e.published,
    metadata: e.metadata || {},
  }));
const keptSids = new Set(outEntities.map((e) => e.sharedId));

// ── relationships: collapse hubs touching the sample → case-centric pairwise ──
const relSeen = new Set();
const outRels = [];
const touchedHubs = new Set();
for (const sid of keptSids) for (const h of hubsByEntity[sid] || []) touchedHubs.add(h);
for (const h of touchedHubs) {
  const members = byHub[h].filter((m) => keptSids.has(m.entity));
  if (members.length < 2) continue;
  const causaM = members.find((m) => String(esBySid[m.entity]?.template) === causaTplId);
  const src = causaM || members[0];
  for (const m of members) {
    if (m.entity === src.entity) continue;
    const type = m.template ? String(m.template) : null;
    const key = `${src.entity}|${m.entity}|${type}`;
    if (relSeen.has(key)) continue;
    relSeen.add(key);
    const rel = { from: src.entity, to: m.entity, type, typeName: type ? relName[type] || null : null, hub: h };
    if (m.reference && m.reference.text) rel.reference = { text: m.reference.text, page: (m.reference.selectionRectangles || [])[0]?.page };
    outRels.push(rel);
  }
}

// ── files: include records for sampled doc-entities; fullText only for the
//    primary doc of each case; download that primary PDF (capped) ──
const PRIMARY_ORDER = ["Sentencia de la CorteIDH", "Informe de Fondo", "Informe de Admisibilidad y Fondo", "Resolución de la CorteIDH", "Informe de admisibilidad"];
const outFiles = [];
const toDownload = []; // {filename}
const fullTextByFile = {};

// Feature up to FEATURED_PER_CASE document-entities per case (best by
// PRIMARY_ORDER rank). Each featured doc gets fullText + a downloaded PDF, so a
// higher count = wider document coverage (more readable docs per case).
const FEATURED_PER_CASE = Number(process.env.CEJIL_FEATURED_PER_CASE || 2);
const featuredDocEntities = new Set();
for (const c of causas) {
  const ranked = [];
  for (const m of c.mates) {
    if (!keptSids.has(m) || !filesByEntity[m]) continue;
    const rank = PRIMARY_ORDER.indexOf(tplOfSid(m));
    if (rank === -1) continue;
    ranked.push({ sid: m, rank });
  }
  ranked.sort((a, b) => a.rank - b.rank);
  for (const r of ranked.slice(0, FEATURED_PER_CASE)) featuredDocEntities.add(r.sid);
}

for (const sid of keptSids) {
  const docs = filesByEntity[sid];
  if (!docs) continue;
  const featured = featuredDocEntities.has(sid);
  // prefer spanish, then english, then first
  const ordered = [...docs].sort((a, b) => (a.language === "spa" ? -2 : a.language === "eng" ? -1 : 0) - (b.language === "spa" ? -2 : b.language === "eng" ? -1 : 0));
  ordered.forEach((d, i) => {
    const isPrimary = featured && i === 0;
    const rec = {
      _id: String(d._id),
      entity: d.entity,
      language: d.language,
      filename: d.filename,
      originalname: d.originalname,
      mimetype: d.mimetype,
      totalPages: d.totalPages || null,
      isPdf: d.mimetype === "application/pdf",
      primary: isPrimary,
      url: null,
    };
    // Only featured docs that we actually download a PDF for carry fullText —
    // the text rendition is only shown when there's a viewable doc, and emitting
    // fullText for every featured doc across the full corpus would be ~100MB.
    if (isPrimary && d.mimetype === "application/pdf" && toDownload.length < PDF_CAP) {
      toDownload.push(d.filename);
      rec.url = `/cejil-docs/${d.filename}`;
      if (d.fullText) {
        const pages = Object.keys(d.fullText).map(Number).sort((a, b) => a - b).slice(0, 40);
        fullTextByFile[d.filename] = pages.map((p) => String(d.fullText[String(p)] || "").replace(/\[\[\d+\]\]/g, "").trim());
        if (d.toc) rec.toc = d.toc.map((t) => ({ label: t.label, indentation: t.indentation || 0, range: t.range }));
      }
    }
    outFiles.push(rec);
  });
}

// ── thesauri / relationtypes / templates / settings ──
const outThesauri = dictionaries.map((d) => ({ _id: String(d._id), name: d.name, values: (d.values || []).map((v) => ({ id: v.id, label: v.label, values: v.values })) }));
const outRelTypes = relationtypes.map((r) => ({ _id: String(r._id), name: r.name }));
const outTemplates = templates.map((t) => ({
  _id: String(t._id),
  name: t.name,
  color: t.color || null,
  default: !!t.default,
  commonProperties: (t.commonProperties || []).map(cleanProp),
  properties: (t.properties || []).map(cleanProp),
}));
function cleanProp(p) {
  const o = { name: p.name, label: p.label, type: p.type };
  if (p.relationType) o.relationType = String(p.relationType);
  if (p.content) o.content = String(p.content);
  if (p.inherit) o.inherit = { property: String(p.inherit.property), type: p.inherit.type };
  return o;
}
const mapFilter = (n) =>
  n.items
    ? { name: n.name, items: n.items.map(mapFilter) }
    : { id: String(n.id), name: n.name || tplName[String(n.id)] || String(n.id) };
// Menu (settings.links) — flatten one level (group header + its sublinks).
const outMenu = [];
(settingsDoc.links || []).forEach((l, i) => {
  if (l.sublinks && l.sublinks.length) {
    outMenu.push({ id: l._id ? String(l._id) : `g${i}`, title: l.title, url: "", type: "group" });
    l.sublinks.forEach((s, j) => outMenu.push({ id: s._id ? String(s._id) : `g${i}s${j}`, title: s.title, url: s.url || "", type: "link" }));
  } else {
    outMenu.push({ id: l._id ? String(l._id) : `l${i}`, title: l.title, url: l.url || "", type: "link" });
  }
});

// Pages (custom collection pages) — public content pages.
const outPages = pages.map((p) => ({ id: String(p._id), title: p.title, slug: p.sharedId, published: true }));

const outSettings = {
  siteName: settingsDoc.site_name || "SUMMA",
  defaultLibraryView: settingsDoc.defaultLibraryView || "cards",
  dateFormat: settingsDoc.dateFormat || "yyyy/MM/dd",
  languages: (settingsDoc.languages || []).map((l) => ({ key: l.key, label: l.label, default: !!l.default })),
  filters: (settingsDoc.filters || []).map(mapFilter),
};

// ── download PDFs ──
async function download() {
  fs.mkdirSync(PDF_DIR, { recursive: true });
  let ok = 0;
  for (const fn of toDownload) {
    const dest = path.join(PDF_DIR, fn);
    if (fs.existsSync(dest)) { ok++; continue; }
    try {
      const res = await fetch(`${FILE_HOST}/${fn}`);
      if (!res.ok || !(res.headers.get("content-type") || "").includes("pdf")) { console.warn("skip", fn, res.status); continue; }
      const ab = await res.arrayBuffer();
      fs.writeFileSync(dest, Buffer.from(ab));
      ok++;
    } catch (e) { console.warn("fail", fn, e.message); }
  }
  console.log("PDFs downloaded:", ok, "/", toDownload.length);
}

// ── aggregates baked into small TS so Settings/Dashboard don't pull the big
//    JSON: per-template entity counts, per-relationtype usage, totals. ──
const entityCountByTemplate = {};
for (const e of outEntities) if (e.language === "es") entityCountByTemplate[e.template] = (entityCountByTemplate[e.template] || 0) + 1;
const usageByRelationType = {};
for (const r of outRels) if (r.type) usageByRelationType[r.type] = (usageByRelationType[r.type] || 0) + 1;
const cejilStats = {
  entities: keptSids.size,
  entityDocs: outEntities.length,
  relationships: outRels.length,
  files: outFiles.length,
  pdfs: toDownload.length,
  fullTextDocs: Object.keys(fullTextByFile).length,
  templates: outTemplates.length,
  thesauri: outThesauri.length,
  relationTypes: outRelTypes.length,
  languages: outSettings.languages.length,
};

// ── emit small config as TS ──
const banner = `// AUTO-GENERATED by scripts/import-cejil.cjs from the CEJIL dump. Do not edit by hand.\n// Full published corpus from summa.cejil.org (the heavy entity/relationship/file/\n// fullText data lives as JSON under public/cejil-data, lazy-loaded at runtime).\n`;
const write = (name, expr) => fs.writeFileSync(path.join(OUT, name), banner + expr + "\n");

fs.mkdirSync(OUT, { recursive: true });
// The corpus is JSON now — drop the legacy big-array TS modules if present.
for (const stale of ["entities.ts", "relationships.ts", "files.ts", "fullText.ts"]) {
  const p = path.join(OUT, stale);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
fs.copyFileSync(path.join(__dirname, "cejil-types.ts"), path.join(OUT, "types.ts"));
write("templates.ts", `import type { CejilTemplate } from "./types";\nexport const cejilTemplates: CejilTemplate[] = ${JSON.stringify(outTemplates)};`);
write("thesauri.ts", `import type { CejilThesaurus } from "./types";\nexport const cejilThesauri: CejilThesaurus[] = ${JSON.stringify(outThesauri)};`);
write("relationTypes.ts", `import type { CejilRelationType } from "./types";\nexport const cejilRelationTypes: CejilRelationType[] = ${JSON.stringify(outRelTypes)};`);
write("settings.ts", `import type { CejilSettings } from "./types";\nexport const cejilSettings: CejilSettings = ${JSON.stringify(outSettings)};`);
write("menu.ts", `import type { CejilMenuLink } from "./types";\nexport const cejilMenu: CejilMenuLink[] = ${JSON.stringify(outMenu)};`);
write("pages.ts", `import type { CejilPage } from "./types";\nexport const cejilPages: CejilPage[] = ${JSON.stringify(outPages)};`);
write("aggregates.ts", `import type { CejilStats } from "./types";\nexport const cejilEntityCountByTemplate: Record<string, number> = ${JSON.stringify(entityCountByTemplate)};\nexport const cejilUsageByRelationType: Record<string, number> = ${JSON.stringify(usageByRelationType)};\nexport const cejilStats: CejilStats = ${JSON.stringify(cejilStats)};`);
write("index.ts", `export * from "./types";\nexport { cejilTemplates } from "./templates";\nexport { cejilThesauri } from "./thesauri";\nexport { cejilRelationTypes } from "./relationTypes";\nexport { cejilSettings } from "./settings";\nexport { cejilMenu } from "./menu";\nexport { cejilPages } from "./pages";\nexport { cejilEntityCountByTemplate, cejilUsageByRelationType, cejilStats } from "./aggregates";\n\nexport const cejilManifest = ${JSON.stringify({ cases: causas.length, sharedEntities: keptSids.size, menu: outMenu.length, pages: outPages.length, ...cejilStats })};`);

// ── the heavy corpus → JSON assets under public/, lazy-loaded at runtime ──
const DATA_DIR = path.join(REPO, "public/cejil-data");
fs.mkdirSync(DATA_DIR, { recursive: true });
const writeJson = (name, data) => fs.writeFileSync(path.join(DATA_DIR, name), JSON.stringify(data));
writeJson("entities.json", outEntities);
writeJson("relationships.json", outRels);
writeJson("files.json", outFiles);
writeJson("fullText.json", fullTextByFile);

console.log("Manifest:", { cases: causas.length, ...cejilStats });

download().then(() => console.log("Done →", OUT));
