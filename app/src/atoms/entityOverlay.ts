import { atom } from "jotai";
import type { Entity } from "../data/entities";
import {
  EMPTY_OVERLAY,
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
const overlayValueAtom = atom<EntityOverlay>(EMPTY_OVERLAY);

export const libraryEntityOverlayAtom = atom(
  (get) => get(overlayValueAtom),
  (get, set, next: EntityOverlay | ((prev: EntityOverlay) => EntityOverlay)) => {
    const value = typeof next === "function" ? next(get(overlayValueAtom)) : next;
    setOverlayMirror(value);
    set(overlayValueAtom, value);
  },
);

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
