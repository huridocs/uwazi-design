// Build the "Las Vegas, 1 October 2017" collection from Research's seed.
//
//   VEGAS_DENYLIST=/path/to/privacy-denylist.txt \
//     node scripts/build-vegas-corpus.mjs [path/to/vegas-seed/data]
//
// The seed (Research, phase 2) is public-source data: 582 entities and 1,591
// references built from the VegasShootingMap.com annotations and the official
// and press sources around them. Recordings are links only: nothing is
// downloaded or bundled. The layout follows Nepal's:
//
//   src/data/vegas/templates.json        TemplateDef[] (bundled: the Library's
//   src/data/vegas/relationTypes.json    type list and getEntityType need them)
//   public/vegas-data/entities.json      records in Uwazi's metadata shape
//   public/vegas-data/relationships.json references, with their media anchors
//   public/vegas-data/thesauri.json      select vocabularies
//   public/vegas-data/evidence.json      per-property evidence, by record id
//
// The first three JSON files are fetched when the collection is picked;
// evidence.json when a record first shows it.
//
// Mapping decisions:
// - Template ids get a `vegas_` prefix, as Nepal's get `nepal_`.
// - Dates are epoch seconds of the Las Vegas wall clock (the seed writes them
//   with their -07:00 offset), so a record prints the time it was there. The
//   offset itself is the collection's (`VEGAS_UTC_OFFSET` in data/vegas), not
//   stored per value. Second precision is kept.
// - Relationship properties are filled from the record's outgoing references
//   of that type, as Uwazi derives them.
// - A `captures` or `derived_from` reference carries a media anchor: the
//   recording, the offset into it in seconds, the end when known, the clock
//   time it was annotated at, the map's label and its qualifier.
// - Reference notes are not shipped; status and anchor are.
//
// Privacy and harm (README §4 and §10.5, the rules of the seed's validate.py;
// the build stops if one fails):
//  1. No victim: no string holds the map's Victims folder markers.
//  2. The gunman is never named, and 3. no private person is: every string of
//     every record and reference is matched against the denylist, read from
//     the path in VEGAS_DENYLIST. The list is kept out of the repository; the
//     build stops when the variable is unset or the file is missing.
//  4. No social-media profile or handle link; no opaque short link.
//  5. No phone number; no e-mail address except the map's group address, and
//     that only in the map's own Source record.
//  6. Every recording is warned (graphic or distressing), so no card draws a
//     still. No file, thumbnail, image or poster property on any record; no
//     YouTube thumbnail, Google image-hosting or My Maps link anywhere.
//  7. No label describes a person hit, helped or killed.
//  8. A 911 call carries no title text beyond its number, no label, only the
//     properties that cannot hold the map's title text, a category from the
//     closed list, and a position rounded to three decimals. Its audio file is
//     a link to one of the two Internet Archive items, with an evidence note
//     that says who it is credited to, who uploaded it and that no licence is
//     stated.
//  9. Embeds are links of the allowed forms.
// 10. Every select value is in its thesaurus, every property is in its
//     template, every reference joins templates its type allows, every id
//     resolves.
// 11. Every count claim carries its as-of date, or says the date is unknown.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The seed lives outside git, in the main checkout's dev/results.
const seedDir = process.argv[2] ?? join(here, "../../dev/results/vegas-seed/data");
const read = (p) => JSON.parse(readFileSync(join(seedDir, p), "utf8"));

const fails = [];
const fail = (m) => fails.push(m);
function stopIfFailed(stage) {
  if (!fails.length) return;
  console.error(`Vegas build stopped (${stage}): ${fails.length} problem(s)`);
  for (const f of fails.slice(0, 80)) console.error(" -", f);
  process.exit(1);
}

