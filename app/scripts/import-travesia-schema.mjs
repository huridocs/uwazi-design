// One-off: turn a mongodump of an Uwazi instance's SCHEMA (templates,
// relationtypes, dictionaries — no entities) into the committed JSON the
// "Red Travesía" corpus reads (src/data/travesia/*.json).
//
//   npm i --no-save bson
//   node scripts/import-travesia-schema.mjs <dir with *.bson.gz>
//
// (TRAVESIA_OUT overrides the output directory.)
//
// The dump is a real network's schema. The corpus built on it is FICTIONAL, so
// the network's own name is scrubbed from every string that carries it
// (template, property and thesaurus names and labels), and its organisation
// template is renamed ALBERGUE. Nothing else is rewritten: the questions, the
// vocabularies and the relation types are the schema's own.
//
// Output:
//   src/data/travesia/templates.json      — bundled: the type list needs it at start
//   src/data/travesia/relationTypes.json  — bundled
//   public/travesia-data/thesauri.json    — fetched with the entities
//                                           (Municipios alone is 2,443 values)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node scripts/import-travesia-schema.mjs <dump dir>");
  process.exit(2);
}
let deserialize;
try {
  ({ deserialize } = await import("bson"));
} catch {
  console.error("needs the bson package: npm i --no-save bson");
  process.exit(2);
}

const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.TRAVESIA_OUT ?? join(here, "../src/data/travesia");
mkdirSync(out, { recursive: true });

function readDump(name) {
  const buf = gunzipSync(readFileSync(join(dir, `${name}.bson.gz`)));
  const docs = [];
  for (let i = 0; i < buf.length; ) {
    const len = buf.readInt32LE(i);
    docs.push(deserialize(buf.subarray(i, i + len)));
    i += len;
  }
  return docs;
}

const id = (v) => (v == null ? undefined : String(v));

/* The scrub. The dump names a real shelter network; this prototype's corpus is
   a fictional one, so the name is removed on import and appears in this
   constant only — nowhere in the committed data. Order matters: the specific
   phrasings first, then any leftover. */
const NAME = "REDODEM";
const re = (pattern, flags) => new RegExp(pattern.replace("NAME", NAME), flags);
const SCRUB = [
  [re("ORGANIZACIÓN NAME", "g"), "ALBERGUE"],
  [re("Tipos de Organización NAME", "g"), "Tipos de Organización"],
  [re("Regiones NAME", "g"), "Regiones de la Red"],
  [re("Organización de la NAME", "g"), "Organización de la Red"],
  [re("(externas?|externos?) a la NAME", "g"), "$1 a la Red"],
  [re("registro en la NAME", "gi"), "registro en la Red"],
  [re("\\bla NAME\\b", "gi"), "la Red"],
  [re("NAME", "gi"), "Red"],
];
const scrub = (s) => (typeof s === "string" ? SCRUB.reduce((acc, [re, to]) => acc.replace(re, to), s) : s);
/* Property slugs carry the name too, lower-cased. */
const scrubSlug = (s) => (typeof s === "string" ? s.replace(re("NAME", "gi"), "red") : s);

const templates = readDump("templates").map((t) => ({
  _id: id(t._id),
  name: scrub(String(t.name).trim()),
  default: !!t.default,
  color: t.color ?? null,
  properties: (t.properties ?? []).map((p) => ({
    _id: id(p._id),
    name: scrubSlug(p.name),
    label: scrub(String(p.label ?? "").trim()),
    type: p.type,
    ...(p.content ? { content: id(p.content) } : {}),
    ...(p.relationType ? { relationType: id(p.relationType) } : {}),
    ...(p.inherit?.property ? { inherit: { property: id(p.inherit.property), type: p.inherit.type } } : {}),
    ...(p.showInCard ? { showInCard: true } : {}),
    ...(p.filter ? { filter: true } : {}),
  })),
}));

const relationTypes = readDump("relationtypes").map((r) => ({ _id: id(r._id), name: scrub(r.name) }));

const value = (v) => ({
  id: String(v.id),
  label: scrub(String(v.label).trim()),
  ...(v.values ? { values: v.values.map(value) } : {}),
});
const referenced = new Set(templates.flatMap((t) => t.properties.map((p) => p.content).filter(Boolean)));
const thesauri = readDump("dictionaries")
  .filter((d) => referenced.has(id(d._id)))
  .map((d) => ({ _id: id(d._id), name: scrub(String(d.name).trim()), values: (d.values ?? []).map(value) }));

const left = JSON.stringify([templates, relationTypes, thesauri]).match(re("NAME", "gi"));
if (left) {
  console.error(`scrub incomplete: ${left.length} occurrence(s) left`);
  process.exit(1);
}

writeFileSync(join(out, "templates.json"), JSON.stringify(templates));
writeFileSync(join(out, "relationTypes.json"), JSON.stringify(relationTypes));
const publicOut = process.env.TRAVESIA_PUBLIC_OUT ?? join(here, "../public/travesia-data");
mkdirSync(publicOut, { recursive: true });
writeFileSync(join(publicOut, "thesauri.json"), JSON.stringify(thesauri));
console.log(`templates ${templates.length}, relation types ${relationTypes.length}, thesauri ${thesauri.length}`);
