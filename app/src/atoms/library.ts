import { startTransition } from "react";
import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, type DataSource } from "./dataSource";

/** The COMMITTED library search — what every consumer filters, ranks, marks and
 *  counts by. Read this one everywhere; only the search input itself binds to
 *  the draft below. */
export const libraryQueryAtom = atom("");

/** What is currently TYPED in the search box, which is not the same thing as
 *  what you are searching for.
 *
 *  Emptying the box used to empty the results with it: you cleared the text to
 *  type something else, or just to see the row underneath, and the entire result
 *  set — with its facets, its counts and its snippets — evaporated mid-read. So
 *  the two are split. Every non-empty draft commits immediately, so live search
 *  is unchanged; an EMPTY draft commits nothing, leaving the last real search
 *  standing. The committed query is dismissed deliberately, by its chip in
 *  ACTIVE FILTERS or by Clear all — never as a side effect of an empty box. */
const searchDraftStateAtom = atom("");
export const librarySearchDraftAtom = atom(
  (get) => get(searchDraftStateAtom),
  (_get, set, next: string) => {
    // The DRAFT is urgent: it is the text in the box, and a character that
    // appears a frame after you typed it is the one thing search must never do.
    set(searchDraftStateAtom, next);
    // The COMMIT is not. Committing drives filter → rank → count → snippets over
    // the whole corpus, and running that synchronously inside the keystroke is
    // what put 2.6s tasks on the main thread. As a transition React can abandon
    // it when the next keystroke arrives, and keeps showing the previous results
    // until the new ones are ready — see `useDeferredValue` in `LibraryView`.
    if (next.trim()) startTransition(() => set(libraryQueryAtom, next));
  },
);

/** Drop the search for real: empties the box AND the committed query. The only
 *  route back to "no search" — the box's own X clears just the text. */
export const clearLibrarySearchAtom = atom(null, (_get, set) => {
  set(searchDraftStateAtom, "");
  set(libraryQueryAtom, "");
});

/** The running search, or `null` — the search as its OWN state, deliberately not
 *  folded into the filter count.
 *
 *  A search is not a facet. You run it from the search box at the top of the
 *  results, not from the Filters panel, and counting it there made the Filters
 *  tab claim custody of something it doesn't hold: type a query having ticked
 *  nothing, and the tab wore a "1" and an attention dot over a panel with every
 *  box unticked. The dot means "something you set is still on BACK HERE", and
 *  the search was never back there. This is what the Results page's
 *  active-search element reads instead. */
export const libraryActiveSearchAtom = atom(
  (get) => get(libraryQueryAtom).trim() || null,
);

/** Recent searches — the queries you actually ran, newest first.
 *
 *  SESSION storage, following `appViewAtom`'s reasoning exactly: a reload should
 *  keep your place, but a visit should start clean. In localStorage this list
 *  would hand every later visitor of a shared prototype the last person's
 *  research questions, which is a different feature (and a worse one).
 *
 *  What gets recorded is a COMMITTED, SETTLED query — see `recordSearchAtom`.
 *  Recording per keystroke would fill the log with "v", "ve", "vel" and bury the
 *  one entry anybody wanted. */
const searchHistoryJSON = createJSONStorage<string[]>(() => sessionStorage);
export const librarySearchHistoryAtom = atomWithStorage<string[]>(
  "uwazi:searchHistory",
  [],
  searchHistoryJSON,
  { getOnInit: true },
);

/** How many searches the log keeps. Small on purpose: it is a way back to what
 *  you just did, not an archive — past ~8 you scan it slower than you retype. */
export const SEARCH_HISTORY_CAP = 8;
/** Below this, a query isn't worth remembering (and is faster to retype). */
export const MIN_LOGGED_QUERY = 2;

/** Record a search. Deduped case-insensitively — re-running an old query moves
 *  it back to the top rather than listing it twice — and capped. */
export const recordSearchAtom = atom(null, (get, set, raw: string) => {
  const q = raw.trim();
  if (q.length < MIN_LOGGED_QUERY) return;
  const rest = get(librarySearchHistoryAtom).filter(
    (h) => h.toLowerCase() !== q.toLowerCase(),
  );
  set(librarySearchHistoryAtom, [q, ...rest].slice(0, SEARCH_HISTORY_CAP));
});

