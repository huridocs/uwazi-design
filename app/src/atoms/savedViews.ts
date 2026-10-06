import { atom, type Getter, type Setter } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, type DataSource } from "./dataSource";
import { appViewAtom } from "./navigation";
import { registerSettingsReset } from "./settingsReset";
import {
  libraryStateInternals as L,
  libraryQueryAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryContentFiltersAtom,
  libraryContentModeAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryCountryModeAtom,
  libraryDescriptorFiltersAtom,
  libraryDescriptorModeAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  matchTypeFiltersAtom,
  libraryDisplayAtom,
  libraryTimelineScopeAtom,
  libraryResultsSheetOpenAtom,
  librarySelectedClusterAtom,
  switchDataSourceAtom,
  whenBulkClean,
  ALL_MATCH_TYPES,
  type FacetMode,
  type LibraryDisplayState,
  type LibrarySort,
  type LibrarySortDir,
  type LibraryViewMode,
  type MatchTypeFilters,
  type TimelineScope,
} from "./library";

/* ── The Library's state as one value ──────────────────────────────────────
   Every atom that decides what the Library lists and how it draws it, listed
   once. A saved view, a search history entry and a shared link all hold one of
   these; `applyLibrarySnapshotAtom` writes it back. A new filter atom joins
   `captureLibrarySnapshot`, `applyLibrarySnapshotAtom` and `snapshotFilterCount`,
   or saved views silently drop it. */

type Ticks = Record<string, boolean>;
type NestedTicks = Record<string, Record<string, boolean>>;

export interface LibrarySnapshot {
  v: 1;
  collection: DataSource;
  query: string;
  types: Ticks;
  hasDoc: boolean;
  status: Ticks;
  countries: Ticks;
  countryMode: FacetMode;
  descriptors: Ticks;
  descriptorMode: FacetMode;
  /** Day or "day HH:MM", read as UTC (`dateBoundMs`). */
  dateFrom: string;
  dateTo: string;
  inherited: NestedTicks;
  /** Template-declared chain facets, `${chainId}:${seg}` → value → on. */
  chains: NestedTicks;
  /** The Content card: group → row → on, and its Contains mode. */
  content: NestedTicks;
  contentMode: "AND" | "OR";
  matchTypes: MatchTypeFilters;
  /** The view the reader picked; null = the collection's default view. */
  viewMode: LibraryViewMode | null;
  /** The view a running search displaced, and whether the reader overruled it. */
  preSearchView: LibraryViewMode | null;
  searchOverridden: boolean;
  display: LibraryDisplayState;
  sort: {
    key: LibrarySort;
    dir: LibrarySortDir;
    /** False = the priority sort of the templates in view still applies. */
    user: boolean;
    searchKey: LibrarySort | null;
    searchDir: LibrarySortDir | null;
  };
  timelineScope: TimelineScope;
}

/** Only the ticked keys: a snapshot (and the link that carries one) lists
 *  what is on, not every value the reader once unticked. */
const ticked = (r: Ticks): Ticks => Object.fromEntries(Object.entries(r).filter(([, on]) => on));
const tickedNested = (r: NestedTicks): NestedTicks =>
  Object.fromEntries(
    Object.entries(r)
      .map(([k, v]) => [k, ticked(v)] as const)
      .filter(([, v]) => Object.keys(v).length > 0),
  );

export function captureLibrarySnapshot(get: Getter): LibrarySnapshot {
  return {
    v: 1,
    collection: get(dataSourceAtom),
    query: get(libraryQueryAtom).trim(),
    types: ticked(get(libraryTypeFiltersAtom)),
    hasDoc: get(libraryHasDocAtom),
    status: ticked(get(libraryStatusFiltersAtom)),
    countries: ticked(get(libraryCountryFiltersAtom)),
    countryMode: get(libraryCountryModeAtom),
    descriptors: ticked(get(libraryDescriptorFiltersAtom)),
    descriptorMode: get(libraryDescriptorModeAtom),
    dateFrom: get(libraryDateFromAtom),
    dateTo: get(libraryDateToAtom),
    inherited: tickedNested(get(libraryInheritedFiltersAtom)),
    chains: tickedNested(get(libraryChainFiltersAtom)),
    content: tickedNested(get(libraryContentFiltersAtom)),
    contentMode: get(libraryContentModeAtom),
    matchTypes: get(matchTypeFiltersAtom),
    viewMode: get(L.viewModeChosenAtom),
    preSearchView: get(L.preSearchViewModeAtom),
    searchOverridden: get(L.searchModeOverriddenAtom),
    display: get(libraryDisplayAtom),
    sort: {
      key: get(L.sortStateAtom),
      dir: get(L.sortDirStateAtom),
      user: get(L.userSortedAtom),
      searchKey: get(L.searchSortOverrideAtom),
      searchDir: get(L.searchSortDirOverrideAtom),
    },
    timelineScope: get(libraryTimelineScopeAtom),
  };
}

