import { atom } from "jotai";
import { entityCorpusOf, getEntity, type Entity } from "../data/entities";
import { seedUsers } from "../data/settings";
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
import type { MetadataField } from "../data/metadata";

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
      entries: {
        id: string;
        record?: EntityRecord;
        patch?: Partial<Entity>;
        /** The record and patch objects as STORED after the write. */
        wrote: EntityRecord;
        wrotePatch?: Partial<Entity>;
      }[];
    }
  | {
      ref: string;
      kind: "share";
      corpus: Corpus;
      /** Per entity: its patch and member list before, and what the change
       *  wrote — each restored only while it is still the one there. */
      entries: {
        id: string;
        patch?: Partial<Entity>;
        wrotePatch?: Partial<Entity>;
        members?: AccessMember[];
        wroteMembers?: AccessMember[];
      }[];
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

/** How many of the current undo's entities a LATER write has touched — a
 *  single-entity Save, Share or publish writes no undo of its own, so it does
 *  not replace this one, but undoing over it would silently revert it. While
 *  this is above 0 the Undo is refused, and its button says why. Identity is
 *  the test: every write stores new record / patch / member objects. */
export const undoConflictsAtom = atom((get) => {
  const op = get(undoOpAtom);
  if (!op || op.kind === "undelete") return 0;
  const o = get(overlayValueAtom)[op.corpus];
  if (op.kind === "restore")
    return op.entries.filter((e) => o.records[e.id] !== e.wrote || o.patched[e.id] !== e.wrotePatch).length;
  const access = get(entityAccessAtom);
  return op.entries.filter(
    (e) =>
      (e.wrotePatch && o.patched[e.id] !== e.wrotePatch) || (e.wroteMembers && access[e.id] !== e.wroteMembers),
  ).length;
});

/** Undo the operation `ref` names — only while it is still the latest, and
 *  only while nothing written since touches the same entities. */
export const undoAtom = atom(null, (get, set, ref: string): boolean => {
  const op = get(undoOpAtom);
  if (!op || op.ref !== ref) return false;
  if (get(undoConflictsAtom) > 0) return false;
  if (op.kind === "share") {
    const current = get(overlayValueAtom)[op.corpus].patched;
    const patchBack = op.entries.filter((e) => e.wrotePatch && current[e.id] === e.wrotePatch);
    if (patchBack.length)
      set(libraryEntityOverlayAtom, (prev) =>
        updateCorpus(prev, op.corpus, (o) => ({
          ...o,
          patched: { ...o.patched, ...Object.fromEntries(patchBack.map((e) => [e.id, { ...(e.patch ?? {}) }])) },
        })),
      );
    set(entityAccessAtom, (prev) => {
      const next = { ...prev };
      for (const e of op.entries) {
        if (!e.wroteMembers || next[e.id] !== e.wroteMembers) continue;
        if (e.members) next[e.id] = e.members;
        else delete next[e.id];
      }
      return next;
    });
  } else if (op.kind === "undelete") {
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

/* ── Access (Share / Permissions) ─────────────────────────────────────────
   Who can see or edit each entity, beside the rest of the session's changes.
   Visibility is not here: it IS the entity's `published`, patched through the
   overlay, so the Status facet, the Restricted lock and the counts follow. An
   entity with no entry has the seed's members (the one collaborator the
   Share modal has always opened with). */
export type AccessLevel = "read" | "write";
export interface AccessMember {
  id: string;
  label: string;
  level: AccessLevel;
}
export const DEFAULT_MEMBERS: AccessMember[] = seedUsers
  .slice(0, 1)
  .map((u) => ({ id: u.id, label: u.username, level: "read" as AccessLevel }));

export const entityAccessAtom = atom<Record<string, AccessMember[]>>({});

/** One member's change across a set: given a level (added where missing,
 *  set where present) or removed from every entity that has them. Members
 *  with no change are not written. */
export type MemberChange = { kind: "set"; label: string; level: AccessLevel } | { kind: "remove" };

/** Write a sharing change to `ids` and, with `undoable`, record its exact
 *  inverse. Returns the undo ref (or null). */
export const applyShareAtom = atom(
  null,
  (
    get,
    set,
    {
      corpus,
      ids,
      visibility,
      members: changes,
      undoable = true,
    }: {
      corpus: Corpus;
      ids: string[];
      visibility: "private" | "published" | null;
      members: Record<string, MemberChange>;
      undoable?: boolean;
    },
  ): string | null => {
    const access = get(entityAccessAtom);
    const before = get(overlayValueAtom)[corpus].patched;
    const patches: Record<string, Partial<Entity>> = {};
    const nextMembers: Record<string, AccessMember[]> = {};
    for (const id of ids) {
      const e = getEntity(id);
      if (!e) continue;
      if (visibility && !!e.published !== (visibility === "published"))
        patches[id] = { published: visibility === "published" };
      if (Object.keys(changes).length) {
        let list = [...(access[id] ?? DEFAULT_MEMBERS)];
        for (const [mid, c] of Object.entries(changes)) {
          if (c.kind === "remove") list = list.filter((m) => m.id !== mid);
          else if (list.some((m) => m.id === mid))
            list = list.map((m) => (m.id === mid ? { ...m, level: c.level } : m));
          else list.push({ id: mid, label: c.label, level: c.level });
        }
        nextMembers[id] = list;
      }
    }
    if (Object.keys(patches).length) set(patchEntitiesAtom, { corpus, patches });
    if (Object.keys(nextMembers).length) set(entityAccessAtom, (prev) => ({ ...prev, ...nextMembers }));
    if (!undoable) return null;
    const after = get(overlayValueAtom)[corpus].patched;
    const entries = ids
      .filter((id) => patches[id] || nextMembers[id])
      .map((id) => ({
        id,
        patch: before[id],
        wrotePatch: patches[id] ? after[id] : undefined,
        members: access[id],
        wroteMembers: nextMembers[id],
      }));
    undoSeq += 1;
    const ref = `undo-${Date.now().toString(36)}-${undoSeq}`;
    set(undoOpAtom, { ref, kind: "share", corpus, entries });
    return ref;
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
        // MERGED over the stored record: a writer replaces the keys it
        // gives and cannot drop the ones it doesn't. An uploaded entity's
        // PDF lives only on its record (`documentGroups`, `files`), and a
        // bulk write that rebuilt `{ typeId, metadata }` deleted it.
        records: {
          ...o.records,
          ...Object.fromEntries(Object.entries(records).map(([id, r]) => [id, { ...o.records[id], ...r }])),
        },
      })),
    );
  },
);

