import { atom } from "jotai";
import {
  references as initialRefs,
  relationTypes as initialRelationTypes,
  Reference,
  RelationType,
} from "../data/references";
import { focusedEntityIdAtom } from "./focusedEntity";
import { MAIN_ENTITY_ID } from "../data/entityProfiles";
import { isCejilEntity, cejilReferencesFor } from "../data/cejil/profile";

export const referencesAtom = atom<Reference[]>(initialRefs);

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
 * (Relationships panel/tree/graph, ReferencePanel, the document highlights, the
 * Metadata drawer count) reads THIS so navigating into an entity shows its own
 * connections — not e3's whole corpus. The main entity (`MAIN_ENTITY_ID`) sees
 * the full corpus unchanged; other entities see their refs re-expressed from
 * their own perspective (see {@link fromPerspective}).
 *
 * Reads are filtered + perspective-normalized; **writes reconcile against the
 * full corpus by ref id** so deletes drop the right corpus rows and brand-new
 * refs are appended verbatim (never the normalized projection). Library-level
 * surfaces (LibraryView, EntityDrawerPreview, EntityOverlay, ManageRelationTypes)
 * deliberately keep reading `referencesAtom`.
 */
/** Pure per-entity slice — the same derivation `scopedReferencesAtom` applies
 *  to the focused entity, reusable for ANY id (e.g. Bert grounding replies on
 *  an entity attached to its context chain). */
export function referencesFor(id: string, all: Reference[]): Reference[] {
  if (id === MAIN_ENTITY_ID) return all;
  // CEJIL entities derive their connections from the real CEJIL relationships.
  if (isCejilEntity(id)) return cejilReferencesFor(id);
  return all.filter((r) => involvesEntity(r, id)).map((r) => fromPerspective(r, id));
}

export const scopedReferencesAtom = atom(
  (get): Reference[] => referencesFor(get(focusedEntityIdAtom), get(referencesAtom)),
  (get, set, update: Reference[] | ((prev: Reference[]) => Reference[])) => {
    const all = get(referencesAtom);
    const id = get(focusedEntityIdAtom);
    // CEJIL relationships are read-only in the prototype — never write them back
    // into the mock corpus.
    if (isCejilEntity(id)) return;
    if (id === MAIN_ENTITY_ID) {
      set(referencesAtom, typeof update === "function" ? update(all) : update);
      return;
    }
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
    set(referencesAtom, [...outOfScope, ...survivors, ...created]);
  },
);

/** Writable atom over the relation-type registry. Mirrors `entitiesAtom`'s
 *  pattern so the Manage Types modal can add / delete types at runtime.
 *  Seeded from data/references.ts but free to grow. */
export interface RelationTypeDef {
  id: RelationType;
  label: string;
}
export const relationTypesAtom = atom<RelationTypeDef[]>(initialRelationTypes);

/** Open-state for the Manage Relationship Types modal. */
export const manageRelationTypesOpenAtom = atom(false);

export const activeRefIdAtom = atom<string | null>(null);

/** ID of a reference that was just clicked in the panel — viewer should scroll to it */
export const scrollToHighlightAtom = atom<string | null>(null);

/** ID of a reference whose highlight was just clicked — panel should scroll to it */
export const scrollToRefAtom = atom<string | null>(null);

/** Active drawer tab — shared so highlight clicks can switch to "references" */
export const activeDrawerTabAtom = atom("metadata");

/** The entity-view drawer's Search-tab query. Lifted out of the tab body so the
 *  action bar's "Search tips" popover can drop an example straight into it. */
export const docSearchQueryAtom = atom("");

/** One-shot signal: expand the group containing this ref ID, then clear */
export const expandGroupForRefAtom = atom<string | null>(null);

/** Entity overlay — shows target entity preview when "View" is clicked on a ref */
export const overlayEntityIdAtom = atom<string | null>(null);

/** The specific aggregate-row id the user just clicked. Tracked separately
 *  from `overlayEntityIdAtom` because multiple aggregates can target the
 *  same entity (one per relation type) — without this, opening the overlay
 *  highlighted every sibling row pointing at that entity. Cleared when the
 *  overlay closes. */
export const activeAggregateIdAtom = atom<string | null>(null);

/** Toast messages */
export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}
export const toastsAtom = atom<Toast[]>([]);
