import { atom, type Getter, type Setter } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import { dataSourceAtom, type DataSource } from "./dataSource";
import { appViewAtom } from "./navigation";
import { registerSettingsReset } from "./settingsReset";
import { libraryLayoutAtom, librarySyncFiltersAtom } from "./session";
import { breakpointAtom } from "./viewport";
import {
  libraryStateInternals as L,
  libraryQueryAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryContentFiltersAtom,
  libraryContentModeAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDescriptorFiltersAtom,
  libraryFacetMatchAtom,
  libraryRangeFiltersAtom,
  libraryFilterGroupsAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  matchTypeFiltersAtom,
  librarySearchScopeAtom,
  librarySearchMatchAtom,
  libraryCorpusReadyAtom,
  libraryHasQuotesAtom,
  libraryHasClaimEvidenceAtom,
  libraryDisplayAtom,
  libraryTimelineScopeAtom,
  libraryResultsSheetOpenAtom,
  librarySelectedClusterAtom,
  libraryMapBoundsAtom,
  librarySyncActiveAtom,
  switchDataSourceAtom,
  whenBulkClean,
  ALL_MATCH_TYPES,
  type LibraryDisplayState,
  type LibraryMatch,
  type MapBounds,
  type LibrarySort,
  type LibrarySortDir,
  type LibraryViewMode,
  type MatchTypeFilters,
  type TimelineScope,
} from "./library";
import type { SearchScope } from "../utils/librarySnippets";
import type { QueryMatchMode } from "../utils/queryTokens";
import { groupEffective, type FilterGroup, type RangeBounds } from "../utils/libraryFilter";

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
  descriptors: Ticks;
  /** Each facet's Match mode (any / all / none / missing) by facet key; absent
   *  = any. Missing in snapshots saved before Match modes. */
  match?: Record<string, LibraryMatch>;
  /** Range facets' bounds by property name. Missing in older snapshots. */
  ranges?: Record<string, RangeBounds>;
  /** OR and NOT groups over the facets. Missing in older snapshots. */
  groups?: FilterGroup[];
  /** The AND/OR switch Country and Descriptor had before Match modes; read
   *  only from old snapshots ("AND" opens as `all`). */
  countryMode?: "AND" | "OR";
  descriptorMode?: "AND" | "OR";
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
  /** Adv. Search's "Search in" and "Match". Missing in older snapshots and
   *  in ones that kept the defaults (`all`, `partial`). */
  searchScope?: SearchScope;
  searchMatch?: QueryMatchMode;
  /** The Map view's area filter, which is also where the map opens. Missing
   *  in older snapshots and wherever the reader had not moved the map. */
  mapBounds?: MapBounds;
  /** Saved in Split with Sync filters on: opened in Split, it turns sync on,
   *  so the filters apply to both panes. Missing otherwise. */
  synced?: true;
  /** The view the reader picked; null = the collection's default view. */
  viewMode: LibraryViewMode | null;
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
    descriptors: ticked(get(libraryDescriptorFiltersAtom)),
    match: get(libraryFacetMatchAtom),
    ranges: Object.fromEntries(Object.entries(get(libraryRangeFiltersAtom)).filter(([, b]) => b.from || b.to)),
    groups: get(libraryFilterGroupsAtom),
    dateFrom: get(libraryDateFromAtom),
    dateTo: get(libraryDateToAtom),
    inherited: tickedNested(get(libraryInheritedFiltersAtom)),
    chains: tickedNested(get(libraryChainFiltersAtom)),
    content: tickedNested(get(libraryContentFiltersAtom)),
    contentMode: get(libraryContentModeAtom),
    matchTypes: get(matchTypeFiltersAtom),
    // Written only when set, so a plain search's link stays as short as before.
    ...(get(librarySearchScopeAtom) !== "all" ? { searchScope: get(librarySearchScopeAtom) } : {}),
    ...(get(librarySearchMatchAtom) !== "partial" ? { searchMatch: get(librarySearchMatchAtom) } : {}),
    ...(get(libraryMapBoundsAtom) ? { mapBounds: get(libraryMapBoundsAtom)! } : {}),
    ...(get(librarySyncActiveAtom) ? { synced: true as const } : {}),
    viewMode: get(L.viewModeChosenAtom),
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

/** A snapshot's Match modes; an old one's AND switch on Country or
 *  Descriptor reads as `all`. */