/** Forget one entry (its × ) or the lot (Clear all). */
export const forgetSearchAtom = atom(null, (get, set, q: string) => {
  set(
    librarySearchHistoryAtom,
    get(librarySearchHistoryAtom).filter((h) => h !== q),
  );
});
export const clearSearchHistoryAtom = atom(null, (_get, set) => {
  set(librarySearchHistoryAtom, []);
});

/** Selected entity-type facets (typeId → on). Empty = all types. */
export const libraryTypeFiltersAtom = atom<Record<string, boolean>>({});

/** "Has document" facet toggle. */
export const libraryHasDocAtom = atom(false);

/** Publishing-status facet: keys "published" / "restricted". */
export const libraryStatusFiltersAtom = atom<Record<string, boolean>>({});

/** Mobile filters drawer open state (the sidebar is persistent on desktop). */
export const libraryFiltersOpenAtom = atom(false);

/** Entity previewed in the right drawer. null → the drawer shows Filters. */
export const librarySelectedEntityIdAtom = atom<string | null>(null);

/** The Results-tab full-text page the user last jumped to. Lives here (not in the
 *  drawer subtree, which unmounts while a preview shows) so its spine node stays
 *  lit + `aria-pressed` when the user closes the preview and lands back on the
 *  Results list — the fix for the otherwise-unreachable active state. */
export interface ResultsActivePage {
  entityId: string;
  page: number;
}
export const resultsActivePageAtom = atom<ResultsActivePage | null>(null);

/** Which KINDS of match the results keep — the Results tab's title/properties/
 *  document chips.
 *
 *  DECISION (2026-07-21): these are a real FILTER, not a panel-local view toggle,
 *  so they narrow the LEFT PANE too. A researcher who turns off "Document" is
 *  saying "show me entities that matched in their metadata", and a grid that kept
 *  showing full-text-only hits would contradict the panel beside it — the two
 *  panes are one result set at two levels of detail. Living in the filter state
 *  also makes the Results header count correct by construction (it counts the
 *  filtered set) rather than needing a separate "N of M" reconciliation.
 *
 *  They are query-relative, so they no-op without a query and reset whenever the
 *  query changes — that keeps them from becoming an invisible sticky filter. */
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

/** A Results-tab "Properties" hit the user clicked: open the entity preview on
 *  its Metadata tab and flash the matching field. Matched by field KEY (stable,
 *  not the localized label) against the drawer's `MetadataField.id`. The metadata
 *  body clears it once it has scrolled + flashed. */
export interface FocusMetadataField {
  entityId: string;
  fieldKey: string;
}
export const focusMetadataFieldAtom = atom<FocusMetadataField | null>(null);

/** A map cluster opened in the drawer — the entities located at one place. */
export interface LibraryCluster {
  label: string;
  ids: string[];
}
export const librarySelectedClusterAtom = atom<LibraryCluster | null>(null);

/** Keyword-style Countries facet: selected country names + match mode. */
export const libraryCountryFiltersAtom = atom<Record<string, boolean>>({});
export type FacetMode = "AND" | "OR";
export const libraryCountryModeAtom = atom<FacetMode>("OR");

/** Keyword-style Descriptores (violations) facet — CEJIL property facet. The
 *  mode mirrors the Countries facet: "OR" = entity has any selected descriptor,
 *  "AND" = entity has all of them (meaningful — an entity carries several). */
export const libraryDescriptorFiltersAtom = atom<Record<string, boolean>>({});
export const libraryDescriptorModeAtom = atom<FacetMode>("OR");

/** Date-range property filter (the entity's representative date, e.g. CEJIL
 *  `Fecha`). ISO `yyyy-mm-dd` strings; "" = open-ended on that side. Mirrors
 *  Uwazi's per-property DateFilter (a from/to range). */
export const libraryDateFromAtom = atom<string>("");
export const libraryDateToAtom = atom<string>("");

