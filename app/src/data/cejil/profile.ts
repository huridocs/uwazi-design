// Builds a real EntityProfile for a CEJIL entity (by sharedId), so the drawer
// preview + EntityView render real metadata / documents / relationships. Imported
// only by getEntityProfile (which delegates here for CEJIL ids); the heavy CEJIL
// data is already in the bundle via the Library, so this adds no new weight.
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../entityProfiles";
import type { MetadataField } from "../metadata";
import type { DocumentMeta } from "../document";
import type { DocRendition, HtmlBlock } from "../documentRenditions";
import type { FileEntry, DocumentGroup } from "../files";
import type { Reference } from "../references";
import { cejilEntities } from "./entities";
import { cejilFiles } from "./files";
import { cejilFullText } from "./fullText";
import { cejilRelationships } from "./relationships";
import { cejilTemplates } from "./templates";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];
// App language → CEJIL language code (es/en/pt). FR/AR fall back to es (canonical).
const LANG_CODE: Record<Language, string> = { EN: "en", ES: "es", FR: "es", AR: "es" };

// (sharedId, langCode) → entity doc
const bySidLang = new Map<string, (typeof cejilEntities)[number]>();
for (const e of cejilEntities) bySidLang.set(`${e.sharedId}::${e.language}`, e);

export const cejilSharedIds = new Set(cejilEntities.map((e) => e.sharedId));
export const isCejilEntity = (id: string) => cejilSharedIds.has(id);

// relationships touching each entity (either endpoint)
const relsByEntity = new Map<string, typeof cejilRelationships>();
for (const r of cejilRelationships) {
  for (const sid of new Set([r.from, r.to])) {
    const a = relsByEntity.get(sid) || [];
    a.push(r);
    relsByEntity.set(sid, a);
  }
}

/** This entity's connections as perspective-normalized References (read-only). */
export function cejilReferencesFor(sharedId: string): Reference[] {
  const rels = relsByEntity.get(sharedId) || [];
  return rels.map((r, i) => {
    const outgoing = r.from === sharedId;
    return {
      id: `cejil-${r.hub}-${i}-${r.from}-${r.to}`,
      sourceEntityId: sharedId,
      targetEntityId: outgoing ? r.to : r.from,
      relationType: r.typeName || "related",
      direction: outgoing ? ("outgoing" as const) : ("incoming" as const),
      hubId: r.hub,
      createdAt: "",
    };
  });
}

const filesBySid = new Map<string, typeof cejilFiles>();
for (const f of cejilFiles) {
  const arr = filesBySid.get(f.entity) || [];
  arr.push(f);
  filesBySid.set(f.entity, arr);
}

const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({ name: p.name, label: p.label, type: p.type })),
  ]),
);

const SKIP = new Set(["preview", "geolocation", "image", "link", "media", "nested", "generatedtoc", "relationship"]);