function snapshotMatch(s: LibrarySnapshot): Record<string, LibraryMatch> {
  const match: Record<string, LibraryMatch> = { ...(s.match ?? {}) };
  if (!s.match) {
    if (s.countryMode === "AND") match.country = "all";
    if (s.descriptorMode === "AND") match.descriptor = "all";
  }
  return match;
}

const SEARCH_SCOPES: SearchScope[] = ["all", "title", "metadata", "fulltext", "quotes"];

/** Write a snapshot's state, replacing the Library's. Facets the snapshot does
 *  not tick are cleared; nothing is merged. */
function writeSnapshot(get: Getter, set: Setter, s: LibrarySnapshot) {
  set(libraryTypeFiltersAtom, { ...s.types });
  set(libraryHasDocAtom, s.hasDoc);
  set(libraryStatusFiltersAtom, { ...s.status });
  set(libraryCountryFiltersAtom, { ...s.countries });
  set(libraryDescriptorFiltersAtom, { ...s.descriptors });
  set(libraryFacetMatchAtom, snapshotMatch(s));
  set(libraryRangeFiltersAtom, { ...(s.ranges ?? {}) });
  set(libraryFilterGroupsAtom, (s.groups ?? []).map((g) => ({ ...g, keys: [...g.keys] })));
  set(libraryDateFromAtom, s.dateFrom);
  set(libraryDateToAtom, s.dateTo);
  set(libraryInheritedFiltersAtom, { ...s.inherited });
  set(libraryChainFiltersAtom, { ...s.chains });
  set(libraryContentFiltersAtom, { ...s.content });
  set(libraryContentModeAtom, s.contentMode);
  set(matchTypeFiltersAtom, { ...ALL_MATCH_TYPES, ...s.matchTypes });
  set(L.searchDraftStateAtom, s.query);
  set(libraryQueryAtom, s.query);
  // The modifiers belong to a query; without one they are back at their defaults.
  // Quotes is dropped where the collection has loaded and carries none; before
  // it loads, `librarySearchScopeAtom` reads it as All.
  const scope = (s.query && SEARCH_SCOPES.includes(s.searchScope!) && s.searchScope) || "all";
  const unoffered = scope === "quotes" && get(libraryCorpusReadyAtom) && !get(libraryHasQuotesAtom);
  set(librarySearchScopeAtom, unoffered ? "all" : scope);
  set(librarySearchMatchAtom, s.query && s.searchMatch === "whole" ? "whole" : "partial");
  // Evidence likewise, where the collection has loaded and holds no claim
  // evidence; before it loads, `libraryViewModeAtom` reads it as the default.
  const noEvidence = s.viewMode === "evidence" && get(libraryCorpusReadyAtom) && !get(libraryHasClaimEvidenceAtom);
  set(L.viewModeChosenAtom, noEvidence ? null : s.viewMode);
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
  // After the view: the bound is read only while the Map view is in front.
  // Synced, it is the shared area, set from this pane.
  set(libraryMapBoundsAtom, isMapBounds(s.mapBounds) ? { ...s.mapBounds } : null);
  // Split's sync then copies this pane's filters into the other one
  // (`LibrarySplitView`).
  if (s.synced === true && get(libraryLayoutAtom) === "split" && get(breakpointAtom) === "desktop")
    set(librarySyncFiltersAtom, true);
}

const isMapBounds = (b: unknown): b is MapBounds =>
  !!b &&
  typeof b === "object" &&
  (["south", "west", "north", "east"] as const).every((k) => Number.isFinite((b as Record<string, unknown>)[k]));

/** Open a snapshot: its collection (behind the bulk form's guard, as the
 *  collection picker is), the Library, and its state. */
export const applyLibrarySnapshotAtom = atom(null, (get, set, s: LibrarySnapshot) => {
  whenBulkClean(get, set, () => {
    if (get(dataSourceAtom) !== s.collection) set(switchDataSourceAtom, s.collection);
    writeSnapshot(get, set, s);
    // A link opened before signing in waits behind the login screen.
    if (get(appViewAtom) !== "login") set(appViewAtom, "library");
  });
});

/** How many facet values a snapshot ticks (the search not counted), the same
 *  count as `libraryActiveFilterCountAtom`. */
