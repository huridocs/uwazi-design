import { startTransition } from "react";
import { atom, type Getter, type Setter } from "jotai";
import { bulkEditDirtyAtom, editSessionOpenAtom, guardNavigationAtom } from "./dirtyGuard";
import { atomFamily } from "jotai/utils";
import {
  cejilReadyAtom,
  dataSourceAtom,
  libraryEntitiesAtom,
  nepalReadyAtom,
  travesiaReadyAtom,
  type DataSource,
} from "./dataSource";
import { collectionSettings, type DefaultLibraryView } from "./settingsSingletons";
import { languageAtom } from "./language";
import { breakpointAtom } from "./viewport";
import { propertyColumns } from "../utils/entityFields";
import { LIBRARY_SORTS, type Choice } from "../data/libraryDisplay";
import { templatesAtom } from "./templates";
import { legacyMetaColumnId, listColumnOptions } from "../components/library/listColumns";
import { networkTypeOptionsAtom } from "./network";
import { NETWORK_EVIDENCE_TEMPLATES } from "../data/network/graph";
import { nepalClaimEvidence } from "../data/nepal/claimEvidence";
import { groupEffective, inheritedKey, type FilterGroup, type LibraryMatch, type MapBounds, type RangeBounds } from "../utils/libraryFilter";
import { registerSettingsReset } from "./settingsReset";
import { carriesContent } from "../utils/entityContent";
import type { Entity } from "../data/entities";
import type { SearchScope } from "../utils/librarySnippets";
import type { QueryMatchMode } from "../utils/queryTokens";
import {
  optionsFor,
  DEFAULT_THUMB_MODE,
  type ThumbMode,
  type DisplayContext,
  type DisplayValue,
  type DisplayValues,
  type LibraryViewMode,
} from "../data/libraryDisplay";

/** The committed library search: what every consumer filters, ranks, marks and
 *  counts by. Only the search input binds to the draft below. */
export const libraryQueryAtom = atom("");

/** The text in the search box, kept apart from the committed query. A non-empty
 *  draft commits immediately; an empty draft commits nothing, so clearing the box
 *  to retype does not wipe the result set mid-read. The committed query is
 *  dismissed only through `clearLibrarySearchAtom` (its chip, or Clear all). */
const searchDraftStateAtom = atom("");
export const librarySearchDraftAtom = atom(
  (get) => get(searchDraftStateAtom),
  (get, set, next: string) => {
    // The draft is urgent: typed characters must appear in the box without delay.
    set(searchDraftStateAtom, next);
    // The commit runs filter, rank, count and snippets over the whole corpus
    // (multi-second main-thread tasks when synchronous). As a transition React can
    // abandon it on the next keystroke; see `useDeferredValue` in `LibraryView`.
    // A search does not change the view: the view in front keeps its place and
    // marks the matches, and the drawer's Results tab lists them.
    if (next.trim())
      startTransition(() => {
        // The moment a search becomes active: on a phone, arm its Results
        // sheet, which opens on submit (`submitLibrarySearchAtom`).
        const becomingActive = !get(libraryQueryAtom).trim();
        set(libraryQueryAtom, next);
        if (becomingActive && get(breakpointAtom) === "mobile") set(resultsSheetArmedAtom, true);
      });
  },
);

/** Whether the collection's entities carry reference quotes as search fields
 *  (`quote:` keys, see `data/nepal/adapt.ts`): "Search in" offers Quotes only
 *  then. A stand-in for `fieldInScope(…, "quotes")` that folds nothing. */
export const libraryHasQuotesAtom = atom((get) =>
  get(libraryEntitiesAtom).some((e) => !!e.searchFields?.some((f) => !!f.key?.startsWith("quote:"))),
);

/** Whether the collection holds a claim that a source takes a stance on, so
 *  the Evidence view has something to show (Nepal only, today). Read over the
 *  whole collection, not the filtered set, so the View menu does not change
 *  as filters change; a filtered set with no claims gets the view's empty
 *  state instead. */
export const libraryHasClaimEvidenceAtom = atom((get) =>
  get(libraryEntitiesAtom).some((e) => e.typeId === "nepal_claim" && !!nepalClaimEvidence(e.id)),
);

/** Whether the collection's entities have loaded, so an empty list means
 *  empty. The lazily loaded corpora are not known before then. */
export const libraryCorpusReadyAtom = atom((get) => {
  switch (get(dataSourceAtom)) {
    case "cejil":
      return get(cejilReadyAtom);
    case "travesia":
      return get(travesiaReadyAtom);
    case "nepal":
      return get(nepalReadyAtom);
    default:
      return true;
  }
});

/* Adv. Search's two modifiers, "Search in" and "Match". They are part of the
   search, not filters: they apply in every view while a query runs, the
   masthead's search chip names them, and `clearLibrarySearchAtom` resets them.
   Each has a committed value (what the filter, snippets, ranking and marks
   read) and a shown value (what its control displays). The control's write
   sets the shown value at once and commits in a transition, as the search box
   does, because the commit re-runs the whole-corpus filter. Every other write
   (clear, snapshot, collection switch) sets both. */

const searchScopeShownAtom = atom<SearchScope>("all");
const searchScopeStateAtom = atom<SearchScope>("all");
/** Which text the query is tested against. Quotes reads as All in a
 *  collection with no quote fields (a snapshot made elsewhere, or one opened
 *  before its corpus loaded). */
export const librarySearchScopeAtom = atom(
  (get) => {
    const scope = get(searchScopeStateAtom);
    return scope === "quotes" && !get(libraryHasQuotesAtom) ? "all" : scope;
  },
  (_get, set, next: SearchScope) => {
    set(searchScopeShownAtom, next);
    set(searchScopeStateAtom, next);
  },
);
/** Back to All when the collection cannot offer Quotes. A corpus that has not
 *  loaded yet cannot say, so it is treated as having none. */
const dropUnofferedScopeAtom = atom(null, (get, set) => {
  if (get(searchScopeStateAtom) === "quotes" && !get(libraryHasQuotesAtom)) set(librarySearchScopeAtom, "all");
});
/** The Search in control: shown at once, committed in a transition. */
export const librarySearchScopeInputAtom = atom(
  (get) => {
    const scope = get(searchScopeShownAtom);
    return scope === "quotes" && !get(libraryHasQuotesAtom) ? "all" : scope;
  },
  (_get, set, next: SearchScope) => {
    set(searchScopeShownAtom, next);
    startTransition(() => set(searchScopeStateAtom, next));
  },
);

const searchMatchShownAtom = atom<QueryMatchMode>("partial");
const searchMatchStateAtom = atom<QueryMatchMode>("partial");
/** Partial (the default rule in `queryTokens.ts`) or whole words. Passed as an
 *  argument to the matcher by the Library's own calls only; nothing outside
 *  the Library reads it. */
export const librarySearchMatchAtom = atom(
  (get) => get(searchMatchStateAtom),
  (_get, set, next: QueryMatchMode) => {
    set(searchMatchShownAtom, next);
    set(searchMatchStateAtom, next);
  },
);
/** The Match control: shown at once, committed in a transition. */
export const librarySearchMatchInputAtom = atom(
  (get) => get(searchMatchShownAtom),
  (_get, set, next: QueryMatchMode) => {
    set(searchMatchShownAtom, next);
    startTransition(() => set(searchMatchStateAtom, next));
  },
);

