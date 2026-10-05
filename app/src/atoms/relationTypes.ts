import { atom, getDefaultStore } from "jotai";
import { travesiaRelationTypes } from "../data/travesia/schema";
import { registerRelationLabelReader } from "../utils/inheritance";
import type { Corpus } from "../data/entityChanges";
import {
  NO_LABEL_RELATION_TYPE,
  registerRelationType,
  renameRelationType,
  restoreRelationType,
  unregisterRelationType,
} from "../data/references";
import { cejilRelationTypes } from "../data/cejil/relationTypes";
import { dataSourceAtom } from "./dataSource";
import { referencesAtom, relationTypesAtom, type RelationTypeDef } from "./references";
import { createSettingsCollection, hasId, newSettingsId } from "./settingsCollection";

/** Relationship types: ONE registry per collection, which Settings ›
 *  Relationship types, the Relationships panel (Create relationship, Manage
 *  types) and the template editor's relationship fields all read, by id.
 *
 *  The Sample's registry is `relationTypesAtom` and its static mirror in
 *  `data/references.ts` (pure utils resolve labels from it). Like the
 *  references it labels, it lives for the visit in memory. CEJIL's types come
 *  from its dump and its references are read-only, so its registry is a
 *  settings store: names can change, and a type no reference uses can go.
 *  Travesía's works the same way, over its own dump.
 *  `no_label` is the panel's fallback for an untyped reference, not a stored
 *  type: Settings never lists it (as in Uwazi). */

/** The imported collections' dump types, by corpus. */
const DUMP_TYPES: Partial<Record<Corpus, { _id: string; name: string }[]>> = {
  cejil: cejilRelationTypes,
  travesia: travesiaRelationTypes,
};

const importedStore = createSettingsCollection<RelationTypeDef>({
  name: "relationTypes",
  idPrefix: "rt",
  seedOf: (scope) => (DUMP_TYPES[scope as Corpus] ?? []).map((r) => ({ id: r._id, label: r.name })),
  corpusScoped: true,
  isRecord: (r) => hasId(r) && typeof (r as Partial<RelationTypeDef>).label === "string",
});

/** The collection whose types Settings shows: CEJIL's and Travesía's own;
 *  the Sample's on the Sample and Artworks (which has none). */
export const relationTypesCorpus = (source: string): Corpus =>
  source === "cejil" || source === "travesia" ? source : "mock";
const isImported = (c: Corpus) => c === "cejil" || c === "travesia";

/* CEJIL's and Travesía's references name their type by its dump name, not
   its id, so a rename in Settings reaches them through `relationLabel`: the
   dump name looks up the type's current label in the active collection. */
const dumpNameToId = Object.fromEntries(
  Object.entries(DUMP_TYPES).map(([c, list]) => [c, new Map(list!.map((t) => [t.name, t._id]))]),
) as Partial<Record<Corpus, Map<string, string>>>;
registerRelationLabelReader((type) => {
  const store = getDefaultStore();
  const corpus = relationTypesCorpus(store.get(dataSourceAtom));
  const id = dumpNameToId[corpus]?.get(type);
  if (!id) return undefined;
  return store.get(importedStore.listOfAtom(corpus)).find((t) => t.id === id)?.label;
});

/** The types Settings lists, for the collection it shows. */
export const settingsRelationTypesAtom = atom<RelationTypeDef[]>((get) =>
  {
    const corpus = relationTypesCorpus(get(dataSourceAtom));
    return isImported(corpus)
      ? get(importedStore.listOfAtom(corpus))
      : get(relationTypesAtom).filter((t) => t.id !== NO_LABEL_RELATION_TYPE);
  },
);

/** Uwazi's name rules, with its two defects not copied: the name is trimmed,
 *  and a duplicate is refused whatever its case (Uwazi's client compares
 *  case-sensitively and its server then fails with a 500). */
export function relationTypeNameIssue(list: RelationTypeDef[], id: string | null, name: string): string | null {
  const clean = name.trim();
  if (!clean) return "This field is required";
  const fold = clean.toLowerCase();
  if (list.some((t) => t.id !== id && t.label.trim().toLowerCase() === fold)) return "Already exists";
  return null;
}