export function snapshotFilterCount(s: LibrarySnapshot): number {
  const match = snapshotMatch(s);
  const ranges = s.ranges ?? {};
  const n = (r: Ticks | undefined) => Object.values(r ?? {}).filter(Boolean).length;
  const nn = (r: NestedTicks) => Object.values(r).reduce((sum, v) => sum + n(v), 0);
  // A facet in `missing` ignores its ticks and counts once.
  const ticks = (key: string, r: Ticks | undefined) => (match[key] === "missing" ? 1 : n(r));
  const inheritedIds = new Set([
    ...Object.keys(s.inherited),
    ...Object.keys(match).filter((k) => k.startsWith("inh:")).map((k) => k.slice(4)),
  ]);
  let inherited = 0;
  for (const id of inheritedIds) inherited += ticks(`inh:${id}`, s.inherited[id]);
  // A range counts once: bounds set, or `missing`.
  const rangeNames = new Set([
    ...Object.entries(ranges).filter(([, b]) => b.from || b.to).map(([k]) => k),
    ...Object.keys(match).filter((k) => k.startsWith("range:") && match[k] === "missing").map((k) => k.slice(6)),
  ]);
  const narrows = (key: string): boolean => {
    if (match[key] === "missing") return true;
    switch (key) {
      case "type": return n(s.types) > 0;
      case "doc": return s.hasDoc;
      case "status": return n(s.status) > 0;
      case "country": return n(s.countries) > 0;
      case "descriptor": return n(s.descriptors) > 0;
      case "date": return !!s.dateFrom || !!s.dateTo;
    }
    if (key.startsWith("inh:")) return n(s.inherited[key.slice(4)]) > 0;
    if (key.startsWith("range:")) {
      const b = ranges[key.slice(6)];
      return !!b?.from || !!b?.to;
    }
    return false;
  };
  return (
    n(s.types) +
    (s.hasDoc ? 1 : 0) +
    n(s.status) +
    ticks("country", s.countries) +
    ticks("descriptor", s.descriptors) +
    (s.dateFrom || s.dateTo ? 1 : 0) +
    inherited +
    rangeNames.size +
    (s.groups ?? []).filter((g) => groupEffective(g, narrows)).length +
    nn(s.chains) +
    nn(s.content) +
    (isMapBounds(s.mapBounds) ? 1 : 0)
  );
}

/** A filter signature: two searches for the same words under different
 *  filters are different searches. */
const facetKey = (s: LibrarySnapshot) =>
  JSON.stringify([s.types, s.hasDoc, s.status, s.countries, s.descriptors, snapshotMatch(s), s.ranges ?? {},
    s.groups ?? [], s.dateFrom, s.dateTo, s.inherited, s.chains, s.content, s.contentMode,
    s.searchScope ?? "all", s.searchMatch ?? "partial", s.mapBounds ?? null]);

/** A snapshot read from storage or a link is untrusted: anything that is not
 *  the shape is dropped rather than half-applied. */
export function isLibrarySnapshot(x: unknown): x is LibrarySnapshot {
  if (!x || typeof x !== "object") return false;
  const s = x as Partial<LibrarySnapshot>;
  return (
    s.v === 1 &&
    typeof s.collection === "string" &&
    ["mock", "cejil", "artworks", "travesia", "nepal", "vegas"].includes(s.collection) &&
    typeof s.query === "string" &&
    !!s.types && typeof s.types === "object" &&
    !!s.display && typeof s.display === "object" &&
    !!s.sort && typeof s.sort === "object" &&
    (s.match === undefined || (!!s.match && typeof s.match === "object" && !Array.isArray(s.match))) &&
    (s.ranges === undefined || (!!s.ranges && typeof s.ranges === "object" && !Array.isArray(s.ranges))) &&
    (s.groups === undefined ||
      (Array.isArray(s.groups) &&
        s.groups.every(
          (g) =>
            !!g && typeof g.id === "string" && (g.op === "or" || g.op === "not") &&
            Array.isArray(g.keys) && g.keys.every((k) => typeof k === "string"),
        )))
  );
}

/* ── Saved views ──────────────────────────────────────────────────────────
   Named snapshots, per collection, in localStorage: they outlast the visit,
   as a bookmark would. No accounts, so they live in this browser only; a
   shared link carries the state itself. */

export interface SavedView {
  id: string;
  name: string;
  savedAt: number;
  snapshot: LibrarySnapshot;
}

const localJSON = <T,>() => createJSONStorage<T>(() => localStorage);

