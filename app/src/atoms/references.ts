import { atom } from "jotai";
import {
  references as initialRefs,
  relationTypes as initialRelationTypes,
  Reference,
  RelationType,
  renameRelationType,
  restoreRelationType,
  unregisterRelationType,
} from "../data/references";
import { readSampleRegistry } from "../data/sampleRelationTypesStore";
import { focusedEntityIdAtom } from "./focusedEntity";
import { isCejilEntity, cejilReferencesFor } from "../data/cejil/profile";
import { isTravesiaEntity, travesiaReferencesFor } from "../data/travesia/profile";

/* ── The Sample registry as saved in this visit ──────────────────────────
   Settings' relationship-type changes are kept in sessionStorage
   (`data/sampleRelationTypesStore.ts`). At load the saved list replaces the
   seed list, in the atom and in the static mirror, and references a delete
   moved carry their new type. The seed is kept for Reset demo data. */
export const SEED_RELATION_TYPES: RelationTypeDef[] = initialRelationTypes.map((t) => ({ ...t }));
export const SEED_REFERENCE_TYPES = new Map(initialRefs.map((r) => [r.id, r.relationType]));
const savedRegistry = readSampleRegistry();
if (savedRegistry) {
  const keep = new Set(savedRegistry.types.map((t) => t.id));
  for (const t of [...initialRelationTypes]) if (!keep.has(t.id)) unregisterRelationType(t.id);
  savedRegistry.types.forEach((t, i) => {
    if (initialRelationTypes.some((x) => x.id === t.id)) renameRelationType(t.id, t.label);
    else restoreRelationType(t, i);
  });
}
const startRefs = savedRegistry && Object.keys(savedRegistry.moved).length
  ? initialRefs.map((r) => (savedRegistry.moved[r.id] ? { ...r, relationType: savedRegistry.moved[r.id] } : r))
  : initialRefs;

export const referencesAtom = atom<Reference[]>(startRefs);

/** True if a reference touches the given entity on either endpoint. */
const involvesEntity = (r: Reference, id: string) =>
  r.sourceEntityId === id || r.targetEntityId === id;

/**
 * Re-express a reference *from the focal entity's point of view*: the focal
 * entity becomes the source and the OTHER endpoint becomes the target, so the
 * derivation (which keys on `targetEntityId`) renders the connected entity
 * rather than the focal entity pointing at itself. The text anchor
 * (`sourceSelection`) is preserved as the evidence snippet; direction flips when
 * the focal entity was originally the target. The whole corpus is currently
 * sourced from e3, so for any other focal entity this flips e3↔focal.
 */
function fromPerspective(r: Reference, id: string): Reference {
  if (r.sourceEntityId === id) return r; // focal already the source — correct as-is
  const origDir = r.direction ?? "outgoing";
  return {
    ...r,
    sourceEntityId: id,
    targetEntityId: r.sourceEntityId,
    direction: origDir === "outgoing" ? "incoming" : "outgoing",
  };
}

/**
 * The focused entity's slice of the corpus. Every entity-scoped surface
 * (Relationships panel/tree/graph, EntityDrawer, the document highlights, the
 * Metadata drawer count) reads THIS so navigating into an entity shows its own
 * connections — not e3's whole corpus. Every entity, the main one
 * (`MAIN_ENTITY_ID`) included, sees its refs re-expressed from its own
 * perspective (see {@link fromPerspective}).
 *
 * Reads are filtered + perspective-normalized; **writes reconcile against the
 * full corpus by ref id** so deletes drop the right corpus rows and brand-new
 * refs are appended verbatim (never the normalized projection). Library-level
 * surfaces (LibraryView, EntityDrawerPreview, EntityPreviewSlideOver, ManageRelationTypes)
 * deliberately keep reading `referencesAtom`.
 */
/** Pure per-entity slice — the same derivation `scopedReferencesAtom` applies
 *  to the focused entity, reusable for ANY id (e.g. Bert grounding replies on
 *  an entity attached to its context chain). */
