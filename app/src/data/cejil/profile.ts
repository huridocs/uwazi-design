// Builds a real EntityProfile for a CEJIL entity (by sharedId), so the drawer
// preview + EntityView render real metadata / documents / relationships. Imported
// only by getEntityProfile (which delegates here for CEJIL ids); the heavy CEJIL
// data is already in the bundle via the Library, so this adds no new weight.
import type { Language } from "../../atoms/language";
import type { EntityProfile } from "../entityProfiles";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../metadata";
import type { DocumentMeta } from "../document";
import type { DocRendition, HtmlBlock } from "../documentRenditions";
import type { FileEntry, DocumentGroup } from "../files";
import type { Reference } from "../references";
import type { CejilEntity, CejilFile } from "./types";
import { cejilTemplates } from "./templates";
import { chains, type ChainGraph, type ProvenanceStep } from "../../utils/chainTraversal";
import { registerInheritanceGraph } from "../../utils/inheritance";
import { cejilChainGraph, CEJIL_PERPETRATOR_CHAIN } from "./graph";
import {
  cejilBySidLang,
  cejilRelsByEntity,
  cejilFilesBySid,
  cejilSharedIdSet,
  cejilFullText,
  cejilLoaded,
} from "./load";

// Back multi-hop (`inheritPath`) inheritance with the CEJIL graph. Registered
// once here (dependency inversion — utils/inheritance never imports CEJIL). The
// provider returns null until the corpus loads; resolution simply yields nothing
// until then. Idempotent, so importing this module wires it up.
registerInheritanceGraph(cejilChainGraph);

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];
// App language → CEJIL language code (es/en/pt). FR/AR fall back to es (canonical).
const LANG_CODE: Record<Language, string> = { EN: "en", ES: "es", FR: "es", AR: "es" };

/** True once the corpus is loaded and this id is one of its shared entities. */
export const isCejilEntity = (id: string) => cejilSharedIdSet().has(id);