/** Ends the search: empties the box and the committed query. The view stays.
 *  The only route back to no search; the box's own X clears just the text. */
export const clearLibrarySearchAtom = atom(null, (_get, set) => {
  set(searchDraftStateAtom, "");
  set(libraryQueryAtom, "");
  set(libraryResultsSheetOpenAtom, false);
  set(resultsSheetArmedAtom, false);
  // A sort picked during the search applies to that search only (see `librarySortAtom`).
  set(searchSortOverrideAtom, null);
  set(searchSortDirOverrideAtom, null);
  // So are the Adv. Search modifiers.
  set(librarySearchScopeAtom, "all");
  set(librarySearchMatchAtom, "partial");
});

/** The running search, or `null`. Kept out of `libraryActiveFilterCountAtom`:
 *  the search is not set in the Filters panel, so counting it would put a count
 *  and dot on the Filters tab over a panel with nothing ticked. */
export const libraryActiveSearchAtom = atom(
  (get) => get(libraryQueryAtom).trim() || null,
);

/* Recent searches live in `atoms/savedViews.ts` with the saved views: an
   entry keeps the filter state it ran with (`LibrarySnapshot`). */

/** Selected entity-type facets (typeId → on). Empty = all types. */
export const libraryTypeFiltersAtom = atom<Record<string, boolean>>({});

/** "Has document" facet toggle. The Content card's "Contains: Document" took
 *  its place in the sidebar; kept for the filter state's `hasDocOnly`. */
export const libraryHasDocAtom = atom(false);

/** The Content card's selection: group → row id → ticked (see
 *  `utils/entityContent.ts`). */
export const libraryContentFiltersAtom = atom<Record<string, Record<string, boolean>>>({});
/** "All of these" on the card's first group (Contains): AND instead of OR. */
export const libraryContentModeAtom = atom<"AND" | "OR">("OR");

/** Publishing-status facet: keys "published" / "restricted". */
export const libraryStatusFiltersAtom = atom<Record<string, boolean>>({});

/** Mobile filters drawer open state (the sidebar is persistent on desktop). */
export const libraryFiltersOpenAtom = atom(false);

/** Entity previewed in the right drawer. null → the drawer shows Filters. */
export const libraryOpenEntityIdAtom = atom<string | null>(null);

/** Full width layout: the rail panel open over the pane, or null. One at a
 *  time; the ids are the rail's items (`LibraryRail`). */
export type LibraryRailPanel = "filters" | "results" | "notebook" | "views";
export const libraryRailPanelAtom = atom<LibraryRailPanel | null>(null);

/** The Results-tab full-text page the user last jumped to. Kept here, not in the
 *  drawer subtree (which unmounts while a preview shows), so its spine node stays
 *  active and `aria-pressed` after the preview closes. */
export interface ResultsActivePage {
  entityId: string;
  page: number;
}
export const resultsCurrentPageAtom = atom<ResultsActivePage | null>(null);

/** Which kinds of match the results keep (the title / properties / document
 *  chips). A real filter, not a panel toggle: it narrows the main pane too, so
 *  both panes show one result set and the count covers the filtered set.
 *  Query-relative: no-op without a query, reset when the query changes, so it
 *  never lingers as an invisible filter. */
export interface MatchTypeFilters {
  title: boolean;
  properties: boolean;
  document: boolean;
}
export const ALL_MATCH_TYPES: MatchTypeFilters = {
  title: true,
  properties: true,
  document: true,
};
export const matchTypeFiltersAtom = atom<MatchTypeFilters>(ALL_MATCH_TYPES);

/** A Results-tab "Properties" hit the user clicked: open the preview on its
 *  Metadata tab and flash the field. Matched by field key (stable across
 *  languages) against `MetadataField.id`; the metadata body clears it after flashing. */
export interface FocusMetadataField {
  entityId: string;
  fieldKey: string;
  /** Bumped on every request so clicking the same property twice is a new value
   *  to consumers that compare. Same idiom as `scrollToPageAtom` / `fillRequestAtom`. */
  nonce: number;
}
export const focusMetadataFieldAtom = atom<FocusMetadataField | null>(null);

/** Ask the record to scroll to a field and flash it. Use this rather than
 *  writing `focusMetadataFieldAtom` directly: it stamps the nonce. */
let focusNonce = 0;
export const requestMetadataFocusAtom = atom(
  null,
  (_get, set, req: { entityId: string; fieldKey: string }) => {
    set(focusMetadataFieldAtom, { ...req, nonce: ++focusNonce });
  },
);

/** A map cluster opened in the drawer — the entities located at one place. */
export interface LibraryCluster {
  label: string;
  ids: string[];
}
export const librarySelectedClusterAtom = atom<LibraryCluster | null>(null);

/* ── Multi-selection ──────────────────────────────────────────────────────
   Entity ids picked for a bulk action, separate from
   `libraryOpenEntityIdAtom` (the one entity the drawer previews). A plain
   click previews; a checkbox, Cmd/Ctrl-click or Shift-click selects.
   Always explicit ids ("select all" writes every id). Survives view, sort,
   filter and search changes; a collection switch and Clear end it.
   Performance: cards read `entitySelectedAtom(id)`, never the Set, so ticking
   one card re-renders only that card; grids paint the selected state in CSS. */
export const librarySelectionAtom = atom<ReadonlySet<string>>(new Set<string>());
/** Where the next Shift range starts: the last item clicked on its own —
 *  a plain click (a preview), a Cmd/Ctrl click, Space, or a long press. */
export const librarySelectionAnchorAtom = atom<string | null>(null);

/** A plain click on an item previews it and makes it the anchor, so the next
 *  Shift-click ranges from it rather than from a stale preview. */
export const setSelectionAnchorAtom = atom(null, (_get, set, id: string) => {
  set(librarySelectionAnchorAtom, id);
  set(lastRangeAtom, []);
});
/** The ids the last Shift range added. A second Shift-click re-spans from the
 *  same anchor: these come out and the new range goes in; ids picked one by one stay. */
const lastRangeAtom = atom<readonly string[]>([]);
export const librarySelectionCountAtom = atom((get) => get(librarySelectionAtom).size);
/** Phones: selection mode entered from the Actions sheet's "Select" with nothing
 *  picked yet, since touch has no modifier keys and the checkbox is visually
 *  hidden. The selection bar shows and a tap toggles. `clearSelectionAtom` ends it. */
export const librarySelectModeAtom = atom(false);
/** Anything selected. Flips only at 0↔1, so it is cheap for every card to read
 *  (cards show their checkboxes at rest while a selection exists). */
export const librarySelectionActiveAtom = atom(
  (get) => get(librarySelectionAtom).size > 0 || get(librarySelectModeAtom),
);
export const entitySelectedAtom = atomFamily((id: string) =>
  atom((get) => get(librarySelectionAtom).has(id)),
);
/** The selection drawer lists the selection; its X closes the list without
 *  clearing it, and any new tick opens it again. */
export const librarySelectionDrawerOpenAtom = atom(true);