type RestoreEntry = Extract<UndoOp, { kind: "restore" }>["entries"][number];

/** Write one batch of a bulk change's records and patches, and return the
 *  inverse entries for them. No undo is recorded: a change applied in chunks
 *  collects every chunk's entries and records ONE undo at the end
 *  (`recordRestoreUndoAtom`). */
export const writeBulkChunkAtom = atom(
  null,
  (
    get,
    set,
    {
      corpus,
      records,
      patches,
    }: { corpus: Corpus; records: Record<string, EntityRecord>; patches: Record<string, Partial<Entity>> },
  ): RestoreEntry[] => {
    const before = get(overlayValueAtom)[corpus];
    // Every edited entity gets a patch, empty or not — see `saveEntityEditAtom`.
    const allPatches = Object.fromEntries(Object.keys(records).map((id) => [id, patches[id] ?? {}]));
    set(patchEntitiesAtom, { corpus, patches: allPatches, records });
    // What is stored now (merged, so not the objects passed in) — the
    // identities Undo checks.
    const after = get(overlayValueAtom)[corpus];
    return Object.keys(records).map((id) => ({
      id,
      record: before.records[id],
      patch: before.patched[id],
      wrote: after.records[id],
      wrotePatch: after.patched[id],
    }));
  },
);

/** Record the exact inverse of a change as THE undo. Returns its ref. */
export const recordRestoreUndoAtom = atom(
  null,
  (_get, set, { corpus, entries }: { corpus: Corpus; entries: RestoreEntry[] }): string => {
    undoSeq += 1;
    const ref = `undo-${Date.now().toString(36)}-${undoSeq}`;
    set(undoOpAtom, { ref, kind: "restore", corpus, entries });
    return ref;
  },
);

/** Write a bulk change at once AND record its exact inverse. Returns the ref
 *  its notification's Undo names. */
export const applyBulkEditAtom = atom(
  null,
  (
    _get,
    set,
    args: { corpus: Corpus; records: Record<string, EntityRecord>; patches: Record<string, Partial<Entity>> },
  ): string => set(recordRestoreUndoAtom, { corpus: args.corpus, entries: set(writeBulkChunkAtom, args) }),
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
    // The entity keeps ONE title (the prototype has no per-language titles
    // off the document), so the one to keep is the one the user changed: the
    // Save language's if it moved, else the first other language that did —
    // edited in the FR row while reading in EN was dropped without a word.
    const openedIn = (l: Language) => (profile.document?.[l]?.title ?? entity.title).trim();
    const changedIn = [language, ...(Object.keys(result.titles) as Language[]).filter((l) => l !== language)].find(
      (l) => result.titles[l]?.trim() && result.titles[l].trim() !== openedIn(l),
    );
    if (changedIn) patch.title = result.titles[changedIn].trim();
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
/** Bumped when the open draft is rewritten in place (its template changed),
 *  so the panel re-reads it: the draft lives in the mirror, not in an atom. */
export const draftVersionAtom = atom(0);

/** The open draft's template changed on its form: it becomes an entity of
 *  `typeId`, holding `fieldsByLang` — the new template's properties with the
 *  values the form carried over — and the title typed so far. Nothing is
 *  saved; the draft is still only a draft. */
export const retypeDraftAtom = atom(
  null,
  (
    get,
    set,
    { id, typeId, fieldsByLang, title }: { id: string; typeId: string; fieldsByLang: Record<Language, MetadataField[]>; title: string },
  ) => {
    const hit = overlayCreated(id);
    if (!hit || get(draftEntityIdAtom) !== id) return;
    setDraftMirror({
      entity: { ...hit.entity, typeId, title },
      corpus: hit.corpus,
      record: buildRecord({ id, typeId, fieldsByLang }),
    });
    set(draftVersionAtom, (v) => v + 1);
  },
);

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