/** Write a snapshot's state, replacing the Library's. Facets the snapshot does
 *  not tick are cleared; nothing is merged. */
function writeSnapshot(set: Setter, s: LibrarySnapshot) {
  set(libraryTypeFiltersAtom, { ...s.types });
  set(libraryHasDocAtom, s.hasDoc);
  set(libraryStatusFiltersAtom, { ...s.status });
  set(libraryCountryFiltersAtom, { ...s.countries });
  set(libraryCountryModeAtom, s.countryMode);
  set(libraryDescriptorFiltersAtom, { ...s.descriptors });
  set(libraryDescriptorModeAtom, s.descriptorMode);
  set(libraryDateFromAtom, s.dateFrom);
  set(libraryDateToAtom, s.dateTo);
  set(libraryInheritedFiltersAtom, { ...s.inherited });
  set(libraryChainFiltersAtom, { ...s.chains });
  set(libraryContentFiltersAtom, { ...s.content });
  set(libraryContentModeAtom, s.contentMode);
  set(matchTypeFiltersAtom, { ...ALL_MATCH_TYPES, ...s.matchTypes });
  set(L.searchDraftStateAtom, s.query);
  set(libraryQueryAtom, s.query);
  set(L.viewModeChosenAtom, s.viewMode);
  set(L.preSearchViewModeAtom, s.query ? s.preSearchView : null);
  set(L.searchModeOverriddenAtom, s.query ? s.searchOverridden : false);
  set(libraryResultsSheetOpenAtom, false);
  set(L.resultsSheetArmedAtom, false);
  set(libraryDisplayAtom, s.display);
  set(L.sortStateAtom, s.sort.key);
  set(L.sortDirStateAtom, s.sort.dir);
  set(L.userSortedAtom, s.sort.user);
  set(L.searchSortOverrideAtom, s.query ? s.sort.searchKey : null);
  set(L.searchSortDirOverrideAtom, s.query ? s.sort.searchDir : null);
  set(libraryTimelineScopeAtom, s.timelineScope);
  set(librarySelectedClusterAtom, null);
}

/** How many facet values a snapshot ticks (the search not counted), the same
 *  count as `libraryActiveFilterCountAtom`. */
export function snapshotFilterCount(s: LibrarySnapshot): number {
  const n = (r: Ticks) => Object.values(r).filter(Boolean).length;
  const nn = (r: NestedTicks) => Object.values(r).reduce((sum, v) => sum + n(v), 0);
  return (
    n(s.types) +
    (s.hasDoc ? 1 : 0) +
    n(s.status) +
    n(s.countries) +
    n(s.descriptors) +
    (s.dateFrom || s.dateTo ? 1 : 0) +
    nn(s.inherited) +
    nn(s.chains) +
    nn(s.content)
  );
}

/** A filter signature: two searches for the same words under different
 *  filters are different searches. */
const facetKey = (s: LibrarySnapshot) =>
  JSON.stringify([s.types, s.hasDoc, s.status, s.countries, s.countryMode, s.descriptors, s.descriptorMode,
    s.dateFrom, s.dateTo, s.inherited, s.chains, s.content, s.contentMode]);

/** A snapshot read from storage or a link is untrusted: anything that is not
 *  the shape is dropped rather than half-applied. */