/* ── Denylist ───────────────────────────────────────────────────────── */
const denyPath = process.env.VEGAS_DENYLIST;
if (!denyPath) {
  console.error("Vegas build stopped: set VEGAS_DENYLIST to the privacy denylist's path (kept outside the repository).");
  process.exit(1);
}
if (!existsSync(denyPath)) {
  console.error(`Vegas build stopped: no denylist at ${denyPath}.`);
  process.exit(1);
}
const deny = readFileSync(denyPath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"))
  .map((d) => d.toLowerCase());
if (!deny.length) {
  console.error("Vegas build stopped: the denylist is empty.");
  process.exit(1);
}
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Whole words only, as validate.py matches them.
const denyRes = deny.map((d) => new RegExp(`(?<![a-z])${escapeRe(d)}(?![a-z])`));

const seedTemplates = read("schema/templates.json");
const seedRelTypes = read("schema/relationTypes.json");
const seedThesauri = read("schema/thesauri.json");
const seedEntities = read("entities.json");
const seedRefs = read("references.json");

const tplId = (t) => `vegas_${t}`;

/* ── String rules ───────────────────────────────────────────────────── */
const MAP_SOURCE = "source:vegasshootingmap-2026-10-07-google-my-map";
const ALLOWED_EMAIL = "vegasmapprojectteam@googlegroups.com";
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/g;
const PHONE = /\(\d{3}\)\s*\d{3}-\d{4}|\b\d{3}[-.]\d{3}[-.]\d{4}\b/;
const VICTIMS_FOLDER = /<name>Victims<\/name>|Burial:|Residence:/;
const SOCIAL = /facebook\.com\/(?!watch\/\?v=\d+$)|twitter\.com\/(?!i\/status\/\d+$)|x\.com\/(?!i\/status\/\d+$)/;
const SHORT_LINK = /\b(?:goo\.gl|bit\.ly|t\.co|tinyurl\.com)\//;
const IMAGE_HOST = /img\.youtube\.com|ytimg\.com|googleusercontent|usercontent\.google|mymaps/;
const GRAPHIC =
  /\b(victims?|bod(?:y|ies)(?![- ]?(?:cam|worn))|dead|dying|blood\w*|wound\w*|shot in|lady shot|wheelbarrow|hit stage|corpse|killed)\b/i;
const EMBED =
  /^https:\/\/(www\.youtube\.com\/watch\?v=[\w-]{11}(&t=[\dhms]+)?|www\.facebook\.com\/watch\/\?v=\d+|twitter\.com\/i\/status\/\d+|archive\.org\/details\/|www\.ktuu\.com\/)/;
const NO_MEDIA_PROPS = ["file", "thumbnail", "image", "poster"];
const CALL_PROPS = new Set([
  "media_kind", "call_number", "content_warning", "verification", "availability", "camera_position",
  "position_basis", "call_category", "embed", "platform", "provenance", "compilation_offset_seconds",
  "audio_url", "audio_basis",
]);
const AUDIO =
  /^https:\/\/archive\.org\/details\/(LasVegasShooting911Calls|Vegas_Shoooting_Batch_7-911Calls)\/171001003519_\(\d+\)\.wma$/;
const AUDIO_NOTE = ["credited to LVMPD", "private account", "no licence stated", "Linked only"];

function* strings(o, path = "") {
  if (Array.isArray(o)) for (const [i, v] of o.entries()) yield* strings(v, `${path}[${i}]`);
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) yield* strings(v, `${path}.${k}`);
  else if (typeof o === "string") yield [path, o];
}

/** The rules that hold for every string: the denylist, contacts, links. An
 *  e-mail address is allowed only for the map's group address in the map's
 *  own Source record (`emailOk`). */
function checkStrings(ctx, obj, emailOk = false) {
  for (const [path, s] of strings(obj)) {
    const low = s.toLowerCase();
    for (const [i, re] of denyRes.entries()) if (re.test(low)) fail(`${ctx}${path}: denylisted string #${i + 1}`);
    if (VICTIMS_FOLDER.test(s)) fail(`${ctx}${path}: holds the map's Victims folder`);
    for (const [m] of s.matchAll(EMAIL))
      if (!(emailOk && m.toLowerCase() === ALLOWED_EMAIL)) fail(`${ctx}${path}: e-mail address`);
    if (PHONE.test(s)) fail(`${ctx}${path}: phone number`);
    for (const [u] of s.matchAll(/https?:\/\/\S+/g)) {
      if (SOCIAL.test(u)) fail(`${ctx}${path}: social profile or handle link`);
      if (SHORT_LINK.test(u)) fail(`${ctx}${path}: opaque short link`);
      if (IMAGE_HOST.test(u)) fail(`${ctx}${path}: image or thumbnail link ${u}`);
    }
  }
}

/* ── Relationship types ─────────────────────────────────────────────── */
const relTypeById = new Map(seedRelTypes.map((r) => [r.id, r]));
// `derived_from` was labelled "part of", the label of `part_of`: one name per
// type, so it reads "derived from" here (a call segment of a compilation, or a
// re-upload).
const RELABEL = { derived_from: "derived from" };
const relationTypes = seedRelTypes.map((r) => ({ _id: r.id, name: RELABEL[r.id] ?? r.label }));
const relNames = new Set();
for (const r of relationTypes) {
  if (relNames.has(r.name)) fail(`Two relationship types are named "${r.name}"`);
  relNames.add(r.name);
}

