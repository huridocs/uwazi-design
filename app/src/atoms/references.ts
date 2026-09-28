import { atom } from "jotai";
import {
  references as initialRefs,
  relationTypes as initialRelationTypes,
  Reference,
  RelationType,
} from "../data/references";
import { focusedEntityIdAtom } from "./focusedEntity";
import { isCejilEntity, cejilReferencesFor } from "../data/cejil/profile";
import { isTravesiaEntity, travesiaReferencesFor } from "../data/travesia/profile";
import { libraryQueryAtom } from "./library";
import { filtersDrawerBase, overlayEntityBase, overlayStackBase } from "./rightPane";
import { breakpointAtom } from "./viewport";
import { scopedFiltersOpenAtom, scopedRelStateAtom } from "./filters";

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

/** The query whose hits get marked in the rendered document.
 *
 *  The drawer's Search tab wins when it has one; otherwise the Library query, so
 *  a jump from the Library Results panel also lands on marked text. (Consequence
 *  worth knowing: walking into an entity while a Library search is still active
 *  marks that term in the document too — which is usually why you're there.) */
export const docHighlightQueryAtom = atom((get) =>
  get(docSearchQueryAtom).trim() || get(libraryQueryAtom).trim(),
);

/** One-shot signal: expand the group containing this ref ID, then clear */
export const expandGroupForRefAtom = atom<string | null>(null);

/** Entity overlay — shows target entity preview when "View" is clicked on a ref */
export const previewEntityIdAtom = atom(
  (get) => get(overlayEntityBase),
  (get, set, id: string | null) => {
    // A phone stacks: an entity opened while a preview is open is a new sheet
    // on top, and closing pops one. Elsewhere the one overlay is replaced.
    const stack = get(overlayStackBase);
    const top = stack[stack.length - 1] ?? null;
    const stacks = get(breakpointAtom) === "mobile" && stack.length > 0;
    let next: string[];
    let removed: string | null = null;
    if (id === null) {
      removed = top;
      next = stacks ? stack.slice(0, -1) : [];
    } else if (stacks) {
      next = top === id ? stack : [...stack.filter((x) => x !== id), id];
    } else {
      removed = top;
      next = [id];
    }
    set(overlayStackBase, next);
    set(overlayEntityBase, next[next.length - 1] ?? null);
    // Opening the overlay closes the HOST's Filters: they dock into the same
    // region, and side by side neither one is usable. Closing it (id === null)
    // leaves Filters alone — a reader who dismisses a preview has not asked for
    // a filter panel. See atoms/rightPane.
    if (id !== null) set(filtersDrawerBase, false);
    // The overlay's OWN filters state goes with the overlay, always: a drawer
    // left open on the last previewed entity must not be waiting inside the
    // next one.
    set(scopedFiltersOpenAtom, {});
    // Same for its facets, search and view: the overlay opens on the defaults
    // every time, not on what the reader left in the last preview of it.
    // A layer popped back to keeps what its reader left in it.
    set(scopedRelStateAtom, (state) => {
      const kept = { ...state };
      if (removed) delete kept[removed];
      if (id) delete kept[id];
      return kept;
    });
  },
);

/** Close every connection overlay at once ("Open entity" leaves them all). */
export const closeAllOverlaysAtom = atom(null, (_get, set) => {
  set(overlayStackBase, []);
  set(overlayEntityBase, null);
  set(scopedFiltersOpenAtom, {});
});

/** The specific aggregate-row id the user just clicked. Tracked separately
 *  from `previewEntityIdAtom` because multiple aggregates can target the
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
