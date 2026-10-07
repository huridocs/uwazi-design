import { atom, getDefaultStore, type Getter } from "jotai";
import { atomFamily } from "jotai/utils";
import { writeSampleRegistry } from "../data/sampleRelationTypesStore";
import { relTypeFiltersAtom } from "./filters";
import { prepareStoreUndoAtom, registerStoreUndo } from "./settingsUndo";
import { appendActivityAtom } from "./activityLog";
import { toastsAtom } from "./notifications";
import { focusedEntityIdAtom } from "./focusedEntity";
import { entityCorpusOf } from "../data/entities";
import { travesiaRelationTypes } from "../data/travesia/schema";
import { nepalRelationTypes } from "../data/nepal/schema";
import { vegasRelationTypes } from "../data/vegas/schema";
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
import {
  referencesAtom,
  relationTypesAtom,
  SEED_REFERENCE_TYPES,
  SEED_RELATION_TYPES,
  type RelationTypeDef,
} from "./references";
import { createSettingsCollection, hasId, newSettingsId, registerSettingsReset } from "./settingsCollection";

/** Relationship types: ONE registry per collection, which Settings ›
 *  Relationship types, the Relationships panel (Create relationship, Manage
 *  types) and the template editor's relationship fields all read, by id.
 *
 *  The Sample's registry is `relationTypesAtom` and its static mirror in
 *  `data/references.ts` (pure utils resolve labels from it). Like the
 *  references it labels, it lives for the visit in memory. CEJIL's types come
 *  from its dump and its references are read-only, so its registry is a
 *  settings store: names can change, and a type no reference uses can go.
 *  Travesía's, Nepal's and Las Vegas's work the same way, over their own dumps.
 *  `no_label` is the panel's fallback for an untyped reference, not a stored
 *  type: Settings never lists it (as in Uwazi). */

/** The imported collections' dump types, by corpus. */
const DUMP_TYPES: Partial<Record<Corpus, { _id: string; name: string }[]>> = {
  cejil: cejilRelationTypes,
  travesia: travesiaRelationTypes,
  nepal: nepalRelationTypes,
  vegas: vegasRelationTypes,
};

const importedStore = createSettingsCollection<RelationTypeDef>({
  name: "relationTypes",
  idPrefix: "rt",
  seedOf: (scope) => (DUMP_TYPES[scope as Corpus] ?? []).map((r) => ({ id: r._id, label: r.name })),
  corpusScoped: true,
  isRecord: (r) => hasId(r) && typeof (r as Partial<RelationTypeDef>).label === "string",
});

/** The collection whose types Settings shows: CEJIL's, Travesía's, Nepal's
 *  and Las Vegas's own; the Sample's on the Sample and Artworks (which has none). */
export const relationTypesCorpus = (source: string): Corpus =>
  source === "cejil" || source === "travesia" || source === "nepal" || source === "vegas" ? source : "mock";
const isImported = (c: Corpus) => c === "cejil" || c === "travesia" || c === "nepal" || c === "vegas";

/* CEJIL's and Travesía's references name their type by its dump name, not
   its id, so a rename in Settings reaches them through `relationLabel`: the
   dump name looks up the type's current label in the active collection. */
const dumpNameToId = Object.fromEntries(
  Object.entries(DUMP_TYPES).map(([c, list]) => [c, new Map(list!.map((t) => [t.name, t._id]))]),
) as Partial<Record<Corpus, Map<string, string>>>;
registerRelationLabelReader((type) => {
  const store = getDefaultStore();
  // The open entity's collection first (an entity view can outlive a switch of
  // the Library's collection), then the Library's.
  const focused = store.get(focusedEntityIdAtom);
  const corpora = [
    ...(focused ? [relationTypesCorpus(entityCorpusOf(focused))] : []),
    relationTypesCorpus(store.get(dataSourceAtom)),
  ];
  for (const corpus of corpora) {
    const id = dumpNameToId[corpus]?.get(type);
    if (id) return store.get(importedStore.listOfAtom(corpus)).find((t) => t.id === id)?.label;
  }
  return undefined;
});

