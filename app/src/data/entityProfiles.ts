import type { Language } from "../atoms/language";
import type { DocumentMeta } from "./document";
import { documentsByLanguage } from "./document";
import type { AnyMetadataField, MetadataField } from "./metadata";
import { metadataFieldsByLanguage, pdfMetadataByLanguage } from "./metadata";
import type { DocRendition } from "./documentRenditions";
import { renditionsByLanguage } from "./documentRenditions";
import type { FileEntry, DocumentGroup } from "./files";
import { files, documentGroups, entityDocument } from "./files";
import { getEntity, type Entity } from "./entities";
import { getEntityProps } from "./entityMetadata";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

/** Per-language PDF-metadata block (mirrors pdfMetadataByLanguage's shape). */
type PdfMetaByLang = Record<
  Language,
  { name: string; type: string; size: string; lastEdited: string; added: string }
>;

/** How an entity's connections are obtained. */
export type RelationshipSource =
  | { kind: "references" } // derive from referencesAtom where source/target === this id
  | { kind: "seeded"; refs: import("./references").Reference[] };

/**
 * The per-entity bundle the entity-aware views read. Language-variant fields keep
 * the `Record<Language, …>` shape so downstream signatures don't change. The main
 * entity's profile points at the existing globals by reference (zero-copy → zero
 * regression); other entities get a synthesized lightweight profile or an
 * authored CURATED one.
 */
export interface EntityProfile {
  id: string;
  typeId: string;
  hasDocument: boolean;
  document?: Record<Language, DocumentMeta>;
  renditions?: Record<Language, DocRendition>;
  documentGroups?: DocumentGroup[];
  files?: FileEntry[];
  metadata: Record<Language, AnyMetadataField[]>;
  pdfMetadata?: PdfMetaByLang;
  relationships: RelationshipSource;
}

/** Canonical main entity. `e3` is already the source of the whole references[]
 *  corpus and the only id wired into the relationships pipeline, so it stays the
 *  focal default and its profile reuses every existing global unchanged. */
export const MAIN_ENTITY_ID = "e3";

/** Types that carry a document (and therefore a Document tab + viewer). */
const DOC_TYPES = new Set(["court_case", "judgment", "document"]);
export function typeHasDocument(typeId: string): boolean {
  return DOC_TYPES.has(typeId);
}

/** Main entity = the existing Velásquez globals, assembled by reference. */
const mainProfile: EntityProfile = {
  id: MAIN_ENTITY_ID,
  typeId: "court_case",
  hasDocument: true,
  document: documentsByLanguage,
  renditions: renditionsByLanguage,
  documentGroups,
  files,
  metadata: metadataFieldsByLanguage,
  pdfMetadata: pdfMetadataByLanguage,
  relationships: { kind: "references" },
};

/* ── Lightweight profile synthesis ──────────────────────────────────────── */

/** Localized labels for the handful of synthesized fields, so AR/RTL renders. */
const FIELD_LABELS: Record<string, Record<Language, string>> = {
  country: { EN: "Country", ES: "País", FR: "Pays", AR: "البلد" },
  role: { EN: "Role", ES: "Rol", FR: "Rôle", AR: "الدور" },
  region: { EN: "Region", ES: "Región", FR: "Région", AR: "المنطقة" },
  born: { EN: "Date of birth", ES: "Fecha de nacimiento", FR: "Date de naissance", AR: "تاريخ الميلاد" },
  summary: { EN: "Summary", ES: "Resumen", FR: "Résumé", AR: "ملخص" },
  article: { EN: "Convention article", ES: "Artículo de la Convención", FR: "Article de la Convention", AR: "مادة الاتفاقية" },
  instrument: { EN: "Source instrument", ES: "Instrumento fuente", FR: "Instrument source", AR: "الصك المصدر" },
  founded: { EN: "Founded", ES: "Fundación", FR: "Fondation", AR: "التأسيس" },
  headquarters: { EN: "Headquarters", ES: "Sede", FR: "Siège", AR: "المقر" },
  date: { EN: "Date", ES: "Fecha", FR: "Date", AR: "التاريخ" },
  citation: { EN: "Citation", ES: "Cita", FR: "Référence", AR: "المرجع" },
  issuingBody: { EN: "Issuing body", ES: "Órgano emisor", FR: "Organe émetteur", AR: "الجهة المصدرة" },
};

/** English labels for the broader property set (localized labels above win). */
const ENGLISH_LABELS: Record<string, string> = {
  country: "Country",
  role: "Role",
  profession: "Profession",
  born: "Date of birth",
  region: "Region",
  achrRatified: "Ratified ACHR",
  courtJurisdiction: "Accepts Court jurisdiction",
  caseNumber: "Case number",
  dateFiled: "Date filed",
  respondent: "Respondent State",
  status: "Status",
  instrument: "Legal instrument",
  article: "Article",
  category: "Category",
  date: "Date",
  court: "Court",
  series: "Series",
  outcome: "Outcome",
  orgType: "Type",
  founded: "Founded",
  headquarters: "Headquarters",
  relatedRight: "Related right",
  definition: "Definition",
  docType: "Type",
  adopted: "Date of adoption",
  source: "Source",
};

function lbl(key: string, lang: Language): string {
  return FIELD_LABELS[key]?.[lang] ?? ENGLISH_LABELS[key] ?? key;
}

