import type { Language } from "../atoms/language";
import type { DocumentMeta } from "./document";
import { documentsByLanguage } from "./document";
import type { AnyMetadataField, MetadataField } from "./metadata";
import { pdfMetadataByLanguage } from "./metadata";
import type { DocRendition } from "./documentRenditions";
import { renditionsByLanguage } from "./documentRenditions";
import type { FileEntry, DocumentGroup } from "./files";
import { files, documentGroups, entityDocument } from "./files";
import { getEntity, type Entity } from "./entities";
import { getEntityProps } from "./entityMetadata";
import { isCejilEntity, buildCejilProfile } from "./cejil/profile";
import { isArtworkEntity, buildArtworkProfile } from "./artworks/profile";
import { isTravesiaEntity, buildTravesiaProfile } from "./travesia/profile";
import type { EntityImage } from "./entities";
import { overlayCreated, overlayRecord, type EntityRecord } from "./entityChanges";
import { sampleRecordFields } from "./sample/values";
import { templatesMirror } from "./templates/mirror";
import type { TemplateDef } from "./templates/types";

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
  /** The entity's own picture, when the entity IS one (an artwork). What
   *  `document` is to a PDF-bearing entity: the thing the record is about, so
   *  the record can lead with it instead of a document card that has no
   *  document to draw. */
  image?: EntityImage;
  /** Every image, `image` first — see `Entity.images`. The record draws one card
   *  per entry, each keyed on its property, which is what a card's filename
   *  link scrolls to. */
  images?: EntityImage[];
  metadata: Record<Language, AnyMetadataField[]>;
  pdfMetadata?: PdfMetaByLang;
  relationships: RelationshipSource;
}

/** Canonical main entity. `e3` is already the source of the whole references[]
 *  corpus and the only id wired into the relationships pipeline, so it stays the
 *  focal default and its profile reuses every existing global unchanged. */
export { MAIN_ENTITY_ID } from "./sample/mainEntity";
import { MAIN_ENTITY_ID } from "./sample/mainEntity";

/** Types that carry a document (and therefore a Document tab + viewer). */
const DOC_TYPES = new Set(["court_case", "judgment", "document"]);
export function typeHasDocument(typeId: string): boolean {
  return DOC_TYPES.has(typeId);
}

/** Main entity = the existing Velásquez globals, assembled by reference. */
let mainMetadata: Record<Language, AnyMetadataField[]> | null = null;
const mainProfile: EntityProfile = {
  id: MAIN_ENTITY_ID,
  typeId: "court_case",
  hasDocument: true,
  document: documentsByLanguage,
  renditions: renditionsByLanguage,
  documentGroups,
  files,
  // Court Case's projection over the case record's values (step M5). Built
  // on first read: this module loads while `data/entities` is still loading.
  get metadata() {
    return (mainMetadata ??= LANGS.reduce((acc, lang) => {
      acc[lang] = sampleRecordFields(MAIN_ENTITY_ID, "court_case", lang);
      return acc;
    }, {} as Record<Language, AnyMetadataField[]>));
  },
  pdfMetadata: pdfMetadataByLanguage,
  relationships: { kind: "references" },
};

/* ── Lightweight profile synthesis ──────────────────────────────────────── */

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
  // The template's projection over the entity's values (step M5).
  const metadata = LANGS.reduce((acc, lang) => {
    acc[lang] = sampleRecordFields(entity.id, entity.typeId, lang);
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
    // Carried through so the record can draw a card per image — which is what a
    // filename link on the Library card scrolls to.
    image: entity.image,
    images: entity.images,
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
  // An entity whose record the session wrote (created, or edited): its
  // profile is that record over whatever the corpus had.
  const record = overlayRecord(id);
  if (record) return profileFromRecord(id, record);
  return baseProfile(id);
}

/** Record-built profiles, per record object — records are immutable, so a new
 *  write is a new key and a stale profile is never found again. */
const recordProfiles = new WeakMap<EntityRecord, EntityProfile>();
function profileFromRecord(id: string, record: EntityRecord): EntityProfile {
  const hit = recordProfiles.get(record);
  if (hit) return hit;
  // A created entity has no corpus profile underneath; an edited one does,
  // and keeps whatever the record doesn't replace (its document, relationships).
  const base = overlayCreated(id) ? undefined : baseProfile(id);
  const files = record.files ?? base?.files ?? [];
  const profile: EntityProfile = {
    ...(base ?? { relationships: { kind: "references" as const } }),
    id,
    typeId: record.typeId,
    hasDocument: files.length > 0 || !!base?.hasDocument,
    metadata: record.metadata as Record<Language, AnyMetadataField[]>,
    documentGroups: record.documentGroups ?? base?.documentGroups ?? [],
    files,
  };
  recordProfiles.set(record, profile);
  return profile;
}

/** Profiles are projections of their corpus's templates, so a template
 *  change (Settings › Templates writes the store from step M8) must rebuild
 *  them. The mirror returns the same array until the store changes; a new
 *  array for any corpus clears the cache. */
let seenTemplates: TemplateDef[][] = [];
function invalidateOnTemplateChange() {
  const now = (["mock", "cejil", "travesia", "artworks"] as const).map((c) => templatesMirror(c));
  if (now.some((list, i) => list !== seenTemplates[i])) {
    if (seenTemplates.length) lightweightCache.clear();
    seenTemplates = now;
  }
}

function baseProfile(id: string): EntityProfile {
  const authored = PROFILES[id];
  if (authored) return authored;
  invalidateOnTemplateChange();
  const cached = lightweightCache.get(id);
  if (cached) return cached;
  // A corpus with real records builds a real profile (metadata / files /
  // relationships); everything else gets the synthesized lightweight one, whose
  // `TYPE_FIELDS` table only knows the mock's types — which is why an adapter
  // corpus that doesn't answer here renders as an entity with no metadata at
  // all, however much the seed holds.
  const built = isCejilEntity(id)
    ? buildCejilProfile(id)
    : isArtworkEntity(id)
      ? buildArtworkProfile(id)
      : isTravesiaEntity(id)
        ? buildTravesiaProfile(id)
        : buildLightweightProfile(getEntity(id) ?? { ...FALLBACK_ENTITY, id });
  lightweightCache.set(id, built);
  return built;
}

/** All entity ids that currently have a profile (authored). Mostly for tooling. */
export function authoredProfileIds(): string[] {
  return Object.keys(PROFILES);
}