/* ── Thesauri ───────────────────────────────────────────────────────── */
const THESAURUS_NAMES = {
  time_precision: "Time precision",
  verification_status: "Verification status",
  media_kinds: "Recording kinds",
  platforms: "Platforms",
  provenance: "Provenance",
  clock_basis: "Clock bases",
  sync_confidence: "Sync confidence",
  sync_flags: "Sync flags",
  position_basis: "Position bases",
  volleys: "Volleys",
  availability: "Availability",
  content_warnings: "Content warnings",
  moment_types: "Moment types",
  time_basis: "Time bases",
  place_types: "Place types",
  publisher_types: "Publisher types",
  claim_types: "Claim types",
  figure_qualifiers: "Figure qualifiers",
  as_of_bases: "As of bases",
  finding_types: "Finding types",
  org_types: "Organisation types",
  read_status: "Read status",
  call_categories: "Call categories",
  audio_basis: "Audio bases",
};
/** A thesaurus Research adds later gets a name from its id until it is named
 *  here ("call_category" → "Call category"). */
const thesaurusName = (id) => THESAURUS_NAMES[id] ?? id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " ");
const thesauri = Object.entries(seedThesauri).map(([id, values]) => ({
  _id: id,
  name: thesaurusName(id),
  values: values.map((v) => ({ id: v.id, label: v.label })),
}));
const labelOf = new Map(thesauri.map((t) => [t._id, new Map(t.values.map((v) => [v.id, v.label]))]));
for (const t of thesauri) checkStrings(`thesaurus ${t._id}`, t);

/* ── Templates ──────────────────────────────────────────────────────── */
const COMMON = [
  { name: "title", label: "Title", type: "text" },
  { name: "creationDate", label: "Date added", type: "date" },
  { name: "editDate", label: "Date modified", type: "date" },
];
const templates = seedTemplates.map((t) => ({
  ...t,
  id: tplId(t.id),
  // Uwazi's common properties, as the Nepal templates carry them.
  commonProperties: (t.commonProperties ?? COMMON).map((p) => ({
    ...p,
    id: `${tplId(t.id)}:${p.name}`,
  })),
  properties: t.properties.map((p) => {
    const out = { ...p, id: `${tplId(t.id)}:${p.name}` };
    if (p.type === "relationship") {
      out.content = p.content ? tplId(p.content) : "";
      out.x = { connectionKey: `${p.relationType}:${out.content}` };
    }
    for (const bad of NO_MEDIA_PROPS) if (p.name === bad) fail(`template ${t.id}: property '${bad}' (no media is bundled)`);
    if ((p.type === "select" || p.type === "multiselect") && !labelOf.has(p.content))
      fail(`template ${t.id}.${p.name}: thesaurus ${p.content} is missing`);
    return out;
  }),
}));
const templateById = new Map(templates.map((t) => [t.id, t]));
// The recording's start offset is a range facet (Library › Filters): numeric,
// flagged `filter` in the seed.
const syncProp = templateById.get("vegas_recording")?.properties.find((p) => p.name === "sync_offset_seconds");
if (!syncProp || syncProp.type !== "numeric" || !syncProp.filter) fail("sync_offset_seconds is not a numeric filter on Recording");

/* ── Dates ──────────────────────────────────────────────────────────── */
/** ISO date, month or second → epoch seconds of the wall-clock time. The
 *  offset the seed writes (-07:00) is the collection's and is dropped. */
function secs(v) {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(v);
  if (!m) return null;
  const [, y, mo = "01", d = "01", hh = "00", mm = "00", ss = "00"] = m;
  const t = Date.UTC(+y, +mo - 1, +d, +hh, +mm, +ss) / 1000;
  return Number.isFinite(t) ? t : null;
}

/** The date a record sits at on the Library's timeline. Places and
 *  organisations have none; a source with no publication date has none (its
 *  access date is when Research read it, not when anything happened). */
const REPRESENTATIVE = {
  recording: (p) => p.clock_start,
  moment: (p) => p.clock_start,
  finding: (p) => p.clock_time,
  claim: (p) => p.as_of,
  source: (p) => p.published,
};

/** How precisely that date is known: the record's stated precision (second,
 *  minute or day), else the form of the value ("2017-10" is a month). */
