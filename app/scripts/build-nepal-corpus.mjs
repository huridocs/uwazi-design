// Build the "Nepal protests 2024–2026" collection from the OSINT seed.
//
//   node scripts/build-nepal-corpus.mjs [path/to/nepal-seed/data]
//
// The seed (Research, phase 1) is public-source data: 1,868 entities and 4,762
// references, every fact with its sources and a verification status. Its
// schema is already in the prototype's TemplateDef shape; this script maps it
// onto what the app reads, the same layout as Red Travesía:
//
//   src/data/nepal/templates.json       TemplateDef[] (bundled: the Library's
//   src/data/nepal/relationTypes.json   type list and getEntityType need them)
//   public/nepal-data/entities.json     records in Uwazi's metadata shape
//   public/nepal-data/relationships.json  references, with anchor quotes
//   public/nepal-data/thesauri.json     select vocabularies
//
// The three public files are fetched when the collection is picked.
//
// Mapping decisions:
// - Template ids get a `nepal_` prefix: the Sample already has a `person`
//   template, and getEntityType resolves the Sample first.
// - Dates are epoch seconds, as Uwazi stores them. A time given in Nepal time
//   is stored as wall-clock time, so the record prints the day it happened
//   there. A month-precision date ("2024-03") is the first of the month; the
//   record's Time precision field says so.
// - Relationship properties are filled from the record's outgoing references
//   of that type, as Uwazi derives them.
// - `part_of_org` is folded into `part_of`: one "part of" type, as Uwazi
//   would have it. `targets` was labelled "concerns", the label of another
//   type; it is "targets" here.
// - 45 sources that have their id as title get one built from the record
//   (see `titleFor`).
// - Per-property evidence and reference notes are not shipped. The reference's
//   verification status and its date range are.
//
// Privacy (Research's rules, checked here, the build stops if one fails): a
// casualty under 18 or with a withheld identity has no name; no record holds
// a phone number or an e-mail address.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The seed lives outside git, in the main checkout's dev/results.
const seedDir = process.argv[2] ?? join(here, "../../dev/results/nepal-seed/data");
const read = (p) => JSON.parse(readFileSync(join(seedDir, p), "utf8"));

const seedTemplates = read("schema/templates.json");
const seedRelTypes = read("schema/relationTypes.json");
const seedThesauri = read("schema/thesauri.json");
const seedEntities = read("entities.json");
const seedRefs = read("references.json");

const tplId = (t) => `nepal_${t}`;

/* ── Relationship types ─────────────────────────────────────────────── */
const FOLD = { part_of_org: "part_of" };
const RELABEL = { targets: "targets" };
const relTypeOf = (id) => FOLD[id] ?? id;
const relationTypes = seedRelTypes
  .filter((r) => !FOLD[r.id])
  .map((r) => ({ _id: r.id, name: RELABEL[r.id] ?? r.label }));
const relNames = new Set();
for (const r of relationTypes) {
  if (relNames.has(r.name)) throw new Error(`Two relationship types are named "${r.name}"`);
  relNames.add(r.name);
}

/* ── Thesauri ───────────────────────────────────────────────────────── */
const THESAURUS_NAMES = {
  time_precision: "Time precision",
  verification_status: "Verification status",
  phases: "Phases",
  event_types: "Event types",
  person_roles: "Person roles",
  public_status: "Public status",
  org_types: "Organisation types",
  location_types: "Location types",
  publisher_types: "Publisher types",
  media: "Media",
  languages: "Languages",
  claim_types: "Claim types",
  action_types: "Action types",
  action_status: "Action status",
  gender: "Gender",
  outcomes: "Outcomes",
  causes: "Causes",
  identity_status: "Identity status",
};
const thesauri = Object.entries(seedThesauri).map(([id, values]) => {
  if (!THESAURUS_NAMES[id]) throw new Error(`Thesaurus ${id} has no name`);
  return { _id: id, name: THESAURUS_NAMES[id], values: values.map((v) => ({ id: v.id, label: v.label })) };
});
const labelOf = new Map(thesauri.map((t) => [t._id, new Map(t.values.map((v) => [v.id, v.label]))]));