/** The selection drawer shows the bulk edit form instead of the list. Set by
 *  the footer's and the phone sheet's Edit with 2 or more selected; Cancel,
 *  Apply and clearing the selection end it. */
export const libraryBulkEditOpenAtom = atom(false);

/** The ids the bulk form edits, frozen when it opens so Apply writes the set
 *  the form and its review step name. A clean form follows the selection; a
 *  dirty one routes selection changes through the guard (`selectionWrite`). */
export const libraryBulkEditIdsAtom = atom<string[]>([]);

/** Open the bulk form over the current selection. */
export const openBulkEditAtom = atom(null, (get, set) => {
  set(libraryBulkEditIdsAtom, [...get(librarySelectionAtom)]);
  set(libraryBulkEditOpenAtom, true);
  set(libraryOpenEntityIdAtom, null);
  set(librarySelectionDrawerOpenAtom, true);
});

/** Every selection write goes through here. With a dirty bulk form it is
 *  held by the discard-confirm; Discard closes the form and then applies the
 *  change. With a clean one, the form's set follows the new selection. */
function selectionWrite(get: Getter, set: Setter, run: () => void) {
  if (get(bulkEditDirtyAtom)) {
    set(guardNavigationAtom, () => {
      set(libraryBulkEditOpenAtom, false);
      run();
    });
    return;
  }
  run();
  if (get(libraryBulkEditOpenAtom)) set(libraryBulkEditIdsAtom, [...get(librarySelectionAtom)]);
}

/** Which selection dialog is open. The footer bar, the phone sheet and the
 *  drawer's Actions menu open the same dialogs, hosted once by `SelectionDialogs`. */
export type SelectionDialog = "delete" | "change-template" | "share" | "permissions";
export const librarySelectionDialogAtom = atom<SelectionDialog | null>(null);

/** An entity whose preview should open on its edit form (Edit with exactly one
 *  entity selected). Cleared by the entity panel once the form is open. */
export const libraryEditRequestAtom = atom<string | null>(null);

/** The ids the visible view draws (grid page, timeline rows, Results page, map
 *  entities). "Select all loaded" means these; each view writes its own. */
export const libraryDrawnIdsAtom = atom<readonly string[]>([]);

/** Show the selection list in the drawer by dropping the preview, unless the
 *  preview holds an open form: ticking a box must not unmount it and lose input. */
function showSelectionList(get: Getter, set: Setter) {
  if (!get(editSessionOpenAtom)) set(libraryOpenEntityIdAtom, null);
  set(librarySelectionDrawerOpenAtom, true);
}

/** Toggle one id. Sets the anchor, ends any range, and drops the preview so the
 *  drawer shows the selection. */