/** Dynamic facets generated from INHERITED relationship properties (e.g. a
 *  person's Role, a case's Region) — keyed `inheritProperty → (value → on)`.
 *  Mirrors Uwazi, where an inherited relationship property becomes a filter. */
export const libraryInheritedFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Relationship-CHAIN facet selections (CEJIL only) — keyed `${chainId}:${seg}`
 *  → (value → on). Several keys of one chain combine path-coupled (a single
 *  traversed path must satisfy them all). See utils/chainTraversal.ts. */
export const libraryChainFiltersAtom = atom<
  Record<string, Record<string, boolean>>
>({});

/** Results layout. `results` is the evidence view promoted out of the drawer: it
 *  reads the same `buildSnippetsFor` output the Results tab does, at full width.
 *  It stays selectable with no query (the switcher may not gain and lose a
 *  segment as you type — that shifts every control beside it); the view renders
 *  its own "search to see where terms match" state instead. */
export type LibraryViewMode = "cards" | "list" | "map" | "timeline" | "results";
export const libraryViewModeAtom = atom<LibraryViewMode>("cards");

/** Results body flavour — four readings of the same snippets:
 *  - `grouped`   one wide card per entity: its matched properties beside its
 *                document passages (the drawer's card, given room)
 *  - `tree`      entity → matched field → its snippets, collapsible at both levels
 *  - `passages`  every matching passage as one flat ranked list, entity secondary
 *                — the reading view
 *  - `spine`     passages on a proportional time axis, each entity carrying its
 *                strongest one */
export type ResultsLayout = "grouped" | "tree" | "passages" | "spine";
/** Display-menu defaults are exported so `DisplayMenu` can ask "is this off its
 *  default?" against the real value. Both Display menus (Library and
 *  Relationships) light their dot on exactly that question. */
export const DEFAULT_RESULTS_LAYOUT: ResultsLayout = "grouped";
export const libraryResultsLayoutAtom = atom<ResultsLayout>(DEFAULT_RESULTS_LAYOUT);

/** Timeline body flavour — four ways to read the same chronology:
 *  - `rail`     the text-references minimap on a vertical time track: dots and
 *               counted clusters that fan out into their members. Navigation —
 *               clicking picks an entity, it does not filter.
 *  - `density`  the same track as a volume histogram; clicking a bar FILTERS the
 *               Library to that period.
 *  - `spine`    a proportional chronology — every entity at its exact instant
 *  - `lanes`    a template × period grid */
export type TimelineLayout = "rail" | "density" | "spine" | "lanes";
export const DEFAULT_TIMELINE_LAYOUT: TimelineLayout = "rail";
export const libraryTimelineLayoutAtom = atom<TimelineLayout>(DEFAULT_TIMELINE_LAYOUT);

/** Track scope, mirroring the document minimap's whole-document / this-page
 *  toggle: `all` plots the entire corpus span, `year` zooms the track to the
 *  year you're currently reading (months, with ↑/↓ counts for the rest). */
export type TimelineScope = "all" | "year";
export const libraryTimelineScopeAtom = atom<TimelineScope>("all");

/** Which information pieces the results show — a key is visible unless explicitly
 *  false, so the default (`{}`) shows everything. Driven by the header "Display"
 *  menu; applies to cards (thumbnail/metadata/connections) and the list table
 *  (country/date/connections columns). */
export type LibraryInfoKey =
  | "preview"
  | "metadata"
  | "country"
  | "date"
  | "connections";
export const libraryInfoAtom = atom<Partial<Record<LibraryInfoKey, boolean>>>({});

/** The time strip under the results. It filters by date and reads the whole
 *  result set, so it is useful under EVERY layout — not just the map and the
 *  timeline it started under. A display option, on by default. */
export const DEFAULT_TIME_HUB = true;
export const libraryTimeHubAtom = atom(DEFAULT_TIME_HUB);

/** Sort order. */
export type LibrarySort =
  | "recent"
  | "title"
  | "connections"
  | "type"
  | "country";