/* ── Templates ──────────────────────────────────────────────────────── */
const templates = seedTemplates.map((t) => ({
  ...t,
  id: tplId(t.id),
  commonProperties: t.commonProperties.map((p) => ({ ...p, id: `${tplId(t.id)}:${p.name}` })),
  properties: t.properties.map((p) => {
    const out = { ...p, id: `${tplId(t.id)}:${p.name}` };
    if (p.type === "relationship") {
      out.content = p.content ? tplId(p.content) : "";
      out.relationType = relTypeOf(p.relationType);
      out.x = { connectionKey: `${out.relationType}:${out.content}` };
    }
    return out;
  }),
}));
const templateById = new Map(templates.map((t) => [t.id, t]));

/* ── Dates ──────────────────────────────────────────────────────────── */
/** ISO date, month or minute → epoch seconds of the wall-clock time. */
function secs(v) {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?(?:T(\d{2}):(\d{2}))?/.exec(v);
  if (!m) return null;
  const [, y, mo = "01", d = "01", hh = "00", mm = "00"] = m;
  const t = Date.UTC(+y, +mo - 1, +d, +hh, +mm) / 1000;
  return Number.isFinite(t) ? t : null;
}

/** The day Research read the undated pages (see below). */
const ACCESS_DATE = "2026-10-05";

/** The date a record sits at on the Library's timeline. */
const REPRESENTATIVE = {
  event: (p) => p.when?.from,
  action: (p) => p.date,
  source: (p) => p.published,
  claim: (p) => p.asserted_on,
  casualty: (p) => p.occurred,
};

/* ── References ─────────────────────────────────────────────────────── */
const titleOf = new Map(seedEntities.map((e) => [e.id, e.title]));
const VERIFICATION = new Set(["confirmed", "single-source", "disputed"]);
let anchored = 0;
let anchorElsewhere = 0;
const relationships = seedRefs.map((r) => {
  if (!titleOf.has(r.from) || !titleOf.has(r.to)) throw new Error(`Reference ${r.id} points at a missing entity`);
  if (!VERIFICATION.has(r.verification)) throw new Error(`Reference ${r.id}: verification ${r.verification}`);
  const type = relTypeOf(r.type);
  const out = { id: r.id, from: r.from, to: r.to, type, verification: r.verification };
  // The quote is the source's own text: kept where the source is an end of
  // the reference. Two `part_of_org` rows quote a third record; they stay
  // entity-to-entity links.
  const quote = r.anchor?.quote?.trim();
  if (quote && r.anchor.source === r.from) {
    out.quote = quote;
    anchored++;
  } else if (quote) anchorElsewhere++;
  if (r.date && (r.date.from || r.date.to)) out.date = { from: secs(r.date.from), to: secs(r.date.to) };
  return out;
});

/* ── Entities ───────────────────────────────────────────────────────── */
const outgoing = new Map();
for (const r of relationships) {
  const k = `${r.from}\u0000${r.type}`;
  const arr = outgoing.get(k);
  if (arr) arr.push(r.to);
  else outgoing.set(k, [r.to]);
}

// Nepali mobile and landline numbers, and e-mail addresses.
const PHONE = /(\+977[\s-]?\d{7,10}|\b9[78]\d{8}\b|\b01-?\d{7}\b)/;
const EMAIL = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i;

function valuesOf(p, v) {
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
      return ids.map((id) => {
        const label = labelOf.get(p.content)?.get(id);
        if (!label) throw new Error(`${p.id}: "${id}" is not in ${p.content}`);
        return { value: id, label };
      });
    }
    case "link":
      return v?.url ? [{ value: { url: v.url, label: v.label ?? "" } }] : [];
    case "geolocation":
      return typeof v?.lat === "number" && typeof v?.lon === "number"
        ? [{ value: { lat: v.lat, lon: v.lon, label: v.label ?? "" } }]
        : [];
    default:
      throw new Error(`${p.id}: unhandled type ${p.type}`);
  }
}