function fmtDate(v: unknown): string {
  if (typeof v !== "number" || v <= 0) return "";
  const d = new Date(v * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}

/** Resolve one entity-language doc's metadata into scalar MetadataField[]. */
function mdFields(e: (typeof cejilEntities)[number]): MetadataField[] {
  const props = propsByTemplate.get(e.template) || [];
  const out: MetadataField[] = [];
  for (const p of props) {
    if (p.name === "title" || SKIP.has(p.type)) continue;
    const vals = e.metadata?.[p.name];
    if (!vals || !vals.length) continue;

    if (p.type === "date" || p.type === "datasection") {
      const value = fmtDate(vals[0]?.value);
      if (value) out.push({ id: p.name, label: p.label, type: "date", value });
      continue;
    }
    // país / country-flavoured relationship handled upstream as relationship —
    // but plain text/select/multiselect land here.
    const labels = vals.map((v) => (typeof v.label === "string" ? v.label : "")).filter(Boolean);
    if (labels.length) {
      out.push({ id: p.name, label: p.label, type: "text", value: labels.join(", ") });
      continue;
    }
    const v = vals[0]?.value;
    if (typeof v === "string" && v.trim()) {
      const s = v.replace(/\s+/g, " ").trim();
      if (/^https?:\/\//.test(s) || s.startsWith("{") || s.startsWith("[")) continue;
      out.push({ id: p.name, label: p.label, type: s.length > 120 ? "multiline" : "text", value: s });
    }
  }
  return out;
}

const FILE_LANG: Record<string, string> = { spa: "ES", eng: "EN", por: "ES" };
const SENTENCIA_TPL = cejilTemplates.find((t) => t.name === "Sentencia de la CorteIDH")?._id;

/** Reflow wrapped extraction lines into prose paragraphs (split on blank lines;
 *  join the single-newline wraps within each block). */
function reflow(pages: string[]): string[] {
  const out: string[] = [];
  for (const page of pages) {
    for (const chunk of page.split(/\n\s*\n/)) {
      const joined = chunk.split(/\n/).map((l) => l.trim()).filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      if (joined) out.push(joined);
    }
  }
  return out;
}

/** A text rendition from the real extracted fullText. */
function buildRendition(title: string, pages: string[]): DocRendition {
  const paras = reflow(pages);
  const blocks: HtmlBlock[] = [{ type: "h1", text: title }, ...paras.map((p) => ({ type: "p" as const, text: p }))];
  return { plainText: paras.join("\n\n"), html: blocks };
}

/** Url'd PDF files for an entity, else borrow from a connected document entity
 *  (a Causa → its Sentencia), so opening a case shows its primary judgment. */
function docFilesFor(sharedId: string): { files: typeof cejilFiles; titleSid: string } {
  const own = (filesBySid.get(sharedId) || []).filter((f) => f.url && f.isPdf);
  if (own.length) return { files: own, titleSid: sharedId };
  const candidates = (relsByEntity.get(sharedId) || [])
    .map((r) => (r.from === sharedId ? r.to : r.from))
    .map((o) => ({ o, files: (filesBySid.get(o) || []).filter((f) => f.url && f.isPdf), tpl: bySidLang.get(`${o}::es`)?.template }))
    .filter((c) => c.files.length)
    .sort((a, b) => (b.tpl === SENTENCIA_TPL ? 1 : 0) - (a.tpl === SENTENCIA_TPL ? 1 : 0));
  return candidates.length ? { files: candidates[0].files, titleSid: candidates[0].o } : { files: [], titleSid: sharedId };
}

/** Shared-ids that actually surface a viewable PDF — their own downloaded PDF
 *  or one borrowed from a connected Sentencia. The single source of truth for
 *  the Library card's "has document" indicator, so it matches exactly what
 *  buildCejilProfile renders (a file record alone isn't enough — most are
 *  metadata-only, with no fetched binary). */
export const cejilDocBearingIds = new Set(
  [...cejilSharedIds].filter((sid) => docFilesFor(sid).files.length > 0),
);

export function buildCejilProfile(sharedId: string): EntityProfile {
  const es = bySidLang.get(`${sharedId}::es`) || bySidLang.get(`${sharedId}::en`)!;
  const metadata = LANGS.reduce((acc, lang) => {
    const doc = bySidLang.get(`${sharedId}::${LANG_CODE[lang]}`) || es;
    acc[lang] = mdFields(doc);
    return acc;
  }, {} as Record<Language, MetadataField[]>);

  // Document-bearing when we fetched a real PDF for this entity OR for one of its
  // connected documents (a Causa surfaces its Sentencia) — never the mock PDF.
  const { files: urlFiles, titleSid } = docFilesFor(sharedId);
  if (urlFiles.length === 0) {
    return { id: sharedId, typeId: es.template, hasDocument: false, metadata, documentGroups: [], files: [], relationships: { kind: "references" } };
  }
  const docTitle = bySidLang.get(`${titleSid}::es`)?.title || es.title;

  const groupId = `g-cejil-${sharedId}`;
  const files: FileEntry[] = urlFiles.map((f) => ({
    id: f._id,
    groupId,
    name: f.originalname || f.filename,
    language: FILE_LANG[f.language] || "ES",
    type: "pdf",
    size: "",
    modified: "",
    url: f.url!,
  }));
  const group: DocumentGroup = { id: groupId, title: docTitle, isPrimary: true, order: 0 };

  const primary = urlFiles[0];
  const pages = cejilFullText[primary.filename] || [];
  const rendition = buildRendition(docTitle, pages);
  const docMeta: DocumentMeta = {
    id: `doc-${sharedId}`,
    title: docTitle,
    entityTypeId: es.template,
    language: FILE_LANG[primary.language] || "ES",
    createdAt: "",
    pages: primary.totalPages || pages.length || 1,
    filename: primary.originalname || primary.filename,
  };
  const byLang = <T,>(v: T) => LANGS.reduce((a, l) => ((a[l] = v), a), {} as Record<Language, T>);

  return {
    id: sharedId,
    typeId: es.template,
    hasDocument: true,
    metadata,
    document: byLang(docMeta),
    renditions: byLang(rendition),
    documentGroups: [group],
    files,
    relationships: { kind: "references" },
  };
}