export function referencesFor(id: string, all: Reference[]): Reference[] {
  // CEJIL entities derive their connections from the real CEJIL relationships.
  if (isCejilEntity(id)) return cejilReferencesFor(id);
  if (isTravesiaEntity(id)) return travesiaReferencesFor(id);
  // The main entity goes through the same projection: the corpus is mostly
  // sourced from it, but the cross-entity rows (`ref-xs-*`) point AT it, and
  // returned unchanged they rendered it related to itself. A ref whose two
  // endpoints are this entity has no other side to show.
  return all
    .filter((r) => involvesEntity(r, id) && !(r.sourceEntityId === id && r.targetEntityId === id))
    .map((r) => fromPerspective(r, id));
}

/** Pure counterpart of `referencesFor` for WRITES: fold an update expressed in
 *  one entity's scope back into the full corpus. Shared with
 *  `useScopedReferences`, which applies it for an entity the app hasn't focused
 *  (the entity preview panel). Returns the corpus unchanged for read-only
 *  (CEJIL) scopes. */
export function writeReferencesFor(
  id: string,
  all: Reference[],
  update: Reference[] | ((prev: Reference[]) => Reference[]),
): Reference[] {
  // CEJIL relationships are read-only in the prototype — never write them back
  // into the mock corpus.
  if (isCejilEntity(id) || isTravesiaEntity(id)) return all;
  const origInScope = all.filter((r) => involvesEntity(r, id));
  const outOfScope = all.filter((r) => !involvesEntity(r, id));
  const prevScoped = origInScope.map((r) => fromPerspective(r, id));
  const nextScoped = typeof update === "function" ? update(prevScoped) : update;
  // Reconcile by id: surviving originals stay un-normalized; ids not already
  // in scope are brand-new refs (e.g. a freshly created relationship) kept
  // verbatim. This makes deletes precise and never writes the flipped view back.
  const nextIds = new Set(nextScoped.map((r) => r.id));
  const origIds = new Set(origInScope.map((r) => r.id));
  const survivors = origInScope.filter((r) => nextIds.has(r.id));
  const created = nextScoped.filter((r) => !origIds.has(r.id));
  return [...outOfScope, ...survivors, ...created];
}

export const scopedReferencesAtom = atom(
  (get): Reference[] => referencesFor(get(focusedEntityIdAtom), get(referencesAtom)),
  (get, set, update: Reference[] | ((prev: Reference[]) => Reference[])) => {
    set(referencesAtom, writeReferencesFor(get(focusedEntityIdAtom), get(referencesAtom), update));
  },
);

/** Writable atom over the relation-type registry. Mirrors `entitiesAtom`'s
 *  pattern so the Manage Types modal can add / delete types at runtime.
 *  Seeded from data/references.ts but free to grow. */
export interface RelationTypeDef {
  id: RelationType;
  label: string;
}
export const relationTypesAtom = atom<RelationTypeDef[]>(
  savedRegistry ? savedRegistry.types.map((t) => ({ ...t })) : initialRelationTypes.map((t) => ({ ...t })),
);

/** Open-state for the Manage Relationship Types modal. */
export const manageRelationTypesOpenAtom = atom(false);

export const activeRefIdAtom = atom<string | null>(null);

/** ID of a reference that was just clicked in the panel — viewer should scroll to it */
export const scrollToHighlightAtom = atom<string | null>(null);

/** ID of a reference whose highlight was just clicked — panel should scroll to it */
export const scrollToRefAtom = atom<string | null>(null);

/** One-shot signal: expand the group containing this ref ID, then clear */
export const expandGroupForRefAtom = atom<string | null>(null);

/** The specific aggregate-row id the user just clicked. Tracked separately
 *  from `previewEntityIdAtom` because multiple aggregates can target the
 *  same entity (one per relation type) — without this, opening the overlay
 *  highlighted every sibling row pointing at that entity. Cleared when the
 *  overlay closes. */
export const activeAggregateIdAtom = atom<string | null>(null);
