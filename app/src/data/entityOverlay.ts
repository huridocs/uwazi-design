import type { Language } from "../atoms/language";
import type { Entity } from "./entities";
import type { AnyMetadataField } from "./metadata";
import type { DocumentGroup, FileEntry } from "./files";

/** The entity OVERLAY — every change made to the library in this session,
 *  kept apart from the corpora it changes.
 *
 *  The corpora are static imports (the Sample seed, the CEJIL dump, the
 *  artworks), so nothing can write to them. Everything that changes an entity
 *  writes here instead, and every reader resolves through here first:
 *   - `created` — entities that did not exist (Create entity, Upload PDF);
 *   - `patched` — entity-level changes to an existing one (title, template,
 *     published), for bulk edit, template change and publishing;
 *   - `records` — the metadata values and files an entity's RECORD now holds,
 *     for created entities and edited ones alike;
 *   - `deleted` — ids that are gone from the library.
 *
 *  Per corpus, so switching collections neither shows one corpus's changes in
 *  another nor loses them.
 *
 *  IMMUTABLE. Every write produces a new value and never edits the old one, so
 *  undo is putting an earlier value back — one snapshot, no inverse operations
 *  to write per action.
 *
 *  The atom (`libraryEntityOverlayAtom`) is the source of truth for React. The
 *  plain resolvers — `getEntity`, `entityCorpusOf`, `getEntityProfile`, which
 *  utilities call with no store — read the MIRROR below, which the atom's one
 *  write path keeps in step. */

export type Corpus = "mock" | "cejil" | "artworks" | "travesia";

export interface EntityRecord {
  typeId: string;
  /** The whole metadata, relationship fields included: a record REPLACES the
   *  entity's profile metadata, so an edited entity's record carries its
   *  connections along with the values that changed. */
  metadata: Record<Language, AnyMetadataField[]>;
  documentGroups?: DocumentGroup[];
  files?: FileEntry[];
}

export interface CorpusOverlay {
  /** Newest first — the order "Date added" lists them in. */
  created: Entity[];
  patched: Record<string, Partial<Entity>>;
  records: Record<string, EntityRecord>;
  deleted: string[];
}

export type EntityOverlay = Record<Corpus, CorpusOverlay>;

const EMPTY_CORPUS: CorpusOverlay = { created: [], patched: {}, records: {}, deleted: [] };
export const EMPTY_OVERLAY: EntityOverlay = {
  mock: EMPTY_CORPUS,
  cejil: EMPTY_CORPUS,
  artworks: EMPTY_CORPUS,
  travesia: EMPTY_CORPUS,
};

export const isEmptyCorpusOverlay = (o: CorpusOverlay) =>
  o.created.length === 0 &&
  o.deleted.length === 0 &&
  Object.keys(o.patched).length === 0 &&
  Object.keys(o.records).length === 0;

/* ── The mirror ─────────────────────────────────────────────────────────── */

/** An entity being created, whose form is open: resolvable like any other while
 *  it is edited, in the library only once saved. Not part of the overlay value
 *  — an undo snapshot must not carry a half-made record. */
export interface DraftEntry {
  entity: Entity;
  record: EntityRecord;
  corpus: Corpus;
}

let mirror: EntityOverlay = EMPTY_OVERLAY;
let draft: DraftEntry | null = null;
/** id → where it lives, rebuilt on every write: the resolvers are called per
 *  entity per render, and a scan of three corpora each time is not free. */
let createdIndex = new Map<string, { entity: Entity; corpus: Corpus }>();
let patchIndex = new Map<string, Partial<Entity>>();
let recordIndex = new Map<string, EntityRecord>();
let deletedIndex = new Set<string>();

export function setOverlayMirror(next: EntityOverlay): void {
  mirror = next;
  createdIndex = new Map();
  patchIndex = new Map();
  recordIndex = new Map();
  deletedIndex = new Set();
  for (const corpus of Object.keys(next) as Corpus[]) {
    const o = next[corpus];
    for (const e of o.created) createdIndex.set(e.id, { entity: e, corpus });
    for (const [id, p] of Object.entries(o.patched)) patchIndex.set(id, p);
    for (const [id, r] of Object.entries(o.records)) recordIndex.set(id, r);
    for (const id of o.deleted) deletedIndex.add(id);
  }
}

export function setDraftMirror(next: DraftEntry | null): void {
  draft = next;
}

export const overlayMirror = (): EntityOverlay => mirror;

/** A created entity (or the open draft), with its patch applied. */
export function overlayCreated(id: string): { entity: Entity; corpus: Corpus } | undefined {
  if (draft?.entity.id === id) return { entity: draft.entity, corpus: draft.corpus };
  const hit = createdIndex.get(id);
  if (!hit) return undefined;
  const patch = patchIndex.get(id);
  return patch ? { entity: patchedEntity(hit.entity, patch), corpus: hit.corpus } : hit;
}

export const overlayPatch = (id: string): Partial<Entity> | undefined => patchIndex.get(id);

export function overlayRecord(id: string): EntityRecord | undefined {
  if (draft?.entity.id === id) return draft.record;
  return recordIndex.get(id);
}

export const isOverlayDeleted = (id: string): boolean => deletedIndex.has(id);

/** A seed entity with a patch over it — cached per (entity, patch) pair, both
 *  immutable, so a reader gets the SAME object until one of them changes. The
 *  library's per-entity caches (search folds, card fields) key on the entity
 *  object: a new object is exactly how they learn to recompute. */
const patchedCache = new WeakMap<Entity, WeakMap<Partial<Entity>, Entity>>();
export function patchedEntity(base: Entity, patch: Partial<Entity>): Entity {
  let byPatch = patchedCache.get(base);
  if (!byPatch) {
    byPatch = new WeakMap();
    patchedCache.set(base, byPatch);
  }
  let hit = byPatch.get(patch);
  if (!hit) {
    hit = { ...base, ...patch, id: base.id };
    byPatch.set(patch, hit);
  }
  return hit;
}

/** The library list for a corpus: its seed with the overlay applied — deleted
 *  entities out, patches in, created entities first. With nothing to apply the
 *  seed array itself comes back, since its identity keys caches too. */
export function applyOverlay(overlay: CorpusOverlay, base: Entity[]): Entity[] {
  if (isEmptyCorpusOverlay(overlay)) return base;
  const deleted = new Set(overlay.deleted);
  const patch = (e: Entity) => {
    const p = overlay.patched[e.id];
    return p ? patchedEntity(e, p) : e;
  };
  const created = overlay.created.filter((e) => !deleted.has(e.id)).map(patch);
  const seed = base.filter((e) => !deleted.has(e.id)).map(patch);
  return created.length ? [...created, ...seed] : seed;
}