const savedViewsStoreAtom = atomWithStorage<Partial<Record<DataSource, SavedView[]>>>(
  "uwazi:savedViews",
  {},
  localJSON(),
  { getOnInit: true },
);

/** The collection shown's saved views, newest first. */
export const savedViewsAtom = atom((get) => get(savedViewsStoreAtom)[get(dataSourceAtom)] ?? []);

const writeViews = (get: Getter, set: Setter, fn: (views: SavedView[]) => SavedView[]) => {
  const corpus = get(dataSourceAtom);
  const all = get(savedViewsStoreAtom);
  set(savedViewsStoreAtom, { ...all, [corpus]: fn(all[corpus] ?? []) });
};

let viewSeq = 0;
/** Save the Library as it is now, under a name. Returns the new view's id. */
export const saveCurrentViewAtom = atom(null, (get, set, name: string): string => {
  const id = `view-${Date.now().toString(36)}-${(viewSeq++).toString(36)}`;
  const view: SavedView = { id, name: name.trim() || "Untitled view", savedAt: Date.now(), snapshot: captureLibrarySnapshot(get) };
  writeViews(get, set, (views) => [view, ...views]);
  return id;
});

export const renameSavedViewAtom = atom(null, (get, set, { id, name }: { id: string; name: string }) => {
  const next = name.trim();
  if (!next) return;
  writeViews(get, set, (views) => views.map((v) => (v.id === id ? { ...v, name: next } : v)));
});

export const deleteSavedViewAtom = atom(null, (get, set, id: string) => {
  writeViews(get, set, (views) => views.filter((v) => v.id !== id));
});

/** Overwrite a saved view with the Library as it is now. */
export const updateSavedViewAtom = atom(null, (get, set, id: string) => {
  const snapshot = captureLibrarySnapshot(get);
  writeViews(get, set, (views) => views.map((v) => (v.id === id ? { ...v, snapshot, savedAt: Date.now() } : v)));
});

/** The saved view the Library shows right now, if one matches it exactly. */
export const currentSavedViewIdAtom = atom((get) => {
  const views = get(savedViewsAtom);
  if (!views.length) return null;
  const now = snapshotSignature(captureLibrarySnapshot(get));
  return views.find((v) => snapshotSignature(v.snapshot) === now)?.id ?? null;
});

/** A snapshot as a comparable string: keys sorted, and an older snapshot's
 *  missing Match modes, ranges and groups read as their defaults. */
function snapshotSignature(s: LibrarySnapshot): string {
  const { countryMode: _c, descriptorMode: _d, ...rest } = s;
  const norm = { ...rest, match: snapshotMatch(s), ranges: s.ranges ?? {}, groups: s.groups ?? [] };
  const sorted = (x: unknown): unknown =>
    Array.isArray(x)
      ? x.map(sorted)
      : x && typeof x === "object"
        ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted((x as Record<string, unknown>)[k])]))
        : x;
  return JSON.stringify(sorted(norm));
}

/* ── Shared links ─────────────────────────────────────────────────────────
   `#view=<base64url JSON>`: the snapshot and its name. Uwazi V2 keeps its
   filter state in the URL; here the hash carries it, so a link restores the
   Library on load with no server. */

const HASH_KEY = "view";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(code: string): string {
  const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function viewLink(snapshot: LibrarySnapshot, name?: string): string {
  const code = toBase64Url(JSON.stringify({ name, snapshot }));
  const { origin, pathname, search } = window.location;
  return `${origin}${pathname}${search}#${HASH_KEY}=${code}`;
}

/** The view a link's hash carries, or null. */
export function readViewHash(hash: string): { name?: string; snapshot: LibrarySnapshot } | null {
  const m = new RegExp(`(?:^#|&)${HASH_KEY}=([A-Za-z0-9_-]+)`).exec(hash);
  if (!m) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(m[1])) as { name?: unknown; snapshot?: unknown };
    if (!isLibrarySnapshot(parsed.snapshot)) return null;
    return { name: typeof parsed.name === "string" ? parsed.name : undefined, snapshot: parsed.snapshot };
  } catch {
    return null;
  }
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
   history in every collection (the notebook clears through `notebook.ts`). */
export const clearSavedViewsAndHistoryAtom = atom(null, (_get, set) => {
  set(savedViewsStoreAtom, {});
  set(historyStoreAtom, []);
});
registerSettingsReset((set) => set(clearSavedViewsAndHistoryAtom));