/** Create (`id` null) or rename a type in the shown collection's registry.
 *  Returns its id, or null when the name is refused. The id never changes on
 *  rename, so references and template fields keep pointing at it. */
export const saveRelationTypeAtom = atom(null, (get, set, { id, name }: { id: string | null; name: string }): string | null => {
  const list = get(settingsRelationTypesAtom);
  if (relationTypeNameIssue(list, id, name)) return null;
  const label = name.trim();
  const corpus = relationTypesCorpus(get(dataSourceAtom));
  if (isImported(corpus)) {
    if (!id) return set(importedStore.createAtom, { value: { label }, corpus });
    set(importedStore.patchAtom, { id, patch: { label }, corpus });
    return id;
  }
  if (!id) {
    const def = { id: newSettingsId("rt"), label };
    set(relationTypesAtom, (prev) => {
      // New types go before the `no_label` fallback, which stays last.
      const at = prev.findIndex((t) => t.id === NO_LABEL_RELATION_TYPE);
      return at < 0 ? [...prev, def] : [...prev.slice(0, at), def, ...prev.slice(at)];
    });
    registerRelationType(def);
    return def.id;
  }
  set(relationTypesAtom, (prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  renameRelationType(id, label);
  return id;
});

/** What a delete removed, so Undo can put it back exactly. */
export interface RelationTypeDeletion {
  corpus: Corpus;
  def: RelationTypeDef;
  index: number;
  /** The references moved, and where to. */
  moved: { refIds: string[]; to: string } | null;
}

/** Delete a type from the shown collection's registry, first moving its
 *  references to `to` when given (an improvement over Uwazi, which refuses;
 *  Operator's decision). The caller has already checked usage. */
export const deleteRelationTypeAtom = atom(
  null,
  (get, set, { id, to }: { id: string; to: string | null }): RelationTypeDeletion | null => {
    const corpus = relationTypesCorpus(get(dataSourceAtom));
    if (isImported(corpus)) {
      const list = get(importedStore.listOfAtom(corpus));
      const index = list.findIndex((t) => t.id === id);
      if (index < 0) return null;
      set(importedStore.deleteAtom, { id, corpus });
      return { corpus, def: list[index], index, moved: null };
    }
    const all = get(relationTypesAtom);
    const index = all.findIndex((t) => t.id === id);
    if (index < 0) return null;
    let moved: RelationTypeDeletion["moved"] = null;
    if (to) {
      const refs = get(referencesAtom);
      const refIds = refs.filter((r) => r.relationType === id).map((r) => r.id);
      set(referencesAtom, refs.map((r) => (r.relationType === id ? { ...r, relationType: to } : r)));
      moved = { refIds, to };
    }
    set(relationTypesAtom, all.filter((t) => t.id !== id));
    unregisterRelationType(id);
    return { corpus, def: all[index], index, moved };
  },
);

/** Undo a delete: the type back at its place, and the moved references back
 *  on it — only those still on the type they were moved to, so a reference
 *  changed since keeps that change. */
export const restoreRelationTypeAtom = atom(null, (get, set, d: RelationTypeDeletion) => {
  if (isImported(d.corpus)) {
    // A store delete is an id in `deleted`; the seed record comes back by
    // dropping it, a created one by creating it again.
    set(importedStore.restoreAtom, { record: d.def, corpus: d.corpus });
    return;
  }
  set(relationTypesAtom, (prev) =>
    prev.some((t) => t.id === d.def.id) ? prev : [...prev.slice(0, d.index), d.def, ...prev.slice(d.index)],
  );
  restoreRelationType(d.def, d.index);
  if (d.moved) {
    const ids = new Set(d.moved.refIds);
    const to = d.moved.to;
    set(referencesAtom, (prev) =>
      prev.map((r) => (ids.has(r.id) && r.relationType === to ? { ...r, relationType: d.def.id } : r)),
    );
  }
});