export function isLibrarySnapshot(x: unknown): x is LibrarySnapshot {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<LibrarySnapshot>;
  return (
    s.v === 1 &&
    typeof s.collection === "string" &&
    ["mock", "cejil", "artworks", "travesia", "nepal"].includes(s.collection) &&
    typeof s.query === "string" &&
    !!s.types && typeof s.types === "object" &&
    !!s.display && typeof s.display === "object" &&
    !!s.sort && typeof s.sort === "object"
  );
}

/* ── Search history ───────────────────────────────────────────────────────
   The last searches with the filters they ran under, per collection, newest
   first. Session storage, as before: a reload keeps the list, a new visit
   starts clean, and a shared prototype does not show the previous visitor's
   queries. Recorded on settle (`logSearchAtom`), so the log lists searches
   rather than keystroke prefixes. */

export interface SearchHistoryEntry {
  id: string;
  query: string;
  at: number;
  snapshot: LibrarySnapshot;
}

/** How many searches the history keeps per collection. */
export const SEARCH_HISTORY_CAP = 20;
/** The search box's own list: the first few distinct queries. */
export const RECENT_QUERIES_CAP = 8;
/** Below this, a query isn't worth remembering (and is faster to retype). */
export const MIN_LOGGED_QUERY = 2;

const historyStoreAtom = atomWithStorage<SearchHistoryEntry[]>(
  "uwazi:searchHistory:v2",
  [],
  createJSONStorage<SearchHistoryEntry[]>(() => sessionStorage),
  { getOnInit: true },
);
// The string list this replaced; an old session's value has no reader now.
try {
  sessionStorage.removeItem("uwazi:searchHistory");
} catch {
  /* storage blocked */
}

/** The collection shown's searches, newest first. */
export const searchHistoryAtom = atom((get) => {
  const corpus = get(dataSourceAtom);
  return get(historyStoreAtom).filter((h) => h.snapshot.collection === corpus);
});

/** The search box's recent list: distinct queries, newest first. */
export const recentQueriesAtom = atom((get) => {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const h of get(searchHistoryAtom)) {
    const k = h.query.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(h.query);
    if (out.length === RECENT_QUERIES_CAP) break;
  }
  return out;
});

let historySeq = 0;
/** Record a search with the filters it ran under. The same words under the
 *  same filters move to the top; the list is capped per collection. */
export const logSearchAtom = atom(null, (get, set, raw: string) => {
  const q = raw.trim();
  if (q.length < MIN_LOGGED_QUERY) return;
  const snapshot = { ...captureLibrarySnapshot(get), query: q };
  const key = facetKey(snapshot);
  const corpus = snapshot.collection;
  const all = get(historyStoreAtom);
  const mine = all.filter(
    (h) => h.snapshot.collection === corpus && !(h.query.toLowerCase() === q.toLowerCase() && facetKey(h.snapshot) === key),
  );
  const others = all.filter((h) => h.snapshot.collection !== corpus);
  const entry: SearchHistoryEntry = { id: `s-${Date.now().toString(36)}-${(historySeq++).toString(36)}`, query: q, at: Date.now(), snapshot };
  set(historyStoreAtom, [entry, ...mine].slice(0, SEARCH_HISTORY_CAP).concat(others));
});

/** Forget every entry for a query (the search box's ×). */
export const forgetSearchAtom = atom(null, (get, set, q: string) => {
  const corpus = get(dataSourceAtom);
  set(historyStoreAtom, get(historyStoreAtom).filter((h) => !(h.snapshot.collection === corpus && h.query === q)));
});

/** Forget one entry (the history list's ×). */
export const forgetHistoryEntryAtom = atom(null, (get, set, id: string) => {
  set(historyStoreAtom, get(historyStoreAtom).filter((h) => h.id !== id));
});

/** Clear the collection shown's history. */
export const clearSearchHistoryAtom = atom(null, (get, set) => {
  const corpus = get(dataSourceAtom);
  set(historyStoreAtom, get(historyStoreAtom).filter((h) => h.snapshot.collection !== corpus));
});

/* ── Clearing ─────────────────────────────────────────────────────────────
   The Dev panel's switch and Reset demo data clear saved views and search
   history in every collection (the case clears through `caseFile.ts`). */
export const clearSavedViewsAndHistoryAtom = atom(null, (_get, set) => {
  set(historyStoreAtom, []);
});
registerSettingsReset((set) => set(clearSavedViewsAndHistoryAtom));
