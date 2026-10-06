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
//   public/nepal-data/docs.json         the bundled documents: issuer, source,
//                                       licence basis and per-page OCR text
//   public/nepal-data/media/            the bundled Commons images, as copied
//   public/nepal-data/docs/<id>.pdf     the bundled PDFs, unaltered
//
// The four JSON files are fetched when the collection is picked; an image or a
// PDF is fetched when a record shows it. None of it is in the app bundle.
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
// - A source whose title is its id gets one built from the record (see
//   `titleFor`).
// - Per-property evidence and reference notes are not shipped. The reference's
//   verification status and its date range are.
//
// - Media items: the `file` image property holds the bundled copy's public
//   path; its pixel size goes on the record (`image`) so the record reserves
//   the box before the picture loads. `embed` is the video or podcast URL.
// - Documents: a record's attached PDFs (`files[]` in the seed) become `docs`,
//   primary first. A reference whose quote was located in a bundled PDF keeps
//   its file and page, so the Relationships panel can jump to it.
//
// Privacy and rights (Research's rules, checked here, the build stops if one
// fails): a casualty under 18 or with a withheld identity has no name; no
// record holds a phone number or an e-mail address; a bundled image carries
// its licence, licence link and attribution; a bundled document names its
// issuer and its source URL, and none of the link-only documents is copied.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The seed lives outside git, in the main checkout's dev/results.
const seedDir = process.argv[2] ?? join(here, "../../dev/results/nepal-seed/data");
const read = (p) => JSON.parse(readFileSync(join(seedDir, p), "utf8"));
// Media and documents sit beside data/: ../media/images, ../docs.
const seedRoot = join(seedDir, "..");

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
  media_kinds: "Media kinds",
  platforms: "Platforms",
  rights: "Rights",
  content_warnings: "Content warnings",
  media_verification: "Media verification",
};
/** An open-licence file kept out of the bundle (NOT_BUNDLED below) is not
 *  "rights reserved": its rights value names the licence and says no copy is
 *  shipped. One linked value per Creative Commons bundled value. */