function precisionOf(raw, props) {
  const stated = props.clock_precision ?? props.precision;
  if (stated === "second" || stated === "minute" || stated === "day") return stated;
  if (typeof raw !== "string") return "day";
  if (/^\d{4}$/.test(raw)) return "year";
  if (/^\d{4}-\d{2}$/.test(raw)) return "month";
  if (/T\d{2}:\d{2}:\d{2}/.test(raw)) return "second";
  if (/T\d{2}:\d{2}/.test(raw)) return "minute";
  return "day";
}

/* ── Records: checks ────────────────────────────────────────────────── */
const byId = new Map();
for (const e of seedEntities) {
  if (byId.has(e.id)) fail(`${e.id}: duplicate id`);
  byId.set(e.id, e);
}
for (const e of seedEntities) {
  const ctx = e.id;
  const tpl = templateById.get(tplId(e.template));
  if (!tpl) {
    fail(`${ctx}: unknown template ${e.template}`);
    continue;
  }
  checkStrings(ctx, e, e.id === MAP_SOURCE);
  const p = e.properties;
  for (const bad of NO_MEDIA_PROPS) if (bad in p) fail(`${ctx}: property '${bad}' (no media is bundled)`);
  const known = new Set(tpl.properties.map((x) => x.name));
  const unknown = Object.keys(p).filter((k) => k !== "title" && !known.has(k));
  if (unknown.length) fail(`${ctx}: properties not in the template: ${unknown.join(", ")}`);
  for (const pd of tpl.properties) {
    if ((pd.type === "select" || pd.type === "multiselect") && pd.name in p) {
      const vals = Array.isArray(p[pd.name]) ? p[pd.name] : [p[pd.name]];
      for (const v of vals) if (!labelOf.get(pd.content)?.has(v)) fail(`${ctx}: ${pd.name} "${v}" is not in ${pd.content}`);
    }
  }
  if (e.template === "recording") {
    if (p.content_warning !== "graphic" && p.content_warning !== "distressing")
      fail(`${ctx}: a recording without a graphic or distressing warning`);
    const label = p.map_label ?? "";
    if (p.media_kind !== "911-compilation" && (GRAPHIC.test(label) || GRAPHIC.test(e.title)))
      fail(`${ctx}: a label describes a person or an injury`);
    if (p.media_kind === "911-call") {
      if ("map_label" in p) fail(`${ctx}: a 911 call carries a label`);
      if (!/^911 call #\d+$/.test(e.title)) fail(`${ctx}: a 911 call's title carries text`);
      const extra = Object.keys(p).filter((k) => !CALL_PROPS.has(k));
      if (extra.length) fail(`${ctx}: a call carries properties that could hold title text: ${extra.join(", ")}`);
      if (!p.call_category) fail(`${ctx}: a call without a category`);
      if (p.audio_url) {
        const m = AUDIO.exec(p.audio_url.url ?? "");
        if (!m) fail(`${ctx}: audio address of a form that is not allowed`);
        if (p.audio_basis !== "map-link" && p.audio_basis !== "matched-by-number") fail(`${ctx}: audio_basis missing`);
        const note = (e.evidence ?? [])
          .filter((ev) => (Array.isArray(ev.property) ? ev.property : [ev.property]).includes("audio_url"))
          .map((ev) => ev.note ?? "")
          .join(" ");
        if (!AUDIO_NOTE.every((w) => note.includes(w))) fail(`${ctx}: the audio file's evidence note is incomplete`);
        if (m && !note.includes(m[1])) fail(`${ctx}: the audio file's evidence note does not name its item`);
      } else if ("audio_basis" in p) fail(`${ctx}: audio_basis without audio_url`);
      const g = p.camera_position;
      if (g && (Math.round(g.lat * 1000) / 1000 !== g.lat || Math.round(g.lon * 1000) / 1000 !== g.lon))
        fail(`${ctx}: a 911 call's position is not rounded to three decimals`);
    }
    if (p.embed && !EMBED.test(p.embed.url)) fail(`${ctx}: embed address of a form that is not allowed`);
  }
  if (p.media_kind !== "911-call" && ("call_category" in p || "audio_url" in p))
    fail(`${ctx}: call_category or audio_url on a record that is not a call`);
  if (e.template === "moment" && GRAPHIC.test(`${p.label ?? ""} ${e.title}`)) fail(`${ctx}: a label describes a person or an injury`);
  if (e.template === "claim" && p.claim_type === "count" && !p.as_of && p.as_of_basis !== "unknown")
    fail(`${ctx}: a count without its as-of date`);
  for (const ev of e.evidence ?? []) for (const s of ev.sources) if (!byId.has(s)) fail(`${ctx}: evidence source ${s} is missing`);
}
for (const r of seedRefs) {
  checkStrings(r.id, r);
  for (const end of ["from", "to"]) if (!byId.has(r[end])) fail(`${r.id}: ${end} ${r[end]} is missing`);
  const rt = relTypeById.get(r.type);
  if (!rt) {
    fail(`${r.id}: unknown relationship type ${r.type}`);
    continue;
  }
  const ft = byId.get(r.from)?.template;
  const tt = byId.get(r.to)?.template;
  if (ft && tt && (!rt.from.includes(ft) || !rt.to.includes(tt))) fail(`${r.id}: ${r.type} from ${ft} to ${tt} is not allowed`);
  for (const s of r.sources ?? []) if (!byId.has(s)) fail(`${r.id}: source ${s} is missing`);
  if (r.anchor && !byId.has(r.anchor.recording)) fail(`${r.id}: anchor recording ${r.anchor.recording} is missing`);
  if (!["confirmed", "single-source", "disputed"].includes(r.verification)) fail(`${r.id}: verification ${r.verification}`);
}
stopIfFailed("seed checks");

/* ── References ─────────────────────────────────────────────────────── */
let anchored = 0;
const relationships = seedRefs.map((r) => {
  const out = { id: r.id, from: r.from, to: r.to, type: r.type, verification: r.verification };
  const a = r.anchor;
  if (a && typeof a.offset_seconds === "number") {
    out.media = {
      recording: a.recording,
      offset: a.offset_seconds,
      ...(typeof a.end_seconds === "number" ? { end: a.end_seconds } : {}),
      ...(a.clock ? { clock: secs(a.clock) } : {}),
      ...(a.label ? { label: a.label } : {}),
      ...(a.qualifier ? { qualifier: a.qualifier } : {}),
    };
    anchored++;
  }
  if (typeof r.interval_seconds === "number") out.interval = r.interval_seconds;
  if (r.date && (r.date.from || r.date.to)) out.date = { from: secs(r.date.from), to: secs(r.date.to) };
  return out;
});

/* ── Records ────────────────────────────────────────────────────────── */
const titleOf = new Map(seedEntities.map((e) => [e.id, e.title]));
const outgoing = new Map();
for (const r of relationships) {
  const k = `${r.from}\u0000${r.type}`;
  const arr = outgoing.get(k);
  if (arr) arr.push(r.to);
  else outgoing.set(k, [r.to]);
}

function valuesOf(p, v, ctx) {
  switch (p.type) {
    case "text":
    case "markdown":
      return typeof v === "string" && v.trim() ? [{ value: v }] : [];
    case "numeric":
      return typeof v === "number" ? [{ value: v }] : [];
    case "date": {
      const t = secs(v);
      return t === null ? [] : [{ value: t }];
    }
    case "daterange": {
      const from = secs(v?.from);
      const to = secs(v?.to);
      return from === null && to === null ? [] : [{ value: { from, to } }];
    }
    case "select":
    case "multiselect": {
      const ids = Array.isArray(v) ? v : v ? [v] : [];
      return ids.map((id) => ({ value: id, label: labelOf.get(p.content).get(id) }));
    }
    case "link":
      return v?.url ? [{ value: { url: v.url, label: v.label ?? "" } }] : [];
    case "geolocation":
      return typeof v?.lat === "number" && typeof v?.lon === "number"
        ? [{ value: { lat: v.lat, lon: v.lon, label: v.label ?? "" } }]
        : [];
    case "media": {
      // The seed writes a media value as a link; the record holds its address.
      const url = typeof v === "string" ? v : v?.url;
      return typeof url === "string" && url.trim() ? [{ value: url.trim() }] : [];
    }
    default:
      fail(`${ctx}.${p.name}: unhandled type ${p.type}`);
      return [];
  }
}

/** A GeoJSON line or polygon in a text property, as [lat, lng] pairs (the
 *  polygon's outer ring). */
function shapeOf(text, ctx) {
  if (typeof text !== "string") return undefined;
  let g;
  try {
    g = JSON.parse(text);
  } catch {
    fail(`${ctx}: geometry is not JSON`);
    return undefined;
  }
  const flip = (c) => [Math.round(c[1] * 1e6) / 1e6, Math.round(c[0] * 1e6) / 1e6];
  if (g.type === "LineString") return { kind: "line", points: g.coordinates.map(flip) };
  if (g.type === "Polygon") return { kind: "polygon", points: g.coordinates[0].map(flip) };
  fail(`${ctx}: geometry ${g.type}`);
  return undefined;
}

const entities = seedEntities.map((e) => {
  const tpl = templateById.get(tplId(e.template));
  const props = e.properties;
  const metadata = {};
  for (const p of tpl.properties) {
    if (p.type === "relationship") {
      const ids = [...new Set(outgoing.get(`${e.id}\u0000${p.relationType}`) ?? [])];
      const vals = ids
        .filter((id) => !p.content || tplId(byId.get(id).template) === p.content)
        .map((id) => ({ value: id, label: titleOf.get(id) }));
      if (vals.length) metadata[p.name] = vals;
      continue;
    }
    const vals = valuesOf(p, props[p.name], e.id);
    if (vals.length) metadata[p.name] = vals;
  }
  const rawDate = REPRESENTATIVE[e.template]?.(props);
  const date = secs(rawDate);
  const precision = date !== null ? precisionOf(rawDate, props) : null;
  const shape = shapeOf(props.camera_path ?? props.footprint, e.id);
  return {
    sharedId: e.id,
    template: tpl.id,
    title: titleOf.get(e.id),
    ...(date !== null ? { date } : {}),
    ...(precision && precision !== "day" ? { datePrecision: precision } : {}),
    ...(shape ? { shape } : {}),
    metadata,
  };
});

/* ── Evidence ───────────────────────────────────────────────────────── */
const VERIFICATION = new Set(["confirmed", "single-source", "disputed"]);
const evidence = {};
let evidenceRows = 0;
for (const e of seedEntities) {
  if (!e.evidence?.length) continue;
  evidence[e.id] = e.evidence.map((x) => {
    if (!VERIFICATION.has(x.verification)) fail(`${e.id}: evidence verification ${x.verification}`);
    evidenceRows++;
    const props = (Array.isArray(x.property) ? x.property : String(x.property).split(","))
      .map((p) => p.trim())
      .filter(Boolean);
    return { props, sources: x.sources, verification: x.verification, ...(x.note ? { note: x.note } : {}) };
  });
}
stopIfFailed("mapping");

/* ── Output checks ──────────────────────────────────────────────────── */
// The same string rules over what is written, so a mapping step cannot bring
// back what the seed checks kept out.
for (const x of entities) {
  checkStrings(`out ${x.sharedId}`, x, x.sharedId === MAP_SOURCE);
  if (x.template === "vegas_recording") {
    const w = x.metadata.content_warning?.[0]?.value;
    if (w !== "graphic" && w !== "distressing") fail(`out ${x.sharedId}: recording without a warning`);
  }
  if ("image" in x) fail(`out ${x.sharedId}: carries an image`);
}
for (const r of relationships) checkStrings(`out ${r.id}`, r);
for (const [id, rows] of Object.entries(evidence)) checkStrings(`out evidence ${id}`, rows, id === MAP_SOURCE);
for (const t of templates) checkStrings(`out template ${t.id}`, t);
stopIfFailed("output checks");

/* ── Write ──────────────────────────────────────────────────────────── */
const srcOut = join(here, "../src/data/vegas");
const pubOut = join(here, "../public/vegas-data");
mkdirSync(srcOut, { recursive: true });
mkdirSync(pubOut, { recursive: true });
const pretty = (x) => JSON.stringify(x, null, 1) + "\n";
writeFileSync(join(srcOut, "templates.json"), pretty(templates));
writeFileSync(join(srcOut, "relationTypes.json"), pretty(relationTypes));
writeFileSync(join(pubOut, "entities.json"), JSON.stringify(entities));
writeFileSync(join(pubOut, "relationships.json"), JSON.stringify(relationships));
writeFileSync(join(pubOut, "thesauri.json"), JSON.stringify(thesauri));
writeFileSync(join(pubOut, "evidence.json"), JSON.stringify(evidence));
const recordings = entities.filter((x) => x.template === "vegas_recording").length;
console.log(
  `${entities.length} entities (${recordings} recordings), ${relationships.length} references (${anchored} with a media anchor), ` +
    `${templates.length} templates, ${relationTypes.length} relationship types, ${thesauri.length} thesauri; ` +
    `evidence: ${evidenceRows} rows on ${Object.keys(evidence).length} records. Nothing bundled.`,
);