/** The types Settings lists, for the collection it shows. */
export const settingsRelationTypesAtom = atom<RelationTypeDef[]>((get) =>
  get(relationTypesOfAtom(relationTypesCorpus(get(dataSourceAtom)))),
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
export const saveRelationTypeAtom = atom(
  null,
  (get, set, { id, name, corpus: given }: { id: string | null; name: string; corpus?: Corpus }): string | null => {
  const corpus = given ?? relationTypesCorpus(get(dataSourceAtom));
  const list = get(relationTypesOfAtom(corpus));
  if (relationTypeNameIssue(list, id, name)) return null;
  const label = name.trim();
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
    persistSample(get);
    return def.id;
  }
  set(relationTypesAtom, (prev) => prev.map((t) => (t.id === id ? { ...t, label } : t)));
  renameRelationType(id, label);
  persistSample(get);
  return id;
  },
);

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
  (get, set, { id, to, corpus: given }: { id: string; to: string | null; corpus?: Corpus }): RelationTypeDeletion | null => {
    const corpus = given ?? relationTypesCorpus(get(dataSourceAtom));
    // A Relationships panel filter on the type would match nothing and could
    // not be cleared from its list: drop it (Undo does not bring it back).
    set(relTypeFiltersAtom, (prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
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
    persistSample(get);
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
  persistSample(get);
});

/* A relationship-type delete is saved the moment it happens, so its Undo
   belongs to the registry, not to the page that made it: it works from
   anywhere until a later removal replaces it. The restore is logged and
   announced, so the log does not end on "Deleted". */
export const RELATION_TYPE_UNDO_OWNER = "store:relationTypes";
registerStoreUndo(RELATION_TYPE_UNDO_OWNER, (get, set, payload) => {
  const deleted = payload as RelationTypeDeletion;
  // The name rule holds for a restore too: if a type of the same name was
  // created since, the restored one comes back renamed, never as a second
  // "Cites".
  const list = get(relationTypesOfAtom(deleted.corpus));
  let label = deleted.def.label;
  for (let n = 2; relationTypeNameIssue(list, deleted.def.id, label); n++) label = `${deleted.def.label} (${n})`;
  const d = label === deleted.def.label ? deleted : { ...deleted, def: { ...deleted.def, label } };
  set(restoreRelationTypeAtom, d);
  set(appendActivityAtom, {
    method: "CREATE",
    summary: `Restored relationship type “${d.def.label}”`,
    domain: "relationType",
    targetId: d.def.id,
    scope: d.corpus,
  });
  set(toastsAtom, (p) => [
    ...p,
    {
      id: `rt-${Date.now()}`,
      message: `${d.def.label} restored`,
      type: "success",
      ...(d !== deleted ? { detail: `Another type is named “${deleted.def.label}” now, so this one is restored as “${label}”.` } : {}),
    },
  ]);
});

/** The Beacon action for a relationship-type delete's Undo. */
export const prepareRelationTypeUndoAtom = atom(null, (_get, set, d: RelationTypeDeletion) =>
  set(prepareStoreUndoAtom, { owner: RELATION_TYPE_UNDO_OWNER, payload: d }),
);

/** A collection's registry, `no_label` left out. */
export const relationTypesOfAtom = atomFamily((corpus: Corpus) =>
  atom<RelationTypeDef[]>((get) =>
    isImported(corpus)
      ? get(importedStore.listOfAtom(corpus))
      : get(relationTypesAtom).filter((t) => t.id !== NO_LABEL_RELATION_TYPE),
  ),
);

/** Save the Sample registry (`data/sampleRelationTypesStore.ts`): its type
 *  list, and the seed references whose type differs from the seed's. */
function persistSample(get: Getter) {
  const moved: Record<string, string> = {};
  for (const r of get(referencesAtom)) {
    const seed = SEED_REFERENCE_TYPES.get(r.id);
    if (seed !== undefined && seed !== r.relationType) moved[r.id] = r.relationType;
  }
  writeSampleRegistry({ types: get(relationTypesAtom), moved, seedIds: SEED_RELATION_TYPES.map((t) => t.id) });
}

// Reset demo data: the Sample registry and the references it moved go back to
// the seed, in the atom and in the static mirror.
registerSettingsReset((set, get) => {
  const now = get(relationTypesAtom);
  for (const t of now) if (!SEED_RELATION_TYPES.some((s) => s.id === t.id)) unregisterRelationType(t.id);
  SEED_RELATION_TYPES.forEach((t, i) => {
    restoreRelationType(t, i);
    renameRelationType(t.id, t.label);
  });
  set(relationTypesAtom, SEED_RELATION_TYPES.map((t) => ({ ...t })));
  set(referencesAtom, (prev) =>
    prev.map((r) => {
      const seed = SEED_REFERENCE_TYPES.get(r.id);
      return seed !== undefined && seed !== r.relationType ? { ...r, relationType: seed } : r;
    }),
  );
  writeSampleRegistry(null);
});
