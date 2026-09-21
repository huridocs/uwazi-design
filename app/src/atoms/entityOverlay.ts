import { atom } from "jotai";
import { entityCorpusOf, getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { adapterPatch, changedFieldIds, mergeScalarsByLang } from "../utils/entityEdit";
import {
  overlayMirror,
  setDraftMirror,
  setOverlayMirror,
  overlayCreated,
  overlayRecord,
  type Corpus,
  type CorpusOverlay,
  type EntityOverlay,
  type EntityRecord,
} from "../data/entityOverlay";
import {
  adapterFieldsOf,
  buildRecord,
  templateFields,
  today,
  type AttachedFile,
  type EditResult,
} from "../utils/createEntity";
import type { Language } from "./language";

/** The session's changes to the library — see `data/entityOverlay.ts` for the
 *  shape and why it is kept apart from the corpora.
 *
 *  ONE write path: every setter below goes through `libraryEntityOverlayAtom`'s
 *  write, which updates the mirror the plain resolvers read (`getEntity`,
 *  `getEntityProfile`) in the same step as the atom, so React and the
 *  resolvers never disagree about what an entity is. Undo is a write of an
 *  earlier value: `set(libraryEntityOverlayAtom, snapshot)`. */
// Seeded from the mirror, not EMPTY: a hot reload of this module recreates the
// atom, and starting empty while the mirror kept the old value left getEntity
// resolving entities the list no longer had (dev only).
const overlayValueAtom = atom<EntityOverlay>(overlayMirror());

export const libraryEntityOverlayAtom = atom(
  (get) => get(overlayValueAtom),
  (get, set, next: EntityOverlay | ((prev: EntityOverlay) => EntityOverlay)) => {
    const value = typeof next === "function" ? next(get(overlayValueAtom)) : next;
    setOverlayMirror(value);
    set(overlayValueAtom, value);
  },
);

/* ── Undo ───────────────────────────────────────────────────────────────
   Undo is the INVERSE of the one operation it names, never a snapshot of the
   whole overlay: writing an old overlay back also erased every upload,
   created entity and saved edit that landed after it. A delete records the
   ids IT removed (not ones already deleted), and undoing it takes exactly
   those back out of `deleted` — whatever else has changed since stays.

   ONE level: the next undoable operation replaces this one, and the older
   notification's Undo goes disabled, saying why. */
export type UndoOp =
  | { ref: string; kind: "undelete"; corpus: Corpus; ids: string[] }
  | {
      ref: string;
      kind: "restore";
      corpus: Corpus;
      /** Per entity: what its record and patch were before the change, and
       *  the record the change wrote — undo restores an entity only while that
       *  record is still the one there, so a later edit is never clobbered. */
      entries: { id: string; record?: EntityRecord; patch?: Partial<Entity>; wrote: EntityRecord }[];
    };
export const undoOpAtom = atom<UndoOp | null>(null);

let undoSeq = 0;

/** Delete `ids` from the library AND record the inverse. Returns the ref its
 *  notification's Undo names. */
export const deleteWithUndoAtom = atom(
  null,
  (get, set, { corpus, ids }: { corpus: Corpus; ids: string[] }): string => {
    const already = new Set(get(overlayValueAtom)[corpus].deleted);
    const removed = ids.filter((id) => !already.has(id));
    undoSeq += 1;
    const ref = `undo-${Date.now().toString(36)}-${undoSeq}`;
    set(deleteEntitiesAtom, { corpus, ids });
    set(undoOpAtom, { ref, kind: "undelete", corpus, ids: removed });
    return ref;
  },
);

/** Undo the operation `ref` names — only while it is still the latest. */
export const undoAtom = atom(null, (get, set, ref: string): boolean => {
  const op = get(undoOpAtom);
  if (!op || op.ref !== ref) return false;
  if (op.kind === "undelete") {
    const back = new Set(op.ids);
    set(libraryEntityOverlayAtom, (prev) =>
      updateCorpus(prev, op.corpus, (o) => ({ ...o, deleted: o.deleted.filter((id) => !back.has(id)) })),
    );
  } else {
    set(libraryEntityOverlayAtom, (prev) =>
      updateCorpus(prev, op.corpus, (o) => {
        const records = { ...o.records };
        const patched = { ...o.patched };
        for (const e of op.entries) {
          if (records[e.id] !== e.wrote) continue;
          if (e.record) records[e.id] = e.record;
          else delete records[e.id];
          // A new object even when restoring the same patch: the cards are
          // memoised on the entity, and the record under it just changed back.
          patched[e.id] = { ...(e.patch ?? {}) };
        }
        return { ...o, records, patched };
      }),
    );
  }
  set(undoOpAtom, null);
  return true;
});

/** Change one corpus's overlay, leaving the others as they are. */
function updateCorpus(
  prev: EntityOverlay,
  corpus: Corpus,
  change: (o: CorpusOverlay) => CorpusOverlay,
): EntityOverlay {
  return { ...prev, [corpus]: change(prev[corpus]) };
}

/** Add entities that did not exist, with their records. */
export const createEntitiesAtom = atom(
  null,
  (_get, set, { corpus, entries }: { corpus: Corpus; entries: { entity: Entity; record: EntityRecord }[] }) => {
    set(libraryEntityOverlayAtom, (prev) =>
      updateCorpus(prev, corpus, (o) => ({
        ...o,
        created: [...entries.map((x) => x.entity), ...o.created],
        records: { ...o.records, ...Object.fromEntries(entries.map((x) => [x.entity.id, x.record])) },
      })),
    );
  },
);

/** Change existing entities: entity-level fields (`patches`) and/or their
 *  records (`records`). The one write bulk edit, template change and publish
 *  will all go through. A patch merges over any earlier patch. */
export const patchEntitiesAtom = atom(
  null,
  (
    _get,
    set,
    {
      corpus,
      patches = {},
      records = {},
    }: { corpus: Corpus; patches?: Record<string, Partial<Entity>>; records?: Record<string, EntityRecord> },
  ) => {
    set(libraryEntityOverlayAtom, (prev) =>
      updateCorpus(prev, corpus, (o) => ({
        ...o,
        patched: {
          ...o.patched,
          ...Object.fromEntries(Object.entries(patches).map(([id, p]) => [id, { ...o.patched[id], ...p }])),
        },
        records: { ...o.records, ...records },
      })),
    );
  },
);

/** Write a bulk edit's records and patches (see `planBulkEdit`) AND record the
 *  exact inverse. Returns the ref its notification's Undo names. */
export const applyBulkEditAtom = atom(
  null,
  (
    get,
    set,
    {
      corpus,
      records,
      patches,
    }: { corpus: Corpus; records: Record<string, EntityRecord>; patches: Record<string, Partial<Entity>> },
  ): string => {
    const before = get(overlayValueAtom)[corpus];
    const entries = Object.keys(records).map((id) => ({
      id,
      record: before.records[id],
      patch: before.patched[id],
      wrote: records[id],
    }));
    undoSeq += 1;
    const ref = `undo-${Date.now().toString(36)}-${undoSeq}`;
    // Every edited entity gets a patch, empty or not — see `saveEntityEditAtom`.
    const allPatches = Object.fromEntries(Object.keys(records).map((id) => [id, patches[id] ?? {}]));
    set(patchEntitiesAtom, { corpus, patches: allPatches, records });
    set(undoOpAtom, { ref, kind: "restore", corpus, entries });
    return ref;
  },
);

/** Save a single edit of an EXISTING entity: the form's scalar values become
 *  its record (over the corpus profile, connections kept), and an adapter
 *  corpus's card, search text and descriptor facet follow. Until this, Save on
 *  an existing entity only closed the form — the edit went nowhere. */
export const saveEntityEditAtom = atom(
  null,
  (_get, set, { id, result, language }: { id: string; result: EditResult; language: Language }) => {
    const entity = getEntity(id);
    if (!entity) return;
    const corpus = entityCorpusOf(id);
    const profile = getEntityProfile(id);
    const metadata = mergeScalarsByLang(profile.metadata, result.fieldsByLang);
    // An adapter card is built from ONE language's record — CEJIL's from the
    // Spanish one, the corpus's own — so it is patched from that slice.
    const cardLang: Language = corpus === "cejil" ? "ES" : language;
    const changed = changedFieldIds(profile.metadata[cardLang] ?? [], metadata[cardLang]);
    const patch: Partial<Entity> = corpus === "mock" ? {} : adapterPatch(entity, metadata[cardLang], changed);
    // The form opens its title on the DOCUMENT's title where there is one
    // (MetadataEditBody's `initialTitles`), so a title is a change only when it
    // differs from THAT — comparing with the entity's title renamed every
    // entity whose document is called something else.
    const opened = profile.document?.[language]?.title ?? entity.title;
    const title = result.titles[language]?.trim();
    if (title && title !== opened.trim()) patch.title = title;
    // Nothing moved: write nothing, so an untouched Save leaves no record
    // behind (a record is a new object, and every per-entity cache keys on it).
    const touched = (Object.keys(metadata) as Language[]).some(
      (l) => changedFieldIds(profile.metadata[l] ?? [], metadata[l]).size > 0,
    );
    if (!touched && !patch.title) return;
    set(patchEntitiesAtom, {
      corpus,
      // A patch even when empty: it is what gives the entity a NEW object, and
      // the cards are memoised on that identity — a Sample card, which reads
      // the record, otherwise kept printing the old value.
      patches: { [id]: patch },
      records: { [id]: { ...overlayRecord(id), typeId: profile.typeId, metadata } },
    });
  },
);

/** Remove entities from the library. They stay resolvable by id (an undo, a
 *  stale link), and leave every list. */
export const deleteEntitiesAtom = atom(null, (_get, set, { corpus, ids }: { corpus: Corpus; ids: string[] }) => {
  set(libraryEntityOverlayAtom, (prev) =>
    updateCorpus(prev, corpus, (o) => ({ ...o, deleted: [...new Set([...o.deleted, ...ids])] })),
  );
});

/* ── Create entity ──────────────────────────────────────────────────────── */

let seq = 0;
/** A new id, disjoint from every corpus's ids (none starts with `new-`). */
export function newEntityId(): string {
  seq += 1;
  return `new-${Date.now().toString(36)}-${seq}`;
}

/** The entity being created — resolvable while its form is open, in the
 *  library only once saved. The entity panel opens this id on its edit form. */
export const draftEntityIdAtom = atom<string | null>(null);

/** Begin creating an entity of `typeId` in `corpus`: an empty record of that
 *  template, held as the draft. Returns its id for the caller to open. */
export const startDraftAtom = atom(
  null,
  (_get, set, { typeId, corpus }: { typeId: string; corpus: Corpus }): string => {
    const id = newEntityId();
    const entity: Entity = { id, title: "", typeId, createdAt: today(), published: false };
    setDraftMirror({ entity, corpus, record: buildRecord({ id, typeId, fieldsByLang: templateFields(typeId, corpus) }) });
    set(draftEntityIdAtom, id);
    return id;
  },
);

/** Save the draft: the form's values become its record, and it joins its
 *  corpus's library. `language` is the language the form was saved in — the
 *  title and the card fields are read from it. */
export const commitDraftAtom = atom(
  null,
  (get, set, { id, result, language }: { id: string; result: EditResult; language: Language }) => {
    const hit = overlayCreated(id);
    const record = overlayRecord(id);
    if (!hit || !record || get(draftEntityIdAtom) !== id) return;
    const title =
      result.titles[language]?.trim() ||
      Object.values(result.titles).find((t) => t.trim())?.trim() ||
      "Untitled";
    const entity: Entity = { ...hit.entity, title };
    // Adapter corpora carry their card and search text on the entity; the
    // Sample corpus reads its record.
    if (hit.corpus !== "mock") {
      const fields = adapterFieldsOf(result.fieldsByLang[language] ?? []);
      entity.fields = fields;
      entity.searchFields = fields;
    }
    setDraftMirror(null);
    set(draftEntityIdAtom, null);
    set(createEntitiesAtom, {
      corpus: hit.corpus,
      entries: [{ entity, record: { ...record, metadata: result.fieldsByLang } }],
    });
  },
);

/** Cancel the draft: nothing of it survives. */
export const discardDraftAtom = atom(null, (get, set, id: string) => {
  if (get(draftEntityIdAtom) !== id) return;
  setDraftMirror(null);
  set(draftEntityIdAtom, null);
});

/* ── Upload PDF ─────────────────────────────────────────────────────────── */

/** Uploaded documents: records the moment their files are in, with no form in
 *  between — each an entity of `typeId` carrying its file as the primary
 *  document. Returns the new ids, in the order given. */
export const addUploadedDocumentsAtom = atom(
  null,
  (
    _get,
    set,
    { corpus, typeId, uploads }: { corpus: Corpus; typeId: string; uploads: { title: string; file: AttachedFile }[] },
  ): string[] => {
    const entries = uploads.map(({ title, file }) => {
      const id = newEntityId();
      const entity: Entity = { id, title, typeId, createdAt: today(), published: false, preview: "document" };
      return { entity, record: buildRecord({ id, typeId, fieldsByLang: templateFields(typeId, corpus), file }) };
    });
    // Newest first in the library, so the batch is reversed on the way in and
    // reads in the order it was picked.
    set(createEntitiesAtom, { corpus, entries: [...entries].reverse() });
    return entries.map((x) => x.entity.id);
  },
);
