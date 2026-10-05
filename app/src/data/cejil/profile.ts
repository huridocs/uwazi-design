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
import { displayStrings, recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { registerEntityPropReader } from "../entityMetadata";
import { PLACE_INHERITED_KEY } from "./placeKey";
import { cejilTemplates } from "./templates";
import { cejilRelationTypes } from "./relationTypes";
import { chains, type ChainGraph, type ProvenanceStep } from "../../utils/chainTraversal";
import { registerInheritanceGraph } from "../../utils/inheritance";
import { cejilChainGraph, CEJIL_PERPETRATOR_CHAIN } from "./graph";
import { curatedCejilRefsFor } from "./textAnchors";
import {
  cejilBySidLang,
  cejilEsBySid,
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

/** Thesaurus value id → its label in `lang`, read off the corpus's own
 *  per-language records: the dump carries no thesaurus translations, but every
 *  record stores each chosen value as `{ value: id, label }` in its language.
 *  FR and AR read the Spanish records (see LANG_CODE), so only English differs.
 *  Built once per language, after the corpus has loaded. */
const valueLabelCache = new Map<string, Map<string, string>>();
export function cejilValueLabels(lang: Language): Map<string, string> {
  const code = LANG_CODE[lang];
  const hit = valueLabelCache.get(code);
  if (hit) return hit;
  const m = new Map<string, string>();
  for (const [key, doc] of cejilBySidLang()) {
    if (!key.endsWith(`::${code}`)) continue;
    for (const vals of Object.values(doc.metadata ?? {}))
      for (const v of vals ?? [])
        if (typeof v.value === "string" && typeof v.label === "string" && !m.has(v.value)) m.set(v.value, v.label);
  }
  if (m.size) valueLabelCache.set(code, m);
  return m;
}

/** True once the corpus is loaded and this id is one of its shared entities. */
export const isCejilEntity = (id: string) => cejilSharedIdSet().has(id);

/** This entity's connections as perspective-normalized References (read-only). */
export function cejilReferencesFor(sharedId: string): Reference[] {
  const rels = cejilRelsByEntity().get(sharedId) || [];
  const derived = rels.map((r, i) => {
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
  // Plus the hand-curated text↔text references (the published corpus is
  // entity-level only, so anchored quotes are curated — see textAnchors.ts).
  return [...derived, ...curatedCejilRefsFor(sharedId)];
}

const propsByTemplate = new Map(
  cejilTemplates.map((t) => [
    t._id,
    [...(t.commonProperties || []), ...t.properties].map((p) => ({
      name: p.name,
      label: p.label,
      type: p.type,
      relationType: (p as { relationType?: string }).relationType,
      /** Target template of a relationship property, when it names one. */
      content: (p as { content?: string }).content,
      inherit: (p as { inherit?: { type?: string } }).inherit,
    })),
  ]),
);

/** The template Uwazi gives an uploaded document: the one flagged `default`. */
export function cejilDefaultTemplateId(): string | undefined {
  return cejilTemplates.find((t) => t.default)?._id;
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

/** The connected document an entity's rendered PDF was borrowed FROM — the
 *  entity that owns it, named. Absent when the entity renders its own file. */
export interface BorrowedDoc {
  entityId: string;
  title: string;
}

/** Url'd PDF files for an entity, else borrow from a connected document entity
 *  (a Causa → its Sentencia), so opening a case shows its primary judgment. */
/** The document the viewer ACTUALLY renders for this entity: its per-page text,
 *  plus — when the file came from a CONNECTED entity — which one.
 *
 *  Goes through `docFilesFor`, the same selection the profile/viewer uses — which
 *  falls back to a RELATED entity's PDF (a Causa shows its Sentencia). Reading
 *  the entity's own files instead gave two wrong answers: no pages at all for a
 *  Causa, and — when a differently-languaged file happened to carry fullText —
 *  page numbers belonging to a file that wasn't on screen (the "p.9 lands on 15"
 *  report). Page numbers must refer to the document being displayed.
 *
 *  `borrowedFrom` is that same fallback, said out loud: `titleSid !== sharedId` is
 *  exactly the borrow, and it's what `buildCejilProfile` already titles the
 *  document group with.
 *
 *  Both answers come off ONE `docFilesFor` walk on purpose: the fallback scans the
 *  entity's relationships, and a País hub has thousands of edges — asking twice is
 *  not free. */
export function cejilRenderedDoc(sharedId: string): {
  pages: string[];
  borrowedFrom: BorrowedDoc | null;
  /** The key the TEXT was resolved by — see `docKeyOf`. Null with no document. */
  docKey: string | null;
  /** The `_id` of the file the text was cut from. The viewer picks among an
   *  entity's files by reading language, so a passage's page only means
   *  something in THIS file — a page jump has to open it (`passageFileIdAtom`). */
  fileId: string | null;
} {
  const { files, titleSid } = docFilesFor(sharedId);
  const primary = files[0];
  if (!primary) return { pages: [], borrowedFrom: null, docKey: null, fileId: null };
  return {
    pages: docPagesOf(primary),
    docKey: docKeyOf(primary),
    fileId: primary._id,
    borrowedFrom:
      titleSid === sharedId
        ? null
        : { entityId: titleSid, title: cejilBySidLang().get(`${titleSid}::es`)?.title || titleSid },
  };
}

/** A file's per-page text — BY FILE `_id` first.
 *
 *  `filename` cannot address a document here: `files.json` was rewritten after the
 *  import so 5,245 records carry 6 distinct filenames (and 6 urls), which is why
 *  hundreds of unrelated cases quote the same page of the same judgment. `_id`
 *  survived that rewrite intact — 5,245 distinct — and it is the public
 *  instance's own id, so `scripts/recover-cejil-docs.cjs` can fetch the real
 *  document for one and key its text by `_id`.
 *
 *  The filename fallback is for every record that pilot hasn't reached: they
 *  still point at the 6 stand-ins, and dropping them would take the whole
 *  corpus's full-text search down to the recovered handful. A record resolving
 *  through the fallback is showing another document's text — that is what
 *  `BorrowedDocLine` warns about, and it goes away as records are recovered. */
function docPagesOf(file: CejilFile): string[] {
  const byKey = cejilFullText();
  return byKey[file._id] ?? byKey[file.filename] ?? [];
}

/** The `cejilFullText` key `docPagesOf` resolves this file's text by: its `_id`
 *  when the document was recovered, else the stand-in filename it still points
 *  at. Two records with the same key show the same text, which is what a
 *  "same passage" test needs; the `_id` alone would call the six stand-ins
 *  5,000 different documents. */
function docKeyOf(file: CejilFile): string | null {
  const byKey = cejilFullText();
  if (byKey[file._id]) return file._id;
  if (byKey[file.filename]) return file.filename;
  return null;
}

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


/** Template property names that point at a relation TYPE, per template.
 *
 *  The record groups relationships by the type name the GRAPH carries, while a
 *  Library card addresses a property by the template's own name for it. This is
 *  the bridge: a group emitted below says which property names it covers, and
 *  the record's deep-focus query matches any of them. Several properties can
 *  share one relation type — they land on one group, which is the truth.
 *  Built once, keyed `${templateId}::${typeName}`. */
let aliasIndex: Map<string, string[]> | null = null;
function propNamesForRelType(templateId: string, typeName: string): string[] | undefined {
  if (!aliasIndex) {
    const nameOf = new Map(cejilRelationTypes.map((r) => [r._id, r.name]));
    aliasIndex = new Map();
    for (const t of cejilTemplates) {
      for (const p of t.properties || []) {
        if (p.type !== "relationship" || !p.relationType) continue;
        const n = nameOf.get(p.relationType);
        if (!n) continue;
        const k = `${t._id}::${n}`;
        const list = aliasIndex.get(k);
        if (list) list.push(p.name);
        else aliasIndex.set(k, [p.name]);
      }
    }
  }
  return aliasIndex.get(`${templateId}::${typeName}`);
}

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
function cejilChainFields(sharedId: string, template: string): RelationshipMetadataField[] {
  const out: RelationshipMetadataField[] = [];

  // 1. Signing judges + inherited país (Causa via chain, signing doc directly).
  const graph = cejilChainGraph();
  if (graph) {
    const signing = signingJudges(graph, sharedId, template);
    if (signing) {
      const { judges, provenance } = signing;
      out.push({
        id: `cejil-firmantes-${sharedId}`,
        keyAliases: propNamesForRelType(template, "Firmantes"),
        label: "Jueces firmantes",
        type: "relationship",
        relationType: "Firmantes",
        targetTypeId: JUEZ_TEMPLATE ?? "",
        inheritPath: JUDGE_TO_PAIS,
        inheritLeaf: CEJIL_PERPETRATOR_CHAIN.leaf.property,
        inheritLabel: "País",
        entityLabel: "Juez",
        reduce: "distinct", // the bench spans N distinct jurisdictions
        connectedEntityIds: judges.slice(0, CHAIN_JUDGE_CAP),
        connectionProvenance: provenance,
        totalConnected: judges.length,
        readOnly: true,
      });
    }
  }

  // Direct connections are the record's relationship PROPERTIES now
  // (template-schema-spec.md step M3), read from `metadata[name]`; the rest of
  // the graph stays on the Relationships tab.
  return out;
}


/** What the record projection needs to know about CEJIL: relationship types
 *  by their dump name (what its references carry and `relationLabel`
 *  resolves) and its templates. */
const relTypeNameById = new Map(cejilRelationTypes.map((r) => [r._id, r.name]));
const recordCtx: RecordContext = {
  corpus: "cejil",
  relationTypeName: (id) => relTypeNameById.get(id ?? "") ?? "Relacionado",
  template: (id) => templateMirror("cejil", id),
};

/** The relationship property of a template that inherits a geolocation
 *  (Causa's "Geolocalización de los hechos"): the card's place line focuses it. */
function placePropertyOf(templateId: string): string | undefined {
  return templateMirror("cejil", templateId)?.properties.find(
    (p) => p.type === "relationship" && p.inherit?.type === "geolocation",
  )?.name;
}

/** An inherited column's value: one property of a CEJIL entity, as display
 *  text through its template's type. Registered with `getEntityProp`, which
 *  the inheritance resolver reads (as Travesía's profile does). */
registerEntityPropReader((entityId, propName) => {
  const doc = cejilEsBySid().get(entityId);
  if (!doc) return undefined;
  const p = templateMirror("cejil", doc.template)?.properties.find((x) => x.name === propName);
  if (!p) return undefined;
  const values = displayStrings(p.type, doc.metadata?.[propName]);
  return values.length ? values.join(", ") : undefined;
});

/** Put an entity's fields in its template's declared order.
 *
 *  The fields are built in three batches (scalars, the inherited place, the
 *  relationship groups), and the record lays them out in array order, so the
 *  batches have to be merged back into the template's sequence here:
 *   - a scalar sits at its own property (`id` is the property name);
 *   - the inherited place sits at the relationship property that declares
 *     `inherit: {type: "geolocation"}`;
 *   - a relationship group sits at the first template property of its relation
 *     type (`keyAliases` lists those property names);
 *   - failing that, at the first relationship property whose target template
 *     (`content`) is the template of EVERY entity the group connects. This
 *     places groups whose edges carry another relation type, or none
 *     ("Relacionado"), but point at exactly what a property points at. A group
 *     whose entities span several templates is not placed by one of them.
 *  A field neither rule places (a relation the template does not model, e.g.
 *  "Jueces firmantes" on a Causa, which reaches its judges through a Sentencia
 *  and has no Juez property) has no position and goes after every declared one,
 *  in the order it was built. The sort is stable, so ties keep build order too. */
function orderByTemplate(templateId: string, fields: AnyMetadataField[]): AnyMetadataField[] {
  const props = propsByTemplate.get(templateId) || [];
  const indexOf = new Map(props.map((p, i) => [p.name, i]));
  const placeIndex = props.findIndex(
    (p) => p.type === "relationship" && p.inherit?.type === "geolocation",
  );
  const byTarget = (f: RelationshipMetadataField): number => {
    const templates = new Set(
      f.connectedEntityIds.map((id) => cejilEsBySid().get(id)?.template).filter(Boolean),
    );
    if (templates.size !== 1) return Infinity;
    const [target] = templates;
    const i = props.findIndex((p) => p.type === "relationship" && p.content === target);
    return i >= 0 ? i : Infinity;
  };
  const position = (f: AnyMetadataField): number => {
    if (f.id === PLACE_INHERITED_KEY) return placeIndex >= 0 ? placeIndex : Infinity;
    if (f.type === "relationship") {
      // A relationship property sits at itself; a chain field at the property
      // of its relation type, else by its targets.
      const own = indexOf.get(f.id);
      if (own !== undefined) return own;
      const hits = (f.keyAliases ?? [])
        .map((name) => indexOf.get(name))
        .filter((i): i is number => i !== undefined);
      return hits.length ? Math.min(...hits) : byTarget(f);
    }
    return indexOf.get(f.id) ?? Infinity;
  };
  return fields
    .map((field, i) => ({ field, i, pos: position(field) }))
    .sort((a, b) => (a.pos === b.pos ? a.i - b.i : a.pos < b.pos ? -1 : 1))
    .map((x) => x.field);
}

export function buildCejilProfile(sharedId: string): EntityProfile {
  const es = cejilBySidLang().get(`${sharedId}::es`) || cejilBySidLang().get(`${sharedId}::en`)!;
  const chainFields = cejilChainFields(sharedId, es.template);
  const template = templateMirror("cejil", es.template);
  const metadata = LANGS.reduce((acc, lang) => {
    const doc = cejilBySidLang().get(`${sharedId}::${LANG_CODE[lang]}`) || es;
    // The template is the schema: every property in its order, typed as the
    // template types it, nothing flattened (step M3). The connection that
    // inherits a place also answers to the card's place line.
    const projected = recordFieldsFor(template, doc.metadata, recordCtx).map((f) =>
      f.type === "relationship" && f.id === placePropertyOf(es.template) ? { ...f, keyAliases: [PLACE_INHERITED_KEY] } : f,
    );
    acc[lang] = orderByTemplate(es.template, [...projected, ...chainFields]);
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
  const pages = docPagesOf(primary);
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