/** This entity's connections as perspective-normalized References (read-only). */
export function cejilReferencesFor(sharedId: string): Reference[] {
  const rels = cejilRelsByEntity().get(sharedId) || [];
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
function mdFields(e: CejilEntity): MetadataField[] {
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
function docFilesFor(sharedId: string): { files: CejilFile[]; titleSid: string } {
  const own = (cejilFilesBySid().get(sharedId) || []).filter((f) => f.url && f.isPdf);
  if (own.length) return { files: own, titleSid: sharedId };
  const candidates = (cejilRelsByEntity().get(sharedId) || [])
    .map((r) => (r.from === sharedId ? r.to : r.from))
    .map((o) => ({ o, files: (cejilFilesBySid().get(o) || []).filter((f) => f.url && f.isPdf), tpl: cejilBySidLang().get(`${o}::es`)?.template }))
    .filter((c) => c.files.length)
    .sort((a, b) => (b.tpl === SENTENCIA_TPL ? 1 : 0) - (a.tpl === SENTENCIA_TPL ? 1 : 0));
  return candidates.length ? { files: candidates[0].files, titleSid: candidates[0].o } : { files: [], titleSid: sharedId };
}

/** Shared-ids that actually surface a viewable PDF — their own downloaded PDF
 *  or one borrowed from a connected Sentencia. The single source of truth for
 *  the Library card's "has document" indicator, so it matches exactly what
 *  buildCejilProfile renders (a file record alone isn't enough — most are
 *  metadata-only, with no fetched binary). */
let _docBearing: Set<string> | null = null;
export function cejilDocBearingIds(): Set<string> {
  if (!cejilLoaded()) return new Set();
  if (!_docBearing) {
    _docBearing = new Set([...cejilSharedIdSet()].filter((sid) => docFilesFor(sid).files.length > 0));
  }
  return _docBearing;
}

/** Cap connected entities rendered per relationship card — a País hub has
 *  thousands of edges; show a workable slice rather than the whole fan-out. */
const REL_CONN_CAP = 15;
const CHAIN_JUDGE_CAP = 12;

const templateIdByName = (name: string) => cejilTemplates.find((t) => t.name === name)?._id;
const JUEZ_TEMPLATE = templateIdByName("Juez y/o Comisionado");

/** Relation-type id of a `firmantes` (signing-judges) property. */
const FIRMANTES_REL_ID = "5ab920b3163b080aaa44310f";
/** Template ids of documents that carry a `firmantes` relationship (Sentencia,
 *  Resolución, Voto Separado, Informe de Fondo, …) — the ones whose signing
 *  judges we can surface WITH inherited país directly, one hop from the doc,
 *  rather than only reaching them from a Causa via the full chain. */
const SIGNING_DOC_TEMPLATES = new Set(
  cejilTemplates
    .filter((t) =>
      (t.properties || []).some((p) => p.type === "relationship" && p.relationType === FIRMANTES_REL_ID),
    )
    .map((t) => t._id),
);

/** The inheritance hop shared by both routes: from a signing judge to their
 *  País. Declared on the field as `inheritPath`; the unified resolver traverses
 *  it live per judge (no pre-baked values). */
const JUDGE_TO_PAIS = CEJIL_PERPETRATOR_CHAIN.segments.slice(2); // [Juez → País]

/** Signing judges for an entity — the materialised connection only; each judge's
 *  País is inherited LIVE via `JUDGE_TO_PAIS`, not resolved here. Two routes to
 *  the judges:
 *   - a **Causa** reaches them through its Sentencia — walk the first two
 *     segments (Causa → Sentencia → Juez);
 *   - a **signing document** (Sentencia/Resolución/…) connects to them directly
 *     — walk one segment (Doc → Juez).
 *  Returns deduped judge ids + per-judge provenance (the intermediary nodes
 *  between the root and the judge — the Sentencia they signed, on the Causa
 *  route; none on the direct route), or null when there are no signing judges. */
function signingJudges(
  graph: ChainGraph,
  sharedId: string,
  template: string,
): { judges: string[]; provenance: Record<string, ProvenanceStep[]> } | null {
  let segments = CEJIL_PERPETRATOR_CHAIN.segments.slice(0, 2); // [Causa→Sentencia, Sentencia→Juez]
  let judgeIdx = 2; // [Causa, Sentencia, Juez]
  if (template !== CEJIL_PERPETRATOR_CHAIN.rootTypeId) {
    if (!SIGNING_DOC_TEMPLATES.has(template)) return null;
    segments = CEJIL_PERPETRATOR_CHAIN.segments.slice(1, 2); // [Firmantes→Juez]
    judgeIdx = 1; // [Doc, Juez]
  }
  const { tuples } = chains(graph, sharedId, segments, { maxPaths: 400 });
  const judges: string[] = [];
  const provenance: Record<string, ProvenanceStep[]> = {};
  const seen = new Set<string>();
  for (const t of tuples) {
    const judge = t[judgeIdx]?.entityId;
    if (!judge || seen.has(judge)) continue;
    seen.add(judge);
    judges.push(judge);
    // Intermediaries strictly between the root (index 0) and the judge.
    const steps: ProvenanceStep[] = [];
    for (let i = 1; i < judgeIdx; i++) {
      const s = t[i];
      steps.push({
        entityId: s.entityId,
        title: graph.titleOf(s.entityId) ?? s.entityId,
        typeId: graph.templateOf(s.entityId),
        relationLabel: segments[i - 1]?.label ?? s.relationType ?? undefined,
      });
    }
    if (steps.length) provenance[judge] = steps;
  }
  return judges.length ? { judges, provenance } : null;
}

/** Relationship fields for a CEJIL entity, surfaced in the Metadata view.
 *
 *  1. Signing judges (+ inherited País) as the lead field — for a Causa via the
 *     full chain, for a signing document directly (see `signingJudges`). This is
 *     the inheritance surface; when present it replaces the raw "Firmantes"
 *     link-only group so judges aren't listed twice.
 *  2. Direct connections grouped by relation type → one link-only field each
 *     (capped). Makes every CEJIL entity show its remaining graph neighbours. */
function cejilRelationshipFields(sharedId: string, template: string): RelationshipMetadataField[] {
  const out: RelationshipMetadataField[] = [];

  // 1. Signing judges + inherited país (Causa via chain, signing doc directly).
  let promotedRelType: string | undefined;
  const graph = cejilChainGraph();
  if (graph) {
    const signing = signingJudges(graph, sharedId, template);
    if (signing) {
      const { judges, provenance } = signing;
      out.push({
        id: `cejil-firmantes-${sharedId}`,
        label: "Jueces firmantes",
        type: "relationship",
        relationType: "Firmantes",
        targetTypeId: JUEZ_TEMPLATE ?? "",
        inheritPath: JUDGE_TO_PAIS,
        inheritLeaf: CEJIL_PERPETRATOR_CHAIN.leaf.property,
        inheritLabel: "País",
        reduce: "distinct", // the bench spans N distinct jurisdictions
        connectedEntityIds: judges.slice(0, CHAIN_JUDGE_CAP),
        connectionProvenance: provenance,
        totalConnected: judges.length,
        readOnly: true,
      });
      promotedRelType = "Firmantes"; // shown inherited above — don't repeat below
    }
  }

  // 2. Direct connections grouped by relation type (skip the promoted group).
  const rels = cejilRelsByEntity().get(sharedId) || [];
  const byType = new Map<string, { ids: string[]; seen: Set<string> }>();
  for (const r of rels) {
    const other = r.from === sharedId ? r.to : r.from;
    const typeName = r.typeName || "Relacionado";
    if (typeName === promotedRelType) continue;
    let g = byType.get(typeName);
    if (!g) byType.set(typeName, (g = { ids: [], seen: new Set() }));
    if (!g.seen.has(other)) {
      g.seen.add(other);
      g.ids.push(other);
    }
  }
  for (const [typeName, g] of byType) {
    out.push({
      id: `cejil-rel-${sharedId}-${typeName}`,
      label: typeName,
      type: "relationship",
      relationType: typeName,
      targetTypeId: "",
      connectedEntityIds: g.ids.slice(0, REL_CONN_CAP),
      totalConnected: g.ids.length,
      readOnly: true,
    });
  }

  return out;
}

export function buildCejilProfile(sharedId: string): EntityProfile {
  const es = cejilBySidLang().get(`${sharedId}::es`) || cejilBySidLang().get(`${sharedId}::en`)!;
  const relFields = cejilRelationshipFields(sharedId, es.template);
  const metadata = LANGS.reduce((acc, lang) => {
    const doc = cejilBySidLang().get(`${sharedId}::${LANG_CODE[lang]}`) || es;
    acc[lang] = [...mdFields(doc), ...relFields];
    return acc;
  }, {} as Record<Language, AnyMetadataField[]>);

  // Document-bearing when we fetched a real PDF for this entity OR for one of its
  // connected documents (a Causa surfaces its Sentencia) — never the mock PDF.
  const { files: urlFiles, titleSid } = docFilesFor(sharedId);
  if (urlFiles.length === 0) {
    return { id: sharedId, typeId: es.template, hasDocument: false, metadata, documentGroups: [], files: [], relationships: { kind: "references" } };
  }
  const docTitle = cejilBySidLang().get(`${titleSid}::es`)?.title || es.title;

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
  const pages = cejilFullText()[primary.filename] || [];
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