/** 45 sources of the transition part were written with their id as title.
 *  They get one from what the record holds: the publisher, the date and the
 *  slug's words ("Al Jazeera, 15 September 2025: gen z discord pick pm"). */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function titleFor(e) {
  if (e.title && e.title !== e.id) return e.title;
  const m = /^source:.*?-(\d{4})-(\d{2})-(\d{2})-(.+)$/.exec(e.id);
  if (!m || !e.properties.publisher) throw new Error(`${e.id} has no title`);
  const [, y, mo, d, slug] = m;
  return `${e.properties.publisher}, ${+d} ${MONTHS[+mo - 1]} ${y}: ${slug.replace(/-/g, " ")}`;
}
for (const e of seedEntities) titleOf.set(e.id, titleFor(e));

const entities = seedEntities.map((e) => {
  const tpl = templateById.get(tplId(e.template));
  if (!tpl) throw new Error(`${e.id}: unknown template ${e.template}`);
  const props = e.properties;
  if (e.template === "casualty") {
    const minor = typeof props.age === "number" && props.age < 18;
    if ((minor || props.identity_status === "withheld") && props.full_name)
      throw new Error(`${e.id}: a withheld or minor casualty carries a name`);
  }
  const metadata = {};
  for (const p of tpl.properties) {
    if (p.type === "relationship") {
      // Each target once: two terms in the same office are two references,
      // one connected entity.
      const ids = [...new Set(outgoing.get(`${e.id}\u0000${p.relationType}`) ?? [])];
      // A relationship property lists only the targets of its own template.
      const vals = ids
        .filter((id) => !p.content || tplId(id.slice(0, id.indexOf(":"))) === p.content)
        .map((id) => ({ value: id, label: titleOf.get(id) }));
      if (vals.length) metadata[p.name] = vals;
      continue;
    }
    const vals = valuesOf(p, props[p.name]);
    for (const v of vals)
      if ((p.type === "text" || p.type === "markdown") && (PHONE.test(v.value) || EMAIL.test(v.value)))
        throw new Error(`${e.id}.${p.name}: holds a phone number or an e-mail address`);
    if (vals.length) metadata[p.name] = vals;
  }
  // Wikipedia, OpenStreetMap and institutional pages have no publication
  // date; Research recorded the day it read them (the access date). That is
  // not when anything happened, so those sources stay off the timeline. The
  // record still shows the date as Research wrote it.
  const accessDated = e.template === "source" && props.published === ACCESS_DATE && props.publisher_type !== "national-media" && props.publisher_type !== "international-media";
  const date = accessDated ? null : secs(REPRESENTATIVE[e.template]?.(props));
  return {
    sharedId: e.id,
    template: tpl.id,
    title: titleOf.get(e.id),
    ...(date !== null ? { date } : {}),
    metadata,
  };
});

/* ── Write ──────────────────────────────────────────────────────────── */
const srcOut = join(here, "../src/data/nepal");
const pubOut = join(here, "../public/nepal-data");
mkdirSync(srcOut, { recursive: true });
mkdirSync(pubOut, { recursive: true });
const pretty = (x) => JSON.stringify(x, null, 1) + "\n";
writeFileSync(join(srcOut, "templates.json"), pretty(templates));
writeFileSync(join(srcOut, "relationTypes.json"), pretty(relationTypes));
writeFileSync(join(pubOut, "entities.json"), JSON.stringify(entities));
writeFileSync(join(pubOut, "relationships.json"), JSON.stringify(relationships));
writeFileSync(join(pubOut, "thesauri.json"), JSON.stringify(thesauri));
console.log(
  `${entities.length} entities, ${relationships.length} references (${anchored} anchored, ${anchorElsewhere} quotes on a third record dropped), ` +
    `${templates.length} templates, ${relationTypes.length} relationship types, ${thesauri.length} thesauri`,
);