export const toggleSelectionAtom = atom(null, (get, set, id: string) =>
  selectionWrite(get, set, () => {
    const next = new Set(get(librarySelectionAtom));
    // As in Finder, the gesture that starts a selection includes the card already
    // open in the preview (the anchor from its plain click).
    const previewed = get(libraryOpenEntityIdAtom);
    if (next.size === 0 && previewed && previewed === get(librarySelectionAnchorAtom) && previewed !== id)
      next.add(previewed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    set(librarySelectionAtom, next);
    set(librarySelectionAnchorAtom, id);
    set(lastRangeAtom, []);
    showSelectionList(get, set);
  }),
);

/** Shift-click: select from the anchor to `id` in `order` (the current view's
 *  draw order). With no anchor, or one this view doesn't draw, it selects and
 *  anchors just `id`. */
export const rangeSelectionAtom = atom(null, (get, set, { order, id }: { order: readonly string[]; id: string }) =>
  selectionWrite(get, set, () => rangeSelect(get, set, order, id)),
);
function rangeSelect(get: Getter, set: Setter, order: readonly string[], id: string) {
  const anchor = get(librarySelectionAnchorAtom);
  const a = anchor ? order.indexOf(anchor) : -1;
  const b = order.indexOf(id);
  if (a < 0 || b < 0) {
    // Select it (not toggle: a Shift+click never deselects) and anchor it.
    const next = new Set(get(librarySelectionAtom));
    next.add(id);
    set(librarySelectionAtom, next);
    set(librarySelectionAnchorAtom, id);
    set(lastRangeAtom, []);
    showSelectionList(get, set);
    return;
  }
  const range = order.slice(Math.min(a, b), Math.max(a, b) + 1);
  const next = new Set(get(librarySelectionAtom));
  for (const x of get(lastRangeAtom)) next.delete(x);
  // Track only what this range adds: an id already ticked on its own must
  // survive the next re-span.
  const added = range.filter((x) => !next.has(x));
  for (const x of added) next.add(x);
  // The anchor itself was picked on its own; re-spanning must not drop it.
  if (anchor) next.add(anchor);
  set(librarySelectionAtom, next);
  set(lastRangeAtom, added.filter((x) => x !== anchor));
  showSelectionList(get, set);
}

/** Add ids (select all loaded, select all results, a map cluster). */
export const selectIdsAtom = atom(null, (get, set, ids: readonly string[]) =>
  selectionWrite(get, set, () => {
    const next = new Set(get(librarySelectionAtom));
    for (const id of ids) next.add(id);
    set(librarySelectionAtom, next);
    set(lastRangeAtom, []);
    showSelectionList(get, set);
  }),
);

/** Remove ids (a row unticked in the selection drawer, deleted entities). */
export const deselectIdsAtom = atom(null, (get, set, ids: readonly string[]) =>
  selectionWrite(get, set, () => {
    const next = new Set(get(librarySelectionAtom));
    for (const id of ids) next.delete(id);
    set(librarySelectionAtom, next);
    set(lastRangeAtom, (prev) => prev.filter((x) => !ids.includes(x)));
  }),
);

/** The one action that ends a selection (Escape routes here too). */
export const clearSelectionAtom = atom(null, (get, set) =>
  selectionWrite(get, set, () => {
    set(librarySelectionAtom, new Set<string>());
    set(librarySelectionAnchorAtom, null);
    set(lastRangeAtom, []);
    set(libraryBulkEditOpenAtom, false);
    set(librarySelectModeAtom, false);
  }),
);

/** A plain click while 2 or more are selected collapses the selection, as in a
 *  file manager, and `then` previews the item. Goes through the dirty-form guard,
 *  so a held Discard holds the preview too. */
export const collapseSelectionAtom = atom(null, (get, set, then: () => void) => {
  // Read at click time so the calling view never subscribes to the selection.
  if (get(librarySelectionAtom).size < 2) return then();
  selectionWrite(get, set, () => {
    set(librarySelectionAtom, new Set<string>());
    set(lastRangeAtom, []);
    set(libraryBulkEditOpenAtom, false);
    then();
  });
});

/** Keyword-style Countries facet: selected country names. */
export const libraryCountryFiltersAtom = atom<Record<string, boolean>>({});

/** Descriptores (violations) facet, CEJIL only. */
export const libraryDescriptorFiltersAtom = atom<Record<string, boolean>>({});

/** Each facet's Match mode (any / all / none / missing), keyed "country",
 *  "descriptor" or `inheritedKey(propId)`. Absent = any. */
export type { LibraryMatch };
export const libraryFacetMatchAtom = atom<Record<string, LibraryMatch>>({});

/** OR and NOT groups over the facets (`FilterGroup`), in the order added. */
export const libraryFilterGroupsAtom = atom<FilterGroup[]>([]);

/** Range facets' bounds as typed, by property name: numbers, or "yyyy-mm-dd"
 *  days for date properties. "" = open on that side. */
export const libraryRangeFiltersAtom = atom<Record<string, RangeBounds>>({});

/** Date-range filter on the entity's representative date (e.g. CEJIL `Fecha`).
 *  ISO `yyyy-mm-dd`; "" = open-ended on that side. */
export const libraryDateFromAtom = atom<string>("");
export const libraryDateToAtom = atom<string>("");

/** The map's visible area as a filter: set when the reader pans or zooms the
 *  Map view (never by the map's own fit), dropped when they leave it. Read
 *  as null in any other view, so no view without a map can be narrowed by
 *  one. */
const mapBoundsStateAtom = atom<MapBounds | null>(null);
export type { MapBounds };
export const libraryMapBoundsAtom = atom(
  (get) => (get(viewModeStateAtom) === "map" ? get(mapBoundsStateAtom) : null),
  (_get, set, next: MapBounds | null) => set(mapBoundsStateAtom, next),
);
registerSettingsReset((set) => set(mapBoundsStateAtom, null));

/** Facets generated from inherited relationship properties, keyed
 *  `inheritProperty → (value → on)`, as in Uwazi. */
export const libraryInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Relationship-chain facet selections (chains the templates declare), keyed `${chainId}:${seg}`
 *  → (value → on). Keys of one chain are path-coupled: a single traversed path
 *  must satisfy them all. See utils/chainTraversal.ts. */
export const libraryChainFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** The `results` mode reads the same `buildSnippetsFor` output as the Results
 *  tab, at full width. It stays selectable with no query so the switcher never
 *  gains or loses a segment while typing (layout shift).
 *  The mode list lives in `data/libraryDisplay` because it keys the option
 *  registry; declare new modes there. */
export type { LibraryViewMode };

/** The view the reader picked, or null: until they pick one, the Library
 *  opens on the collection's default view (Settings › Collection). */
const viewModeChosenAtom = atom<LibraryViewMode | null>(null);
const DEFAULT_VIEW_MODE: Record<DefaultLibraryView, LibraryViewMode> = {
  cards: "cards",
  table: "list",
  map: "map",
  network: "network",
};
/** Evidence reads as the default view in a collection with no claim evidence
 *  (a saved view or link made in Nepal, or one opened before Nepal loaded). */
const viewModeStateAtom = atom(
  (get): LibraryViewMode => {
    const fallback = DEFAULT_VIEW_MODE[get(collectionSettings.valueAtom).defaultView] ?? "cards";
    const chosen = get(viewModeChosenAtom);
    if (chosen === "evidence" && !get(libraryHasClaimEvidenceAtom)) return fallback;
    return chosen ?? fallback;
  },
  (_get, set, next: LibraryViewMode) => set(viewModeChosenAtom, next),
);
/** Forget the reader's pick, so the Library opens on the saved default view
 *  again (Settings › Collection writes this when it saves a new default). */
export const resetLibraryViewChoiceAtom = atom(null, (_get, set) => {
  set(viewModeChosenAtom, null);
  set(mapBoundsStateAtom, null);
});

/** Phones: the Results sheet a search opened. Opened once per query, so refining
 *  never reopens a sheet the user closed; closing it keeps the query;
 *  `clearLibrarySearchAtom` closes it. */
export const libraryResultsSheetOpenAtom = atom(false);

/** A query became active on a phone and its Results sheet has not opened yet. */
const resultsSheetArmedAtom = atom(false);

/** The search box was submitted (Enter, the keyboard's Search key, blur, or a
 *  recent search): on a phone, open the armed Results sheet once. Not on the
 *  first character: the sheet is modal and takes focus, which would swallow typing. */
export const submitLibrarySearchAtom = atom(null, (get, set) => {
  if (!get(resultsSheetArmedAtom) || !get(libraryQueryAtom).trim()) return;
  set(resultsSheetArmedAtom, false);
  set(libraryResultsSheetOpenAtom, true);
});

/** The library's view mode. A search does not write it (see
 *  `librarySearchDraftAtom`); Adv. Search is a view the reader picks. */
export const libraryViewModeAtom = atom(
  (get) => get(viewModeStateAtom),
  (_get, set, next: LibraryViewMode) => {
    // The map area is a filter only while its map is in front.
    if (next !== "map") set(mapBoundsStateAtom, null);
    set(viewModeStateAtom, next);
  },
);

/** Results body layout, four readings of the same snippets:
 *  - `grouped`   one wide card per entity: its matched properties beside its
 *                document passages (the drawer's card, given room)
 *  - `tree`      entity → matched field → its snippets, collapsible at both levels
 *  - `passages`  every matching passage as one flat ranked list, entity secondary
 *  - `spine`     passages on a proportional time axis, each entity carrying its
 *                strongest one */
export type ResultsLayout = "grouped" | "tree" | "passages" | "spine";

/** Timeline body layout, four views of the same chronology:
 *  - `rail`     vertical time track with dots and clusters; clicking picks an
 *               entity, it does not filter.
 *  - `density`  the same track as a volume histogram; clicking a bar filters the
 *               Library to that period.
 *  - `spine`    a proportional chronology, every entity at its exact instant
 *  - `lanes`    a template × period grid */
export type TimelineLayout = "rail" | "density" | "spine" | "lanes";

/** How many metadata properties a card draws while the Metadata switch is on;
 *  the user chooses, the app does not cap it. */
export type CardFields = "3" | "5" | "all";
export const DEFAULT_CARD_FIELDS: CardFields = "all";

/** The choice as a number of lines, or null for "every one this entity has". */
export function cardFieldLimit(v: CardFields): number | null {
  return v === "all" ? null : Number(v);
}

/** Thumbnail slot size. `m` (the default) is the smallest height at which a
 *  document page is still legible as a page. */
export type ThumbSize = "s" | "m" | "l";

/** The slot's shape, one choice for the whole grid: per-card shapes would stop
 *  rows lining up. `landscape` is the wide band; `portrait` is a 3:4 slot for
 *  corpora of mostly portrait images. See CLAUDE.md "Library card thumbnails". */
export type ThumbFrame = "landscape" | "portrait";

/** How an image sits in its slot (documents ignore this). `auto`: an image
 *  whose orientation matches the frame covers it, anything else is matted (a
 *  square mats in both). `cover` / `contain` force one treatment. */
export type ThumbFit = "auto" | "cover" | "contain";

/** Where the preview sits on a card. `stacked`: above the text. `side`: at the
 *  card's logical start (left in LTR, right in RTL), so the grid uses fewer,
 *  wider columns. One choice for the whole grid. */
export type CardLayout = "stacked" | "side";

/** List row density. Changes height and padding only; type size stays at the
 *  app's 11px floor. */
export type ListDensity = "comfortable" | "compact";

/** Track scope: `all` plots the whole corpus span, `year` zooms to the current
 *  year by month, with ↑/↓ counts for the rest. */
export type TimelineScope = "all" | "year";
export const libraryTimelineScopeAtom = atom<TimelineScope>("all");

// ── Display options ──────────────────────────────────────────────────────────

/** Every Display-menu value in one store, shaped like the registry. `modes`
 *  holds each view's own values, `shared` the global ones. Both are sparse: an
 *  absent key means the registry default, so defaults can change without
 *  migrating state. In-memory only; a reload starts clean. */
export interface LibraryDisplayState {
  modes: Partial<Record<LibraryViewMode, DisplayValues>>;
  shared: DisplayValues;
}
const libraryDisplayStoreAtom = atom<LibraryDisplayState>({ modes: {}, shared: {} });

/** Values from before two options changed shape. `cardFields: "none"` was the
 *  off state before Metadata became its own switch: it reads as Metadata off
 *  with the count on its default. A boolean `preview` was the Thumbnail switch:
 *  it reads as On or Off. A saved display keeps what it showed. Same object back
 *  when there is nothing to migrate, so readers keep their memo identity. */
function migrateDisplay(state: LibraryDisplayState): LibraryDisplayState {
  let modes: LibraryDisplayState["modes"] | null = null;
  for (const [mode, bag] of Object.entries(state.modes) as [LibraryViewMode, DisplayValues | undefined][]) {
    if (!bag) continue;
    const none = bag.cardFields === "none";
    const switched = typeof bag.preview === "boolean";
    if (!none && !switched) continue;
    const next: DisplayValues = { ...bag };
    if (none) {
      delete next.cardFields;
      next.metadata = false;
    }
    // Thumbnail was a switch before it had Auto: on / off keep their answer.
    if (switched) next.preview = bag.preview ? "on" : "off";
    modes = { ...(modes ?? state.modes), [mode]: next };
  }
  return modes ? { ...state, modes } : state;
}

export const libraryDisplayAtom = atom(
  (get) => migrateDisplay(get(libraryDisplayStoreAtom)),
  (get, set, next: LibraryDisplayState | ((prev: LibraryDisplayState) => LibraryDisplayState)) =>
    set(
      libraryDisplayStoreAtom,
      typeof next === "function" ? next(migrateDisplay(get(libraryDisplayStoreAtom))) : next,
    ),
);

/** The list's optional metadata columns: one per template property of the
 *  templates in view (the selected Types, else the whole corpus), keyed by
 *  name (spec §6.3), as Uwazi's table view offers the selected templates'
 *  properties. Derived from the templates and the Type selection only, so it
 *  does not recompute per keystroke, and a label renamed in Settings retitles
 *  its column without losing a saved choice. */
export const libraryFieldColumnsAtom = atom((get) => {
  const templates = get(templatesAtom(get(dataSourceAtom)));
  const types = get(libraryTypeFiltersAtom);
  const ids = new Set(Object.keys(types).filter((k) => types[k]));
  const inView = ids.size ? templates.filter((t) => ids.has(t.id)) : templates;
  return propertyColumns(inView.length ? inView : templates);
});

/** The sort keys a collection adds to the fixed ones: Date modified where its
 *  records carry an edit date (the Sample; CEJIL and Nepal record none), then
 *  one per property flagged `prioritySorting` (Uwazi: "the system will try to
 *  pick up the best fit"), by name, labelled as the first template has it. */
const MODIFIED_SORT: Choice = { id: "modified", label: "Date modified" };
const libraryHasEditDatesAtom = atom((get) => get(libraryEntitiesAtom).some((e) => !!e.updatedAt));
export const libraryPropertySortsAtom = atom<Choice[]>((get) => {
  const props = propertySorts(get(templatesAtom(get(dataSourceAtom))));
  return get(libraryHasEditDatesAtom) ? withModified(props) : props;
});
const modifiedCache = new WeakMap<Choice[], Choice[]>();
function withModified(props: Choice[]): Choice[] {
  let hit = modifiedCache.get(props);
  if (!hit) modifiedCache.set(props, (hit = [MODIFIED_SORT, ...props]));
  return hit;
}
const sortsCache = new WeakMap<object, Choice[]>();
function propertySorts(templates: { properties: { name: string; label: string; prioritySorting?: boolean }[] }[]): Choice[] {
  const hit = sortsCache.get(templates);
  if (hit) return hit;
  const seen = new Set<string>();
  const out: Choice[] = [];
  for (const t of templates)
    for (const p of t.properties)
      if (p.prioritySorting && !seen.has(p.name)) {
        seen.add(p.name);
        out.push({ id: `prop:${p.name}`, label: p.label });
      }
  sortsCache.set(templates, out);
  return out;
}

/** Set by the Library toolbar from its own width: true while the Sort select
 *  has no room in the row (see the masthead fold in `LibraryView`). */
export const librarySortInMenuAtom = atom(false);
/** The same for the Language select, which otherwise has no place on a narrow
 *  desktop pane. */
export const libraryLanguageInMenuAtom = atom(false);

/** Context the registry cannot know itself: viewport, whether a query runs, and
 *  the columns this corpus offers. One atom, so the menu, its dot and the table
 *  resolve the same option list. */
export const libraryDisplayContextAtom = atom<DisplayContext>((get) => {
  const hasQuery = get(libraryQueryAtom).trim().length > 0;
  const isMobile = get(breakpointAtom) === "mobile";
  return {
    isMobile,
    sortInMenu: isMobile || get(librarySortInMenuAtom),
    languageInMenu: get(libraryLanguageInMenuAtom),
    hasQuery,
    listColumns: listColumnOptions({ hasQuery, fieldColumns: get(libraryFieldColumnsAtom), source: get(dataSourceAtom) }),
    sortChoices: [...LIBRARY_SORTS, ...get(libraryPropertySortsAtom)],
    // Only the Network view builds the graph its type list comes from.
    networkTypes: get(libraryViewModeAtom) === "network" ? get(networkTypeOptionsAtom) : [],
    networkEvidence: !!NETWORK_EVIDENCE_TEMPLATES[get(dataSourceAtom)],
  };
});

/** The Network view's stored Display answers (`LIBRARY_DISPLAY.network`). */
export const libraryNetworkDisplayAtom = atom((get) => get(libraryDisplayAtom).modes.network ?? {});

/** Read one option for one mode, falling back to its registry default. */
function readOption(
  state: LibraryDisplayState,
  mode: LibraryViewMode,
  id: string,
  scope: "mode" | "shared",
  fallback: DisplayValue,
): DisplayValue {
  const bag = scope === "shared" ? state.shared : state.modes[mode];
  return bag?.[id] ?? fallback;
}

/** A read/write atom over one option of the current view mode. Takes no mode
 *  argument: a card is only mounted inside the view whose options govern it, so
 *  the current mode is always the consumer's mode. */
function displayOption<T extends DisplayValue>(
  id: string,
  scope: "mode" | "shared",
  fallback: T | ((get: Getter) => T),
) {
  const fallbackOf = (get: Getter) => (typeof fallback === "function" ? fallback(get) : fallback);
  return atom(
    (get) => readOption(get(libraryDisplayAtom), get(libraryViewModeAtom), id, scope, fallbackOf(get)) as T,
    (get, set, next: T | ((prev: T) => T)) => {
      const mode = get(libraryViewModeAtom);
      const state = get(libraryDisplayAtom);
      const prev = readOption(state, mode, id, scope, fallbackOf(get)) as T;
      const value = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      set(
        libraryDisplayAtom,
        scope === "shared"
          ? { ...state, shared: { ...state.shared, [id]: value } }
          : {
              ...state,
              modes: { ...state.modes, [mode]: { ...state.modes[mode], [id]: value } },
            },
      );
    },
  );
}

export const DEFAULT_RESULTS_LAYOUT: ResultsLayout = "grouped";
export const DEFAULT_TIMELINE_LAYOUT: TimelineLayout = "rail";
export const DEFAULT_THUMB_SIZE: ThumbSize = "s";
export const DEFAULT_THUMB_FRAME: ThumbFrame = "landscape";
/* Default is `cover` so a slot with an image is filled edge to edge; `auto` and
   `contain` remain as options. */
export const DEFAULT_THUMB_FIT: ThumbFit = "cover";
export const DEFAULT_LIST_DENSITY: ListDensity = "comfortable";
export const DEFAULT_TIME_HUB = true;

export const libraryResultsLayoutAtom = displayOption<ResultsLayout>(
  "resultsLayout",
  "mode",
  DEFAULT_RESULTS_LAYOUT,
);
export const libraryTimelineLayoutAtom = displayOption<TimelineLayout>(
  "timelineLayout",
  "mode",
  DEFAULT_TIMELINE_LAYOUT,
);
const thumbSizeStateAtom = displayOption<ThumbSize>("thumbSize", "mode", DEFAULT_THUMB_SIZE);
/** Reads through a validity check because a stored value can outlive the option
 *  list, and an unknown key would index the size tables to `undefined` (a card
 *  with no slot height). Unknown values read as the default. */
export const libraryThumbSizeAtom = atom(
  (get) => {
    const v = get(thumbSizeStateAtom);
    return v === "s" || v === "m" || v === "l" ? v : DEFAULT_THUMB_SIZE;
  },
  (_get, set, next: ThumbSize) => set(thumbSizeStateAtom, next),
);
export const libraryThumbFrameAtom = displayOption<ThumbFrame>(
  "thumbFrame",
  "mode",
  DEFAULT_THUMB_FRAME,
);
/** Columns for the current frame: "auto" or a count 2–6 (see CARD_COLUMNS). */
export type CardColumns = "auto" | 2 | 3 | 4 | 5 | 6;
export const libraryCardColumnsAtom = atom((get): CardColumns => {
  const frame = get(libraryThumbFrameAtom);
  const raw = readOption(get(libraryDisplayAtom), get(libraryViewModeAtom), `cardCols:${frame}`, "mode", "auto");
  const n = Number(raw);
  return n >= 2 && n <= 6 ? (n as CardColumns) : "auto";
});
/** The count the grid actually drew, measured by the Library. The menu shows
 *  it, so a count the pane cannot fit is never a silent no-op. */
export const libraryCardColumnsInEffectAtom = atom(0);
export const libraryThumbFitAtom = displayOption<ThumbFit>("thumbFit", "mode", DEFAULT_THUMB_FIT);
export const DEFAULT_CARD_LAYOUT: CardLayout = "stacked";
export const libraryCardLayoutAtom = displayOption<CardLayout>("cardLayout", "mode", DEFAULT_CARD_LAYOUT);
/** Whether cards draw the side layout. Falls back to stacked with previews off
 *  (no slot) and on phones (the title would get about 200px). The stored choice
 *  is kept, so widening the window restores it. */
export const libraryCardSideAtom = atom(
  (get) =>
    get(libraryCardLayoutAtom) === "side" &&
    get(libraryCardInfoAtom).preview &&
    get(breakpointAtom) !== "mobile",
);
export const libraryListDensityAtom = displayOption<ListDensity>(
  "density",
  "mode",
  DEFAULT_LIST_DENSITY,
);
/** The time strip charts the whole result set, so it is one switch for every
 *  mode — the only `shared` toggle in the registry. */
export const libraryTimeHubAtom = displayOption<boolean>(
  "timeStrip",
  "shared",
  // Off on phones by default, matching the registry (`CHART` in libraryDisplay.ts).
  (get) => DEFAULT_TIME_HUB && get(breakpointAtom) !== "mobile",
);

/** How many of the current results can draw a preview, set by the Library
 *  from its filtered list in a layout effect, so cards paint with the right
 *  answer. null before the Library has measured; then the whole corpus
 *  answers. */
export const libraryResultsPreviewCountAtom = atom<PreviewCount | null>(null);

const corpusPreviewCountAtom = atom((get) => previewCount(get(libraryEntitiesAtom), get(dataSourceAtom)));

export interface PreviewCount {
  /** Results that carry a document, image or recording. */
  withPreview: number;
  total: number;
}

/** Counts what the Content card counts (`carriesContent`): a document (its
 *  first page), an image, or a recording (a play or waveform tile). One model,
 *  so Contains: Video and Auto never disagree about an Audiencia. */
export function previewCount(entities: readonly Entity[], source: DataSource): PreviewCount | null {
  if (entities.length === 0) return null;
  let n = 0;
  for (const e of entities) if (carriesContent(e, source)) n++;
  return { withPreview: n, total: entities.length };
}

/** What Thumbnail Auto resolves to: on when at least half the results can
 *  draw a preview. `count` is what the menu note reports. */
export const libraryThumbAutoAtom = atom((get) => {
  const count = get(libraryResultsPreviewCountAtom) ?? get(corpusPreviewCountAtom);
  return { on: count === null || count.withPreview * 2 >= count.total, count };
});

/** What a card carries, for whichever mode is drawing cards. */
export const libraryCardInfoAtom = atom((get) => {
  const state = get(libraryDisplayAtom);
  const mode = get(libraryViewModeAtom);
  const read = (id: string) => readOption(state, mode, id, "mode", true) !== false;
  const thumbRaw = readOption(state, mode, "preview", "mode", DEFAULT_THUMB_MODE);
  const thumbMode: ThumbMode = thumbRaw === "on" || thumbRaw === "off" ? thumbRaw : "auto";
  const { on: thumbAuto, count: thumbCount } = get(libraryThumbAutoAtom);
  const fieldsRaw = readOption(state, mode, "cardFields", "mode", DEFAULT_CARD_FIELDS);
  const fields: CardFields =
    fieldsRaw === "3" || fieldsRaw === "5" || fieldsRaw === "all" ? fieldsRaw : DEFAULT_CARD_FIELDS;
  return {
    /** Thumbnails drawn, with Auto resolved. */
    preview: thumbMode === "auto" ? thumbAuto : thumbMode === "on",
    thumbMode,
    thumbAuto,
    thumbCount,
    /** Off hides every property; `fields` is the count while it is on. */
    metadata: read("metadata"),
    fields,
    country: read("country"),
    date: read("date"),
    connections: read("connections"),
  };
});

/** Is a given list column drawn? Columns default from their own spec, so a new
 *  entry in `LIST_COLUMNS` needs no change here. */
export const libraryListColumnsAtom = atom((get) => {
  const bag = get(libraryDisplayAtom).modes.list;
  const defaults = new Map(
    get(libraryDisplayContextAtom).listColumns.map((o) => [o.id, o.default]),
  );
  // A property column chosen before choices were kept per collection is read
  // under its old id, so an older saved view keeps its columns.
  const legacy = (id: string) => {
    const old = legacyMetaColumnId(id);
    return old ? (bag?.[old] as boolean | undefined) : undefined;
  };
  return (id: string) =>
    ((bag?.[id] as boolean | undefined) ?? legacy(id) ?? defaults.get(id) ?? false) === true;
});

/** Does any option the menu shows for this mode sit off its default? Reads the
 *  same registry that renders the menu, so the dot never points at a hidden
 *  control. `external` options (sort) are excluded: sort has its own visible
 *  control and is shared across modes, so "Reset this view" does not touch it. */
export const libraryDisplayModifiedAtom = atom((get) => {
  const state = get(libraryDisplayAtom);
  const mode = get(libraryViewModeAtom);
  const ctx = get(libraryDisplayContextAtom);
  return optionsFor(mode, ctx).some(
    (o) =>
      o.scope !== "external" &&
      readOption(state, mode, o.id, o.scope, o.fallback) !== o.fallback,
  );
});

/** Reset this mode to registry defaults. Other modes and shared options are untouched. */
export const resetLibraryDisplayAtom = atom(null, (get, set) => {
  const mode = get(libraryViewModeAtom);
  const state = get(libraryDisplayAtom);
  const modes = { ...state.modes };
  delete modes[mode];
  set(libraryDisplayAtom, { ...state, modes });
});

/** Sort order. `relevance` (match quality, `utils/relevance.ts`) applies only
 *  while a query is active. */
export type LibrarySort =
  | "relevance"
  | "recent"
  | "title"
  | "connections"
  | "type"
  | "country"
  // The last edit, or creation for a record never edited (Uwazi's editDate).
  | "modified"
  // A template property with Uwazi's `prioritySorting` (spec §6.4).
  | `prop:${string}`;
export const DEFAULT_LIBRARY_SORT: LibrarySort = "recent";
export type LibrarySortDir = "asc" | "desc";

/** The browsing sort: applies with no query and returns when a search is dismissed. */
const sortStateAtom = atom<LibrarySort>(DEFAULT_LIBRARY_SORT);
const sortDirStateAtom = atom<LibrarySortDir>("desc");
/** Whether the reader picked the browsing sort. Until they do, a view
 *  narrowed to templates sorts by their priority-sorting property. */
const userSortedAtom = atom(false);

/** Uwazi's default sort for the templates in view
 *  (`utils/prioritySortingCriteria.js`): the `prioritySorting` property most
 *  of them share (the first on a tie), common properties first; custom ones
 *  count when they are filters of type text, date, numeric or select. Dates
 *  sort newest first, the rest A to Z. Only with a Type selection: with none,
 *  the Library keeps its own default. */
const prioritySortAtom = atom((get): { key: LibrarySort; dir: LibrarySortDir } | null => {
  const types = get(libraryTypeFiltersAtom);
  const ids = new Set(Object.keys(types).filter((k) => types[k]));
  if (!ids.size) return null;
  const counts = new Map<LibrarySort, { n: number; date: boolean }>();
  const add = (key: LibrarySort, date: boolean) => {
    const c = counts.get(key);
    counts.set(key, { n: (c?.n ?? 0) + 1, date });
  };
  for (const t of get(templatesAtom(get(dataSourceAtom)))) {
    if (!ids.has(t.id)) continue;
    for (const p of t.commonProperties)
      if (p.prioritySorting && p.name === "title") add("title", false);
      else if (p.prioritySorting && p.name === "creationDate") add("recent", true);
    for (const p of t.properties)
      if (p.prioritySorting && p.filter && ["text", "date", "numeric", "select"].includes(p.type))
        add(`prop:${p.name}`, p.type === "date");
  }
  let best: [LibrarySort, { n: number; date: boolean }] | null = null;
  for (const entry of counts) if (!best || entry[1].n > best[1].n) best = entry;
  return best ? { key: best[0], dir: best[1].date ? "desc" : "asc" } : null;
});
/** A sort picked while a query runs, for that query only. `null` = relevance. */
const searchSortOverrideAtom = atom<LibrarySort | null>(null);
const searchSortDirOverrideAtom = atom<LibrarySortDir | null>(null);

type Update<T> = T | ((prev: T) => T);
const resolve = <T,>(next: Update<T>, prev: T): T =>
  typeof next === "function" ? (next as (p: T) => T)(prev) : next;

/** The Library's sort key. A query sorts by relevance unless the user picks
 *  another sort, which lasts until `clearLibrarySearchAtom`; then the browsing
 *  sort returns. With no query, writing `relevance` does nothing. */
export const librarySortAtom = atom(
  (get): LibrarySort =>
    get(libraryQueryAtom).trim()
      ? (get(searchSortOverrideAtom) ?? "relevance")
      : ((!get(userSortedAtom) && get(prioritySortAtom)?.key) || get(sortStateAtom)),
  (get, set, next: Update<LibrarySort>) => {
    const searching = !!get(libraryQueryAtom).trim();
    if (searching) {
      const prev = get(searchSortOverrideAtom) ?? "relevance";
      const key = resolve(next, prev);
      set(searchSortOverrideAtom, key === "relevance" ? null : key);
      return;
    }
    const key = resolve(next, get(librarySortAtom));
    if (key === "relevance") return;
    set(sortStateAtom, key);
    set(userSortedAtom, true);
  },
);
/** Direction, kept per the same split so a search can't overwrite the browsing
 *  sort's direction either. Relevance itself ignores it: best match first. */
export const librarySortDirAtom = atom(
  (get): LibrarySortDir =>
    get(libraryQueryAtom).trim()
      ? (get(searchSortDirOverrideAtom) ?? "desc")
      : ((!get(userSortedAtom) && get(prioritySortAtom)?.dir) || get(sortDirStateAtom)),
  (get, set, next: Update<LibrarySortDir>) => {
    if (get(libraryQueryAtom).trim()) {
      set(searchSortDirOverrideAtom, resolve(next, get(searchSortDirOverrideAtom) ?? "desc"));
      return;
    }
    // Turning the direction keeps the sort in view, priority default or not.
    const dir = resolve(next, get(librarySortDirAtom));
    set(sortStateAtom, get(librarySortAtom));
    set(sortDirStateAtom, dir);
    set(userSortedAtom, true);
  },
);
/** Natural direction for a freshly-picked sort key: text → A→Z, value → high→low. */
export const defaultSortDir = (key: LibrarySort): LibrarySortDir =>
  key === "title" || key === "type" || key === "country" ? "asc" : "desc";

/** Switch collection. Template ids, countries and descriptors are per-source, so
 *  every facet and the open preview are cleared. An atom rather than view code so
 *  the navbar picker and any other caller share one reset. */
export const selectDataSourceAtom = atom(null, (get, set, source: DataSource) =>
  // Guard the whole switch, not just the selection clear: otherwise "Keep
  // editing" leaves the new collection showing with the old selection and form.
  whenBulkClean(get, set, () => switchDataSource(get, set, source)),
);

/** Run `run` now, or, while the bulk form has changes, behind the discard
 *  confirm, closing the form first on Discard. */
export function whenBulkClean(get: Getter, set: Setter, run: () => void) {
  if (!get(bulkEditDirtyAtom)) return run();
  set(guardNavigationAtom, () => {
    set(libraryBulkEditOpenAtom, false);
    run();
  });
}

/** `whenBulkClean`, for callers outside an atom (the selection's Delete). */
export const whenBulkCleanAtom = atom(null, (get, set, run: () => void) => whenBulkClean(get, set, run));

function switchDataSource(get: Getter, set: Setter, source: DataSource) {
  set(dataSourceAtom, source);
  // The query carries over to the new collection; a scope it cannot offer does not.
  set(dropUnofferedScopeAtom);
  // Likewise the Evidence view: the default view where the new collection has
  // no claim evidence. Before it loads it cannot say, so it is dropped then too.
  if (get(viewModeChosenAtom) === "evidence" && !get(libraryHasClaimEvidenceAtom)) set(viewModeChosenAtom, null);
  set(libraryTypeFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryStatusFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryInheritedFiltersAtom, {});
  set(libraryFacetMatchAtom, {});
  set(libraryRangeFiltersAtom, {});
  set(libraryFilterGroupsAtom, []);
  set(libraryChainFiltersAtom, {});
  set(libraryContentFiltersAtom, {});
  set(libraryContentModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(mapBoundsStateAtom, null);
  set(libraryOpenEntityIdAtom, null);
  set(librarySelectedClusterAtom, null);
  // A selection belongs to the collection it was made in.
  set(clearSelectionAtom);
}

/** Clear the facet filters but keep the query, for the Results tab's "hidden by
 *  filters · Clear filters" line. */
export const clearLibraryFacetsAtom = atom(null, (_get, set) => {
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryFacetMatchAtom, {});
  set(libraryRangeFiltersAtom, {});
  set(libraryFilterGroupsAtom, []);
  set(libraryChainFiltersAtom, {});
  set(libraryContentFiltersAtom, {});
  set(libraryContentModeAtom, "OR");
  set(mapBoundsStateAtom, null);
});

/** Clear every filter and the search. The one definition, so callers cannot drift. */
export const clearLibraryFiltersAtom = atom(null, (_get, set) => {
  // Clear both the draft and the committed query: leaving the draft would let
  // the next keystroke re-commit the old string.
  set(clearLibrarySearchAtom);
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryFacetMatchAtom, {});
  set(libraryRangeFiltersAtom, {});
  set(libraryFilterGroupsAtom, []);
  set(libraryChainFiltersAtom, {});
  set(libraryContentFiltersAtom, {});
  set(libraryContentModeAtom, "OR");
  set(mapBoundsStateAtom, null);
});