const LINKED_RIGHTS = { "bundled-cc0": "CC0", "bundled-cc-by": "CC BY", "bundled-cc-by-sa": "CC BY-SA" };
const linkedRightsId = (bundled) => bundled.replace(/^bundled-/, "linked-");
const thesauri = Object.entries(seedThesauri).map(([id, values]) => {
  if (!THESAURUS_NAMES[id]) throw new Error(`Thesaurus ${id} has no name`);
  const own = values.map((v) => ({ id: v.id, label: v.label }));
  const linked =
    id === "rights"
      ? Object.entries(LINKED_RIGHTS).map(([b, licence]) => ({ id: linkedRightsId(b), label: `${licence} · linked, no copy here` }))
      : [];
  return { _id: id, name: THESAURUS_NAMES[id], values: [...own, ...linked] };
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

/** The date a record sits at on the Library's timeline. */
const REPRESENTATIVE = {
  event: (p) => p.when?.from,
  action: (p) => p.date,
  source: (p) => p.published,
  claim: (p) => p.asserted_on,
  casualty: (p) => p.occurred,
  // When it was recorded, which for a recycled clip is years before it was
  // shared; the record shows both.
  media: (p) => p.recorded ?? p.published,
};

/** How precisely that date is known, when it is less than a day: a value
 *  written as a month ("2024-03") or a year, or a record whose Time precision
 *  says month. Day (and hour) is the default and is not written. */
function precisionOf(raw, props) {
  const stated = props.precision ?? props.recorded_precision;
  if (stated === "month" || stated === "year") return stated;
  if (typeof raw !== "string") return null;
  if (/^\d{4}$/.test(raw)) return "year";
  if (/^\d{4}-\d{2}$/.test(raw)) return "month";
  return null;
}

/* ── References ─────────────────────────────────────────────────────── */
const titleOf = new Map(seedEntities.map((e) => [e.id, e.title]));
const VERIFICATION = new Set(["confirmed", "single-source", "disputed"]);
let anchored = 0;
let anchorElsewhere = 0;
let pageAnchored = 0;
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
    // Located in a bundled PDF: the file and the page the quote is on.
    if (r.anchor.file && typeof r.anchor.page === "number" && r.anchor.page > 0) {
      out.file = r.anchor.file;
      out.page = r.anchor.page;
      pageAnchored++;
    }
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

/* ── Documents ──────────────────────────────────────────────────────── */
const INSTITUTIONAL_MAIL = /@(?:[\w-]+\.)*(?:gov\.np|nhrcnepal\.org|nhrenepal\.org)$/i;
const docsDir = join(seedRoot, "docs");
const linkOnly = new Set(JSON.parse(readFileSync(join(docsDir, "linkonly.json"), "utf8")).map((d) => d.url));
const docMeta = new Map();
for (const id of readdirSync(docsDir)) {
  const metaPath = join(docsDir, id, "meta.json");
  if (!existsSync(metaPath)) continue;
  const m = JSON.parse(readFileSync(metaPath, "utf8"));
  if (m.doc_id !== id) throw new Error(`docs/${id}: meta.json names ${m.doc_id}`);
  if (!m.publisher?.trim()) throw new Error(`docs/${id}: no issuer`);
  if (!m.source_url?.trim()) throw new Error(`docs/${id}: no source URL`);
  if (linkOnly.has(m.source_url)) throw new Error(`docs/${id}: listed as link only`);
  if (!existsSync(join(docsDir, id, "doc.pdf"))) throw new Error(`docs/${id}: no doc.pdf`);
  const pageFiles = readdirSync(join(docsDir, id, "pages")).filter((f) => /^\d+\.txt$/.test(f)).sort();
  if (pageFiles.length !== m.pages) throw new Error(`docs/${id}: ${pageFiles.length} pages of text for ${m.pages} pages`);
  const text = pageFiles.map((f) => readFileSync(join(docsDir, id, "pages", f), "utf8").trim());
  // The documents are published as issued, so their contact lines stay: an
  // institution's address. Anything else (a person's number or address) stops
  // the build. "nhrenepal" is the OCR's reading of "nhrcnepal".
  for (const [i, t] of text.entries()) {
    if (PHONE.test(t)) throw new Error(`docs/${id} p.${i + 1}: holds a phone number`);
    for (const [addr] of t.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g))
      if (!INSTITUTIONAL_MAIL.test(addr)) throw new Error(`docs/${id} p.${i + 1}: holds the e-mail address ${addr}`);
  }
  docMeta.set(id, {
    id,
    title: m.title,
    language: m.language,
    pages: m.pages,
    bytes: m.bytes,
    publisher: m.publisher,
    ...(m.published ? { published: secs(m.published) } : {}),
    sourceUrl: m.source_url,
    ...(m.source_page ? { sourcePage: m.source_page } : {}),
    retrieved: secs(m.retrieved),
    licenceBasis: m.licence_basis,
    // Every page was OCRed; nobody has read the result against the scan.
    textSource: m.text_source ?? "ocr",
    textQuality: "unreviewed",
    text,
  });
}
const imagesToCopy = new Set();


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
    case "image":
      // The bundled copy, by its public path (the app resolves it against its
      // base). Copied below.
      return v?.path ? [{ value: `/nepal-data/media/${basename(v.path)}` }] : [];
    case "media":
      return typeof v === "string" && v.trim() ? [{ value: v.trim() }] : [];
    default:
      throw new Error(`${p.id}: unhandled type ${p.type}`);
  }
}

/** A source written with its id as title (45 in the first seed; Research has
 *  since given them their headlines) gets one from what the record holds:
 *  the publisher, the date and the slug's words ("Al Jazeera, 15 September 2025: gen z discord pick pm"). */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function titleFor(e) {
  if (e.title && e.title !== e.id) return e.title;
  const m = /^source:.*?-(\d{4})-(\d{2})-(\d{2})-(.+)$/.exec(e.id);
  if (!m || !e.properties.publisher) throw new Error(`${e.id} has no title`);
  const [, y, mo, d, slug] = m;
  return `${e.properties.publisher}, ${+d} ${MONTHS[+mo - 1]} ${y}: ${slug.replace(/-/g, " ")}`;
}
for (const e of seedEntities) titleOf.set(e.id, titleFor(e));

/** Commons photos reviewed out of the bundle (Juan, 2026-10-05): two show
 *  people who are likely minors, one a private person. The records stay, as
 *  link-only items pointing at the Commons file page: no copy is shipped and
 *  a rebuild never brings one back. Their rights value keeps the licence
 *  ("CC0 · linked, no copy here"), not "rights reserved". */