function field(id: string, labelKey: string, type: MetadataField["type"], value: string, lang: Language): MetadataField {
  return { id, label: lbl(labelKey, lang), type, value };
}

/** Per-type property order + field type for the Library/Metadata display. */
const TYPE_FIELDS: Record<string, { prop: string; type: MetadataField["type"] }[]> = {
  person: [
    { prop: "country", type: "text" },
    { prop: "role", type: "text" },
    { prop: "profession", type: "text" },
    { prop: "born", type: "text" },
  ],
  country: [
    { prop: "region", type: "text" },
    { prop: "achrRatified", type: "text" },
    { prop: "courtJurisdiction", type: "text" },
  ],
  court_case: [
    { prop: "caseNumber", type: "text" },
    { prop: "dateFiled", type: "text" },
    { prop: "respondent", type: "link" },
    { prop: "status", type: "text" },
    { prop: "region", type: "text" },
  ],
  right: [
    { prop: "instrument", type: "link" },
    { prop: "article", type: "text" },
    { prop: "category", type: "text" },
  ],
  judgment: [
    { prop: "date", type: "text" },
    { prop: "court", type: "link" },
    { prop: "series", type: "text" },
    { prop: "outcome", type: "text" },
  ],
  organization: [
    { prop: "orgType", type: "text" },
    { prop: "founded", type: "text" },
    { prop: "headquarters", type: "text" },
  ],
  violation: [
    { prop: "category", type: "text" },
    { prop: "relatedRight", type: "link" },
    { prop: "definition", type: "multiline" },
  ],
  document: [
    { prop: "docType", type: "text" },
    { prop: "adopted", type: "text" },
    { prop: "source", type: "text" },
  ],
};

/** Type-appropriate scalar fields from the entity's populated native props.
 *  Only props that have a value are rendered (no em-dash placeholders). */
function synthFields(entity: Entity, lang: Language): AnyMetadataField[] {
  const props = getEntityProps(entity.id, lang);
  const spec = TYPE_FIELDS[entity.typeId] ?? [];
  const out: AnyMetadataField[] = [];
  for (const { prop, type } of spec) {
    const value = props[prop];
    if (value) out.push(field(prop, prop, type, value, lang));
  }
  return out;
}

/** A stub document header so doc-bearing entities have something in the viewer. */
function stubDocByLang(entity: Entity): Record<Language, DocumentMeta> {
  return LANGS.reduce((acc, lang) => {
    acc[lang] = {
      id: `${entity.id}-doc`,
      title: entity.title,
      entityTypeId: entity.typeId,
      language: documentsByLanguage[lang].language,
      createdAt: "2024-06-15",
      pages: documentsByLanguage[lang].pages,
      filename: documentsByLanguage[lang].filename,
    };
    return acc;
  }, {} as Record<Language, DocumentMeta>);
}

/** "modified"/"created" date for a synthesized document, drawn from whichever
 *  native date the entity carries (judgment date, case filing, doc adoption). */
function entityDocDate(entity: Entity): string {
  const p = getEntityProps(entity.id, "EN");
  return p.date ?? p.dateFiled ?? p.adopted ?? "2024-06-15";
}

function buildLightweightProfile(entity: Entity): EntityProfile {
  const hasDocument = typeHasDocument(entity.typeId);
  const metadata = LANGS.reduce((acc, lang) => {
    acc[lang] = synthFields(entity, lang);
    return acc;
  }, {} as Record<Language, AnyMetadataField[]>);

  // Doc-bearing entities get their own primary document group + EN/ES files,
  // derived from the entity (PDF bytes are a bundled stand-in). The variant
  // alternates deterministically so the corpus isn't visually identical. Non-doc
  // entities (person / country / right / …) have no files at all.
  const doc = hasDocument
    ? entityDocument(
        entity.id,
        entity.title,
        entityDocDate(entity),
        hashStr(entity.id) % 2 === 0 ? "velasquez" : "gelman",
      )
    : undefined;

  return {
    id: entity.id,
    typeId: entity.typeId,
    hasDocument,
    metadata,
    documentGroups: doc ? [doc.group] : [],
    files: doc ? doc.files : [],
    // Doc-bearing entities reuse the bundled renditions as a stand-in
    // (mock-only). Non-doc entities have no document.
    ...(hasDocument ? { document: stubDocByLang(entity), renditions: renditionsByLanguage } : {}),
    relationships: { kind: "references" },
  };
}

/** Stable string hash (no Math.random / Date.now) for deterministic variant pick. */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 131 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ── Registry + accessor ────────────────────────────────────────────────── */

/** Authored rich profiles land here in Phase 3. */
const CURATED: Record<string, EntityProfile> = {};

const PROFILES: Record<string, EntityProfile> = {
  [MAIN_ENTITY_ID]: mainProfile,
  ...CURATED,
};

const lightweightCache = new Map<string, EntityProfile>();

const FALLBACK_ENTITY: Entity = { id: "unknown", title: "Unknown entity", typeId: "document" };

export function getEntityProfile(id: string): EntityProfile {
  const authored = PROFILES[id];
  if (authored) return authored;
  const cached = lightweightCache.get(id);
  if (cached) return cached;
  const built = buildLightweightProfile(getEntity(id) ?? { ...FALLBACK_ENTITY, id });
  lightweightCache.set(id, built);
  return built;
}

/** All entity ids that currently have a profile (authored). Mostly for tooling. */
export function authoredProfileIds(): string[] {
  return Object.keys(PROFILES);
}