/** Count of active facets (not the search; see `libraryActiveSearchAtom`). The
 *  Filters tab's count and dot read this. Surfaces that list filters including
 *  the search use `useActiveFilters().length` instead. */
export const libraryActiveFilterCountAtom = atom((get) => {
  const match = get(libraryFacetMatchAtom);
  const narrowing = facetNarrows(get);
  // A group that changes the result counts once, as its chip.
  const groups = get(libraryFilterGroupsAtom).filter((g) => groupEffective(g, narrowing)).length;
  // A facet in `missing` ignores its ticks and counts once, as its one chip.
  const ticks = (key: string, vals: Record<string, boolean>) =>
    match[key] === "missing" ? 1 : Object.values(vals).filter(Boolean).length;
  let n = Object.values(get(libraryTypeFiltersAtom)).filter(Boolean).length;
  if (get(libraryHasDocAtom)) n += 1;
  n += Object.values(get(libraryStatusFiltersAtom)).filter(Boolean).length;
  n += ticks("country", get(libraryCountryFiltersAtom));
  n += ticks("descriptor", get(libraryDescriptorFiltersAtom));
  if (get(libraryDateFromAtom) || get(libraryDateToAtom)) n += 1;
  const inherited = get(libraryInheritedFiltersAtom);
  const keys = new Set([
    ...Object.keys(inherited),
    ...Object.keys(match).filter((k) => k.startsWith("inh:")).map((k) => k.slice(4)),
  ]);
  for (const propId of keys) n += ticks(inheritedKey(propId), inherited[propId] ?? {});
  // A range counts once: bounds set, or `missing`.
  const ranges = get(libraryRangeFiltersAtom);
  const names = new Set([
    ...Object.entries(ranges).filter(([, b]) => b.from || b.to).map(([k]) => k),
    ...Object.keys(match).filter((k) => k.startsWith("range:") && match[k] === "missing").map((k) => k.slice(6)),
  ]);
  n += names.size;
  n += groups;
  for (const vals of Object.values(get(libraryChainFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  for (const vals of Object.values(get(libraryContentFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  if (get(libraryMapBoundsAtom)) n += 1;
  return n;
});

/** Does the facet under this key narrow? The atoms' answer, for groups. */
function facetNarrows(get: Getter): (key: string) => boolean {
  const match = get(libraryFacetMatchAtom);
  const ticked = (rec: Record<string, boolean> | undefined) => Object.values(rec ?? {}).some(Boolean);
  return (key) => {
    if (match[key] === "missing") return true;
    switch (key) {
      case "type":
        return ticked(get(libraryTypeFiltersAtom));
      case "doc":
        return get(libraryHasDocAtom);
      case "status":
        return ticked(get(libraryStatusFiltersAtom));
      case "country":
        return ticked(get(libraryCountryFiltersAtom));
      case "descriptor":
        return ticked(get(libraryDescriptorFiltersAtom));
      case "date":
        return !!get(libraryDateFromAtom) || !!get(libraryDateToAtom);
    }
    if (key.startsWith("inh:")) return ticked(get(libraryInheritedFiltersAtom)[key.slice(4)]);
    if (key.startsWith("range:")) {
      const b = get(libraryRangeFiltersAtom)[key.slice(6)];
      return !!b?.from || !!b?.to;
    }
    return false;
  };
}

/** Is a facet or the search narrowing the results? Gates the "nothing matched"
 *  Clear buttons (map, time brush), which clear both; a facet count alone would
 *  hide them for a search that matches nothing. */
export const libraryHasNarrowingAtom = atom(
  (get) => get(libraryActiveFilterCountAtom) > 0 || get(libraryActiveSearchAtom) !== null,
);

/** The Library's private state, for `atoms/savedViews.ts` only: a saved view
 *  must restore the sort and view exactly as the reader left them (whether
 *  they picked the sort and the view), which the public atoms
 *  derive and cannot be written back through. */
export const libraryStateInternals = {
  searchDraftStateAtom,
  viewModeChosenAtom,
  sortStateAtom,
  sortDirStateAtom,
  userSortedAtom,
  searchSortOverrideAtom,
  searchSortDirOverrideAtom,
  resultsSheetArmedAtom,
  mapBoundsStateAtom,
};

/** Switch collection without the bulk guard, for callers already behind it. */
export const switchDataSourceAtom = atom(null, (get, set, source: DataSource) => switchDataSource(get, set, source));