const NOT_BUNDLED = new Set([
  "media:photo-2025-09-08-chitwan-protest-8-sep-1",
  "media:photo-2025-09-08-chitwan-protest-8-sep-3",
  "media:photo-2025-08-16-singha-durbar-august-2025",
]);
function withoutBundledCopy(e) {
  if (!NOT_BUNDLED.has(e.id)) return e.properties;
  if (!e.properties.page_url?.url) throw new Error(`${e.id}: kept link-only, but it has no page_url to link to`);
  const { file: _file, file_size_bytes: _size, ...rest } = e.properties;
  if (!LINKED_RIGHTS[rest.rights]) throw new Error(`${e.id}: kept link-only under rights "${rest.rights}", which has no linked value`);
  return { ...rest, rights: linkedRightsId(rest.rights) };
}

const entities = seedEntities.map((e) => {
  const tpl = templateById.get(tplId(e.template));
  if (!tpl) throw new Error(`${e.id}: unknown template ${e.template}`);
  const props = withoutBundledCopy(e);
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
  // A bundled image is published with its terms or not at all.
  let image;
  if (e.template === "media" && props.file) {
    for (const k of ["licence", "attribution"])
      if (!props[k]?.trim()) throw new Error(`${e.id}: a bundled image without its ${k}`);
    if (!props.licence_url?.url) throw new Error(`${e.id}: a bundled image without its licence link`);
    if (!String(props.rights).startsWith("bundled-")) throw new Error(`${e.id}: an image is bundled under rights "${props.rights}"`);
    const f = props.file;
    if (!(f.width > 0 && f.height > 0)) throw new Error(`${e.id}: the image has no pixel size`);
    imagesToCopy.add(f.path);
    image = { url: `/nepal-data/media/${basename(f.path)}`, width: f.width, height: f.height };
  }
  const docs = (e.files ?? []).map((f) => {
    if (!docMeta.has(f.id)) throw new Error(`${e.id}: attached document ${f.id} is not in docs/index.json`);
    return f;
  });
  // Primary first; Research attaches one per record, but keep the rule.
  docs.sort((a, b) => (a.role === "primary" ? 0 : 1) - (b.role === "primary" ? 0 : 1));
  // Wikipedia, OpenStreetMap and institutional pages have no publication
  // date: `published` is empty and `accessed` holds the day Research read
  // them. That is not when anything happened, so they have no record date and
  // stay off the timeline; the record shows Accessed.
  const rawDate = REPRESENTATIVE[e.template]?.(props);
  const date = secs(rawDate);
  const precision = date !== null ? precisionOf(rawDate, props) : null;
  return {
    sharedId: e.id,
    template: tpl.id,
    title: titleOf.get(e.id),
    ...(date !== null ? { date } : {}),
    ...(precision ? { datePrecision: precision } : {}),
    ...(image ? { image } : {}),
    ...(docs.length ? { docs: docs.map((f) => f.id) } : {}),
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
const attached = new Set(entities.flatMap((e) => e.docs ?? []));
writeFileSync(join(pubOut, "docs.json"), JSON.stringify([...docMeta.values()].filter((d) => attached.has(d.id))));

// The binaries, copied as they are. The folders are rebuilt each run, so a
// file Research drops does not linger.
const mediaOut = join(pubOut, "media");
const docsOut = join(pubOut, "docs");
for (const dir of [mediaOut, docsOut]) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}
let mediaBytes = 0;
for (const p of imagesToCopy) {
  copyFileSync(join(seedRoot, p), join(mediaOut, basename(p)));
  mediaBytes += statSync(join(mediaOut, basename(p))).size;
}
let docBytes = 0;
for (const id of attached) {
  copyFileSync(join(docsDir, id, "doc.pdf"), join(docsOut, `${id}.pdf`));
  docBytes += statSync(join(docsOut, `${id}.pdf`)).size;
}
const mb = (n) => (n / 1048576).toFixed(1);
console.log(
  `${entities.length} entities, ${relationships.length} references (${anchored} anchored, ${pageAnchored} to a page of a bundled PDF, ` +
    `${anchorElsewhere} quotes on a third record dropped), ${templates.length} templates, ${relationTypes.length} relationship types, ` +
    `${thesauri.length} thesauri; ${imagesToCopy.size} images (${mb(mediaBytes)} MB), ${attached.size} PDFs (${mb(docBytes)} MB)`,
);