export const DEFAULT_LIBRARY_SORT: LibrarySort = "recent";
export const librarySortAtom = atom<LibrarySort>(DEFAULT_LIBRARY_SORT);
export type LibrarySortDir = "asc" | "desc";
export const librarySortDirAtom = atom<LibrarySortDir>("desc");
/** Natural direction for a freshly-picked sort key: text → A→Z, value → high→low. */
export const defaultSortDir = (key: LibrarySort): LibrarySortDir =>
  key === "title" || key === "type" || key === "country" ? "asc" : "desc";

/** Switch collection. Template ids, countries and descriptors are per-source, so
 *  every facet and the open preview have to go with it — this lives in an atom
 *  (not in the view) because the collection picker now sits in the navbar, and
 *  two call-sites clearing "most of" the facets would drift. */
export const selectDataSourceAtom = atom(null, (_get, set, source: DataSource) => {
  set(dataSourceAtom, source);
  set(libraryTypeFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryStatusFiltersAtom, {});
  set(libraryDescriptorFiltersAtom, {});
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(librarySelectedEntityIdAtom, null);
  set(librarySelectedClusterAtom, null);
});

/** Clear every filter. ONE definition: the Filters panel and the view each had
 *  their own, and they had already drifted — the panel's forgot the search box,
 *  the view's forgot the AND/OR modes. */
/** Clear the facet filters but KEEP the query — for the Results tab's "hidden by
 *  filters · Clear filters" line, which widens the facets to reveal the matches
 *  the current query found but the facets excluded. */
export const clearLibraryFacetsAtom = atom(null, (_get, set) => {
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryCountryModeAtom, "OR");
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDescriptorModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
});

export const clearLibraryFiltersAtom = atom(null, (_get, set) => {
  // BOTH halves of the search: clearing only the committed query would leave the
  // box still holding text that no longer filters anything, and the next
  // keystroke would silently re-commit the old string.
  set(clearLibrarySearchAtom);
  set(libraryTypeFiltersAtom, {});
  set(libraryHasDocAtom, false);
  set(libraryStatusFiltersAtom, {});
  set(libraryCountryFiltersAtom, {});
  set(libraryCountryModeAtom, "OR");
  set(libraryDescriptorFiltersAtom, {});
  set(libraryDescriptorModeAtom, "OR");
  set(libraryDateFromAtom, "");
  set(libraryDateToAtom, "");
  set(libraryInheritedFiltersAtom, {});
  set(libraryChainFiltersAtom, {});
});

/** Count of active FACETS — types, has-doc, status, countries, descriptors,
 *  dates, inherited and chain values. The search is NOT one of them: see
 *  `libraryActiveSearchAtom`. This is what the Filters tab's count and dot read,
 *  so both describe the panel's own state and nothing else.
 *
 *  Surfaces that LIST the filters (the Active-filters sheet and the action-bar
 *  popover) show the search alongside the facets, so they size themselves off
 *  `useActiveFilters().length` — the real length of what they render — rather
 *  than this. Counting from the list is how they stay honest either way. */
export const libraryActiveFilterCountAtom = atom((get) => {
  let n = Object.values(get(libraryTypeFiltersAtom)).filter(Boolean).length;
  if (get(libraryHasDocAtom)) n += 1;
  n += Object.values(get(libraryStatusFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryCountryFiltersAtom)).filter(Boolean).length;
  n += Object.values(get(libraryDescriptorFiltersAtom)).filter(Boolean).length;
  if (get(libraryDateFromAtom) || get(libraryDateToAtom)) n += 1;
  for (const vals of Object.values(get(libraryInheritedFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  for (const vals of Object.values(get(libraryChainFiltersAtom)))
    n += Object.values(vals).filter(Boolean).length;
  return n;
});

/** Is ANYTHING narrowing the results — a facet or the search?
 *
 *  What the "nothing matched" escape hatches gate on (the map's and the time
 *  brush's Clear buttons), because those clear both. Gating them on the facet
 *  count alone would strand the one case they exist for: a search that matches
 *  nothing, with no facets ticked, offering no way out of an empty screen. */
export const libraryHasNarrowingAtom = atom(
  (get) => get(libraryActiveFilterCountAtom) > 0 || get(libraryActiveSearchAtom) !== null,
);
