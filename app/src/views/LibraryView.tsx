import { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  Search,
  X,
  Plus,
  Upload,
  FileUp,
  FileDown,
  MoreHorizontal,
} from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom, cejilReadyAtom } from "../atoms/dataSource";
import { startDraftAtom, recentTemplatesAtom } from "../atoms/entityOverlay";
import { activitiesAtom } from "../atoms/notifications";
import { editSessionOpenAtom } from "../atoms/dirtyGuard";
import { isPdf, runCsvExport, runPdfUploadBatch } from "../utils/libraryTasks";
import { defaultTemplateId, uploadTemplateId } from "../utils/createEntity";
import { CreateEntityDialog } from "../components/library/CreateEntityDialog";
import { CreateEntityButton } from "../components/library/CreateEntityButton";
import { UploadDocumentsModal } from "../components/library/UploadDocumentsModal";
import { NewImportModal } from "../components/import-csv/NewImportModal";
import { loadCejilData, cejilRelsByEntity } from "../data/cejil/load";
import { warmSearchScan } from "../utils/warmSearchScan";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { uiLanguageAtom } from "../atoms/uiLanguage";
import { t } from "../utils/i18n";
import { appViewAtom } from "../atoms/navigation";
import { breakpointAtom } from "../atoms/viewport";
import { openEntityAtom, focusEntityForPreviewAtom } from "../atoms/focusedEntity";
import { scrollToPageAtom } from "../atoms/selection";
import { useNotify } from "../hooks/useNotify";
import { useDirtyGuard } from "../hooks/useDirtyGuard";
import {
  libraryQueryAtom,
  librarySearchDraftAtom,
  clearLibrarySearchAtom,
  recordSearchAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryCountryModeAtom,
  libraryDescriptorFiltersAtom,
  libraryDescriptorModeAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  libraryActiveFilterCountAtom,
  libraryViewModeAtom,
  libraryCardInfoAtom,
  libraryThumbFrameAtom,
  libraryThumbSizeAtom,
  libraryListColumnsAtom,
  libraryListDensityAtom,
  libraryFieldLabelsAtom,
  librarySortAtom,
  librarySortDirAtom,
  defaultSortDir,
  librarySelectedEntityIdAtom,
  librarySelectedClusterAtom,
  resultsActivePageAtom,
  focusMetadataFieldAtom,
  clearLibraryFacetsAtom,
  matchTypeFiltersAtom,
  ALL_MATCH_TYPES,
  libraryDrawerResultsLayoutAtom,
  type DrawerResultsLayout,
  toggleSelectionAtom,
  setSelectionAnchorAtom,
  rangeSelectionAtom,
  clearSelectionAtom,
  collapseSelectionAtom,
  librarySelectionActiveAtom,
  librarySelectionDrawerOpenAtom,
  libraryDrawnIdsAtom,
} from "../atoms/library";
import { getEntityType, type Entity } from "../data/entities";
import { libraryInheritedDefs } from "../utils/libraryFacets";
import { buildActiveChains, cejilChainGraph } from "../data/cejil/chainFacets";
import { matchesAll, matchesSearch, passesMatchTypes, buildSearchIndex, type LibraryFilterState } from "../utils/libraryFilter";
import { highlightTerms, fold } from "../utils/queryTokens";
import { matchCategoriesWithTerms, type MatchCategories } from "../utils/librarySnippets";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { EntityCard } from "../components/library/EntityCard";
import {
  EntitySelectBox,
  currentSelectionOrder,
  lastPointerWasTouch,
  selectionIntent,
  useSelectionOrder,
  useTouchSelection,
} from "../components/library/EntitySelectBox";
import { ActionsSheet, LibrarySelectionBar } from "../components/library/LibrarySelectionBar";
import { LibrarySelectionDrawer } from "../components/library/LibrarySelectionDrawer";
import { MatchOrigin } from "../components/library/MatchOrigin";
import { listColumnSpecs, buildListColumns } from "../components/library/listColumns";
import { LIBRARY_SORTS } from "../data/libraryDisplay";
// Lazy: react-simple-maps + the world atlas are the heaviest static chunk in
// the bundle and only the map view needs them — split so the default Library
// (and everything else) never downloads them.
const LibraryMapView = lazy(() =>
  import("../components/library/LibraryMapView").then((m) => ({ default: m.LibraryMapView })),
);
import { LibraryFilters } from "../components/library/LibraryFilters";
import { LibraryClusterDrawer } from "../components/library/LibraryClusterDrawer";
import { EntityDrawerPreview } from "../components/library/EntityDrawerPreview";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { SegmentedControl } from "../components/shared/SegmentedControl";
import { ResultsMainView } from "../components/library/ResultsSnippets/ResultsMainView";
import { SearchTipsPopover } from "../components/library/SearchTipsPopover";
import { RecentSearches } from "../components/library/RecentSearches";
import { DisplayMenu } from "../components/library/DisplayMenu";
import { ActiveSearchChip } from "../components/library/ActiveSearchChip";
import { ActiveFiltersButton } from "../components/library/ActiveFiltersButton";
import { DataTable, type Column } from "../components/shared/DataTable";
import { EntityTypeChip } from "../components/shared/EntityTypeChip";
import { HighlightedText } from "../components/shared/HighlightedText";
import { Select } from "../components/shared/Select";
import { ViewSwitcher } from "../components/library/ViewSwitcher";
import { DRAWER_MIN_WIDTH } from "../components/layout/SplitView";
import { BAR_GHOST, BAR_LEAD } from "../components/shared/warmButton";

const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

/** Sort keys — shared by the toolbar Select and (on mobile, where the Select
 *  steps aside for the view switcher) the Display popover. */
export const SORTS = LIBRARY_SORTS.map((c) => ({ value: c.id, label: c.label }));

/** How long the search box must sit still before the query counts as a search
 *  worth remembering. Long enough to cover typing and a pause to read, short
 *  enough that a query you meant is logged before you move on. */
const SETTLE_MS = 1200;

/** How many cards to reveal per page in the Library grid/list. */
const DISPLAY_STEP = 120;

/** Stable identities for the "what does this row already mark?" sets — a fresh
 *  literal per row would re-run every marker's match scan on every render. */
const TITLE_ONLY = ["title"] as const;
const TITLE_AND_COUNTRY = ["title", "country"] as const;

export function LibraryView() {
  const entities = useAtomValue(libraryEntitiesAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  // Chrome language (not `languageAtom`, the content language below): the
  // masthead's t() labels re-render when the navbar switcher changes it.
  useAtomValue(uiLanguageAtom);
  const [cejilReady, setCejilReady] = useAtom(cejilReadyAtom);
  // Fetch the full CEJIL corpus on demand the first time the source is selected.
  // `cejilRetry` bumps to re-run the effect after a failed load (the loader
  // clears its cached promise on rejection, so this genuinely refetches).
  const [cejilError, setCejilError] = useState(false);
  const [cejilRetry, setCejilRetry] = useState(0);
  useEffect(() => {
    if (dataSource === "cejil" && !cejilReady) {
      let alive = true;
      setCejilError(false);
      loadCejilData().then(
        () => {
          if (!alive) return;
          setCejilReady(true);
          // Fold the corpus's documents off the main thread while the user is
          // still reading the list. Not awaited and nothing gates on it: it only
          // fills the caches the search path already consults, so the keystroke
          // that turns full-text search on finds them warm instead of paying for
          // the whole scan inline. See `utils/warmSearchScan.ts`.
          warmSearchScan();
        },
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, cejilReady, setCejilReady, cejilRetry]);
  const cejilLoading = dataSource === "cejil" && !cejilReady;
  const references = useAtomValue(referencesAtom);
  // `query` is the COMMITTED search — everything below (filtering, ranking,
  // match categories, highlighting) reads it. Only the input binds to the draft.
  const committedQuery = useAtomValue(libraryQueryAtom);
  // EVERYTHING heavy below reads `query`, and `query` is the DEFERRED committed
  // search. Typing updates the draft (the input) urgently and commits in a
  // transition; this is the other half — while the new query's cascade is being
  // computed, React keeps rendering this component with the PREVIOUS value, so
  // the last result set stays on screen and interactive instead of the pane
  // going blank or the keystroke waiting for 4,398 entities to be re-ranked.
  const deferredQuery = useDeferredValue(committedQuery);
  // …except when the committed query is GONE. Deferral is right for typing —
  // there is a next result set coming and the previous one is the best thing to
  // show until it lands — and wrong for dismissal, where there is no incoming
  // set to wait for and the previous one is precisely what the user just asked
  // to be rid of. Deferred, clearing tore in half: `clearLibrarySearchAtom`
  // empties the box and `libraryActiveSearchAtom` urgently (so the chip vanishes
  // instantly) while everything reading this value — the "N results for"
  // sentence, the filtered cards, the highlights — stayed on the old query for a
  // pass or more, leaving the masthead reading "807 results for" with nothing
  // after it. Clearing is one state change and has to land in one pass, so it
  // skips the deferral: an empty committed query is empty HERE immediately.
  const query = committedQuery ? deferredQuery : "";
  // The results on screen are for `query` while the user has already asked for
  // `committedQuery` — say so, rather than pretending they're current.
  const searchPending = query !== committedQuery;
  const [searchDraft, setSearchDraft] = useAtom(librarySearchDraftAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);
  const recordSearch = useSetAtom(recordSearchAtom);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  // Filters / Results drawer tabs. Results auto-activates while the search box
  // carries a query and falls back to Filters when it's cleared; between those
  // transitions the tab can still be switched by hand.
  const [drawerTab, setDrawerTab] = useState<"filters" | "results">("filters");
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const countryMode = useAtomValue(libraryCountryModeAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const descriptorMode = useAtomValue(libraryDescriptorModeAtom);
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);
  const [viewMode, setViewMode] = useAtom(libraryViewModeAtom);
  const cardInfo = useAtomValue(libraryCardInfoAtom);
  const listColumnOn = useAtomValue(libraryListColumnsAtom);
  const listDensity = useAtomValue(libraryListDensityAtom);
  const fieldLabels = useAtomValue(libraryFieldLabelsAtom);
  // Landscape grows with the display: 1 / sm 2 / xl 3, then 4 at a 1920px
  // viewport (120rem) and 5 at 2560px (160rem). Portrait cards are made
  // portrait by the GRID: the 3:4 slot spans the card's width, so the column
  // width sets the slot's height, and Size steps the column count (S hangs
  // five across at xl, L three) instead of a slot-height table.
  const thumbFrame = useAtomValue(libraryThumbFrameAtom);
  const thumbSize = useAtomValue(libraryThumbSizeAtom);
  const cardGridCols =
    thumbFrame === "portrait" && cardInfo.preview
      ? {
          s: "grid-cols-2 sm:grid-cols-4 xl:grid-cols-5",
          m: "grid-cols-2 sm:grid-cols-3 xl:grid-cols-4",
          l: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
        }[thumbSize]
      : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 min-[120rem]:grid-cols-4 min-[160rem]:grid-cols-5";
  const [sort, setSort] = useAtom(librarySortAtom);
  const [sortDir, setSortDir] = useAtom(librarySortDirAtom);
  const setSortKey = useCallback(
    (key: typeof sort) =>
      setSort((prev) => {
        if (prev === key) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          return prev;
        }
        setSortDir(defaultSortDir(key));
        return key;
      }),
    [setSort, setSortDir],
  );
  const [language, setLanguage] = useAtom(languageAtom);
  const breakpoint = useAtomValue(breakpointAtom);
  const [selectedId, setSelectedId] = useAtom(librarySelectedEntityIdAtom);
  const selectedCluster = useAtomValue(librarySelectedClusterAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);
  const setScrollToPage = useSetAtom(scrollToPageAtom);
  const setResultsActivePage = useSetAtom(resultsActivePageAtom);
  const setFocusMetadataField = useSetAtom(focusMetadataFieldAtom);
  const clearFacets = useSetAtom(clearLibraryFacetsAtom);
  const [matchTypes, setMatchTypes] = useAtom(matchTypeFiltersAtom);
  const setAppView = useSetAtom(appViewAtom);
  const notify = useNotify();
  const guard = useDirtyGuard();

  const isMobile = breakpoint === "mobile";

  const countByEntity = useMemo(() => {
    const m = new Map<string, number>();
    // CEJIL connection counts come from the loaded corpus index (one entry per
    // entity), not the mock references atom — so sort-by-connections is real.
    if (dataSource === "cejil") {
      if (cejilReady) for (const [sid, arr] of cejilRelsByEntity()) m.set(sid, arr.length);
      return m;
    }
    for (const r of references) {
      m.set(r.sourceEntityId, (m.get(r.sourceEntityId) ?? 0) + 1);
      m.set(r.targetEntityId, (m.get(r.targetEntityId) ?? 0) + 1);
    }
    return m;
  }, [references, dataSource, cejilReady]);

  // Precomputed lowercase searchable text per entity (title + country + the
  // displayed metadata field values + descriptors), so search matches real
  // metadata — not just titles — without scanning the corpus on each keystroke.
  const searchIndex = useMemo(() => buildSearchIndex(entities, language), [entities, language]);

  const activeTypeIds = Object.entries(typeFilters)
    .filter(([, on]) => on)
    .map(([id]) => id);
  const activeCountries = Object.entries(countryFilters)
    .filter(([, on]) => on)
    .map(([c]) => c);
  const activeDescriptors = Object.entries(descriptorFilters)
    .filter(([, on]) => on)
    .map(([d]) => d);
  const wantPublished = !!statusFilters.published;
  const wantRestricted = !!statusFilters.restricted;
  const statusActive = wantPublished || wantRestricted;
  const q = query.trim().toLowerCase();
  const hasQuery = q.length > 0;
  // The drawer's Results tab exists because cards / list / map can't
  // show a snippet. When the MAIN pane is the Results view, the tab is a 24rem
  // copy of what's already on screen at full width — so it isn't rendered at all,
  // and the drawer is simply the filter panel. Suppressing only its
  // auto-activation left the duplicate one click away and made the effect below
  // read like a special case; this makes it a consequence.
  //
  // Nothing shifts when it goes: Filters sits to its INLINE-START, so the strip
  // shrinks from the end, and the change is bound to an explicit view switch —
  // never to typing.
  // Record the search once it SETTLES. Typing "velásquez" commits nine times on
  // its way there; logging each would leave a history of "v", "ve", "vel" and
  // bury the entry anyone wanted. The debounce is the commit boundary — the
  // query has to stop changing before it counts as a search you ran. Enter and
  // blur record immediately, because both are the user saying "that's the one".
  useEffect(() => {
    // `committedQuery`, not the deferred one: the log records the search the user
    // RAN, and shouldn't wait on the render that displays it.
    const t = committedQuery.trim();
    if (!t) return;
    const id = window.setTimeout(() => recordSearch(t), SETTLE_MS);
    return () => window.clearTimeout(id);
  }, [committedQuery, recordSearch]);

  const [drawerResultsLayout, setDrawerResultsLayout] = useAtom(libraryDrawerResultsLayoutAtom);
  const showResultsTab = viewMode !== "results";
  useEffect(() => {
    setDrawerTab(hasQuery && showResultsTab ? "results" : "filters");
  }, [hasQuery, showResultsTab]);
  // Query tokens for the search predicate (shared with snippets + marks). Derived
  // from the raw `query` so uppercase AND/OR/NOT are recognised before lowering.
  // Full-text body scanning is gated on `q.length ≥ 3` for CEJIL-corpus perf.
  const searchTerms = useMemo(
    () => highlightTerms(query), // already folded
    [query],
  );
  const fullTextSearch = q.length >= 3;
  const fromMs = dateFrom ? Date.parse(dateFrom) : null;
  // Inclusive of the whole "to" day.
  const toMs = dateTo ? Date.parse(dateTo) + 86_400_000 - 1 : null;
  // Inherited-property filters with at least one value selected, paired with the
  // facet definition (target type, source-specific value accessor).
  const inheritedDefs = libraryInheritedDefs(dataSource, language);
  const activeInherited = Object.entries(inheritedFilters)
    .map(([propId, vals]) => ({
      def: inheritedDefs.find((d) => d.propId === propId),
      values: new Set(Object.entries(vals).filter(([, on]) => on).map(([v]) => v)),
    }))
    .filter((f) => f.def && f.values.size > 0) as {
    def: (typeof inheritedDefs)[number];
    values: Set<string>;
  }[];
  const inheritedKey = activeInherited
    .map((f) => `${f.def.propId}:${[...f.values].join("|")}`)
    .join(";");
  // Relationship-chain filters (CEJIL only — needs the loaded graph).
  const activeChains = useMemo(
    () => (dataSource === "cejil" ? buildActiveChains(chainFilters, cejilChainGraph()) : []),
    [dataSource, chainFilters, cejilReady],
  );
  const chainKey = JSON.stringify(chainFilters);

  // MEMOISED, and that is the whole point of it.
  //
  // Four memos below take this as a dependency, and between them they are every
  // full-corpus pass the Library makes — `matchTypeBase`, `searchMatchCount` and
  // the two brush passes, each a filter over 4,398 entities. As a plain object
  // literal this was a NEW IDENTITY ON EVERY RENDER, so all four recomputed every
  // time anything re-rendered this component, including the urgent render each
  // keystroke produces while `useDeferredValue` is still handing out the previous
  // query. The deferral was doing its job and the memos were throwing the result
  // away: measured at ~2 full-corpus passes per keystroke where the query hadn't
  // even changed yet.
  //
  // Keyed on CONTENT, not identity — `activeTypeIds`/`activeCountries`/
  // `activeDescriptors` are rebuilt per render from the facet atoms and
  // `activeInherited` from `inheritedFilters`, so their joined keys (and
  // `inheritedKey`) stand in for them, the same way the brush memo below already
  // keys itself. `activeChains`, `searchIndex` and `searchTerms` are memos and
  // can be depended on directly.
  const filterState: LibraryFilterState = useMemo(
    () => ({
      source: dataSource,
      language,
      typeIds: activeTypeIds,
      hasDocOnly,
      wantPublished,
      wantRestricted,
      countries: activeCountries,
      countryMode,
      descriptors: activeDescriptors,
      descriptorMode,
      fromMs,
      toMs,
      inherited: activeInherited,
      chains: activeChains,
      q,
      searchIndex,
      searchTerms,
      fullTextSearch,
      matchTypes,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content keys, see above
    [
      dataSource,
      language,
      activeTypeIds.join(","),
      hasDocOnly,
      wantPublished,
      wantRestricted,
      activeCountries.join(","),
      countryMode,
      activeDescriptors.join(","),
      descriptorMode,
      fromMs,
      toMs,
      inheritedKey,
      activeChains,
      q,
      searchIndex,
      searchTerms,
      fullTextSearch,
      matchTypes,
    ],
  );

  // WHERE each entity matched, computed at most ONCE per entity per query.
  //
  // Three consumers need the same answer — the relevance ranking below, the
  // match-type chip gate, and the chip counts — and each used to call
  // `matchCategories` itself, so a 4,000-match query categorised the corpus
  // several times over per keystroke. Lazy rather than eager: the all-chips-on
  // case never asks, and the ranking only asks for entities whose title didn't
  // already settle it.
  const categoriesOf = useMemo(() => {
    const cache = new Map<string, MatchCategories>();
    return (e: Entity): MatchCategories => {
      let c = cache.get(e.id);
      if (!c) {
        c = matchCategoriesWithTerms(e, searchTerms, language, dataSource);
        cache.set(e.id, c);
      }
      return c;
    };
    // `cejilReady`: blobs go empty→real when the corpus lands, so cached
    // "document: false" answers from before that must not survive it.
  }, [searchTerms, language, dataSource, cejilReady]);

  // ONE full-corpus pass. `matchTypeBase` is every entity passing the facets and
  // the search but NOT the chips; the chip-narrowed list is a subset of it, so
  // running `matchesAll` again over all 4,398 entities to get it was scanning the
  // corpus twice for two nested answers. Filter the subset from the superset.
  const matchTypeBase = useMemo(
    () => (q ? entities.filter((e) => matchesAll(e, filterState, "matchType")) : []),
    [entities, filterState, q],
  );

  const filtered = useMemo(() => {
    const list = q
      ? matchTypeBase.filter((e) =>
          passesMatchTypes(matchTypes, q, () => categoriesOf(e)),
        )
      : entities.filter((e) => matchesAll(e, filterState));
    const typeName = (e: Entity) => getEntityType(e.typeId)?.name ?? e.typeId;
    const cmp = (a: Entity, b: Entity) => {
      let r = 0;
      switch (sort) {
        case "title":
          r = a.title.localeCompare(b.title);
          break;
        case "type":
          r = typeName(a).localeCompare(typeName(b));
          break;
        case "country":
          r = (a.country ?? "").localeCompare(b.country ?? "");
          break;
        case "connections":
          r = (countByEntity.get(a.id) ?? 0) - (countByEntity.get(b.id) ?? 0);
          break;
        default: // recent / date
          r = (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
      }
      return sortDir === "asc" ? r : -r;
    };
    // With an active query, match quality outranks the sort: exact title →
    // title prefix → title contains → metadata/full-text hit. Otherwise a
    // "Date added" sort buries the entity literally named what you typed
    // under documents that merely mention it.
    if (q) {
      // Relevance tiers: exact title → title prefix → title contains → a title
      // TOKEN hit → a property hit → document-only. Folded, so an unaccented
      // query ranks accented titles correctly. Precomputed per entity (O(n)):
      // calling `matchCategories` inside the comparator would re-scan blobs
      // O(n log n) times.
      const qf = fold(q);
      const rankOf = new Map<string, number>();
      for (const e of list) {
        const t = fold(e.title);
        let r: number;
        if (t === qf) r = 0;
        else if (t.startsWith(qf)) r = 1;
        else if (t.includes(qf)) r = 2;
        else {
          const c = categoriesOf(e);
          r = c.title ? 3 : c.properties ? 4 : 5;
        }
        rankOf.set(e.id, r);
      }
      return [...list].sort(
        (a, b) => (rankOf.get(a.id) ?? 9) - (rankOf.get(b.id) ?? 9) || cmp(a, b),
      );
    }
    return [...list].sort(cmp);
    // `cejilReady`: once the corpus loads, full-text blobs go empty→real, so the
    // filtered set must recompute to surface document-body-only matches.
  }, [entities, matchTypeBase, categoriesOf, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, fromMs, toMs, inheritedKey, chainKey, activeChains, language, q, sort, sortDir, countByEntity, searchIndex, cejilReady, matchTypes]);

  // How many entities the query matches with the FACETS widened — so the Results
  // tab can offer to reveal the ones the current facets are hiding.
  const searchMatchCount = useMemo(
    () => (q ? entities.reduce((n, e) => n + (matchesSearch(e, filterState) ? 1 : 0), 0) : 0),
    [entities, filterState, q],
  );

  // Chip counts over the pre-chip set, reading the SAME categories the ranking
  // and the gate used — no third scan.
  const matchTypeCounts = useMemo(() => {
    const c = { title: 0, properties: 0, document: 0 };
    for (const e of matchTypeBase) {
      const m = categoriesOf(e);
      if (m.title) c.title++;
      if (m.properties) c.properties++;
      if (m.document) c.document++;
    }
    return c;
  }, [matchTypeBase, categoriesOf]);

  // The chips are query-relative — a new query starts from "all kinds" so they
  // never linger as an invisible filter.
  useEffect(() => {
    setMatchTypes(ALL_MATCH_TYPES);
  }, [q, setMatchTypes]);


  // The full CEJIL corpus is thousands of entities — cap the rendered cards and
  // let the user reveal more, so the card/list grid never paints them all at once.
  const [visibleCount, setVisibleCount] = useState(DISPLAY_STEP);
  useEffect(() => setVisibleCount(DISPLAY_STEP), [filtered]);
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);


  // Tap-to-preview on desktop/tablet; tap-to-open on mobile (no side drawer).
  // Previewing focuses the entity so the drawer's tabbed bodies (Relationships /
  // Files / Document read the focused + scoped atoms) reflect it immediately.
  // Stable so memoized EntityCards don't re-render on every selection/hover.
  /* ── Footer actions ───────────────────────────────────────────────────── */
  const store = useStore();
  const libraryTypes = useAtomValue(libraryTypesAtom);
  const startDraft = useSetAtom(startDraftAtom);
  // Import CSV opens its modal over the Library; the import then runs as a
  // Beacon task instead of taking the reader to the Import CSV screen.
  const [importOpen, setImportOpen] = useState(false);
  const setImportActivities = useSetAtom(activitiesAtom);
  const handleImportCsv = useCallback(
    (filename: string, template: string) => {
      setImportOpen(false);
      setImportActivities((prev) => [
        ...prev,
        { id: `imp-${Date.now()}`, label: "Importing CSV", detail: `${filename} → ${template}`, current: 0, total: 100 },
      ]);
    },
    [setImportActivities],
  );
  const [createOpen, setCreateOpen] = useState(false);
  const [phoneActionsOpen, setPhoneActionsOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  /** Create entity: the chosen template opens as a draft in the drawer, on its
   *  edit form. Guarded — the drawer may be holding another entity's edit. */
  const recentTemplates = useAtomValue(recentTemplatesAtom);
  /** Create entity's preset: the one template the Library is filtered to, else
   *  the last used in this corpus, else the corpus default. */
  const filteredType =
    activeTypeIds.length === 1 && libraryTypes.some((t) => t.id === activeTypeIds[0]) ? activeTypeIds[0] : null;
  const lastType = (recentTemplates[dataSource] ?? []).find((id) => libraryTypes.some((t) => t.id === id));
  const createPreset = filteredType ?? lastType ?? defaultTemplateId(dataSource) ?? libraryTypes[0]?.id ?? "";
  const createNamed = !!filteredType;
  const handleCreate = (typeId: string) => {
    setCreateOpen(false);
    guard(() => setSelectedId(startDraft({ typeId, corpus: dataSource })));
  };
  /** Upload PDF: the picked PDFs open `UploadDocumentsModal` (a title each,
   *  one template), and Upload runs the batch as ONE Beacon task. A single
   *  document opens in the drawer when it lands; a batch doesn't pick one. */
  const [pendingUploads, setPendingUploads] = useState<File[] | null>(null);
  function handleUpload(files: FileList | null) {
    const list = Array.from(files ?? []);
    const pdfs = list.filter(isPdf);
    const skipped = list.length - pdfs.length;
    if (skipped > 0) {
      notify(
        `${skipped} ${skipped === 1 ? "file isn't a PDF and was" : "files aren't PDFs and were"} skipped`,
        "error",
      );
    }
    if (pdfs.length) setPendingUploads(pdfs);
  }
  function startUpload(batch: { typeId: string; uploads: { file: File; title: string }[] }) {
    setPendingUploads(null);
    const corpus = dataSource;
    runPdfUploadBatch(store, { corpus, ...batch }, (ids) => {
      // Only while the library still shows that corpus: an upload that lands
      // after the user moved elsewhere shouldn't pull them back.
      if (ids.length !== 1 || store.get(dataSourceAtom) !== corpus) return;
      // It lands seconds after Upload was pressed, when the reader may be in a
      // form. Switching the drawer then would unmount it and lose what they
      // typed, so it never takes the drawer from an open form; the
      // notification says where the document is instead.
      if (store.get(editSessionOpenAtom)) return "Not opened while a form is open; it is in the library.";
      guard(() => setSelectedId(ids[0]));
    });
  }
  /** Export CSV: the CURRENT result set — facets, query and match types
   *  applied — which is `filtered`, the list every view mode draws. */
  function handleExport() {
    if (filtered.length === 0) {
      notify("Nothing to export — no entity matches the current filters", "info");
      return;
    }
    void runCsvExport(store, filtered, language, `uwazi-${dataSource}-${new Date().toISOString().slice(0, 10)}.csv`);
  }

  /* Multi-selection is modifier-click: Cmd/Ctrl+click toggles an entity in
     the selection and Shift+click spans from the anchor over the order the
     visible view draws (`currentSelectionOrder`) — without a preview. This
     component never reads the selection Set: the cards read their own flag,
     and the footer and drawer subscribe on their own. */
  const toggleSelection = useSetAtom(toggleSelectionAtom);
  const setAnchor = useSetAtom(setSelectionAnchorAtom);
  const rangeSelection = useSetAtom(rangeSelectionAtom);
  const clearSelection = useSetAtom(clearSelectionAtom);
  const collapseSelection = useSetAtom(collapseSelectionAtom);
  const selectionActive = useAtomValue(librarySelectionActiveAtom);
  const selectionDrawerOpen = useAtomValue(librarySelectionDrawerOpenAtom);
  /* A plain click on the EMPTY GROUND of the results — the lane, the gap
     between cards, the margin — clears the selection, as Escape does. Not a
     click on an item or any control, not one with a modifier, not the end of a
     drag (a text selection, or a press that moved), and not on the map, whose
     ground is the map. */
  const groundDown = useRef<{ x: number; y: number } | null>(null);
  const clearOnGround = useCallback(
    (e: React.MouseEvent) => {
      if (!selectionActive || viewMode === "map") return;
      if (e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.button !== 0) return;
      const t = e.target as Element;
      if (
        t.closest(
          'button, a, input, select, textarea, label, summary, [role="button"], [role="menu"], [role="dialog"], ' +
            '[role="listbox"], [role="slider"], [tabindex], [data-select-id], ' +
            '[data-component="EntityCard"], [role="row"], [data-part="result"], [data-part="header"]',
        )
      )
        return;
      const d = groundDown.current;
      if (d && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) return;
      if (String(window.getSelection() ?? "").length > 0) return;
      clearSelection();
    },
    [selectionActive, viewMode, clearSelection],
  );
  const shownIds = useMemo(() => shown.map((e) => e.id), [shown]);
  const filteredIds = useMemo(() => filtered.map((e) => e.id), [filtered]);
  // The grid's and the table's order — Results registers its own, so this one
  // stands down while it draws (see `useSelectionOrder`).
  useSelectionOrder(viewMode === "results" ? null : shownIds);
  // What the visible view DRAWS, for "select all loaded". The grid and the
  // table are drawn here; Results publishes its own.
  const setDrawnIds = useSetAtom(libraryDrawnIdsAtom);
  const drawnIds = useAtomValue(libraryDrawnIdsAtom);
  useEffect(() => {
    if (viewMode === "cards" || viewMode === "list") setDrawnIds(shownIds);
    else if (viewMode === "map") setDrawnIds([]);
  }, [viewMode, shownIds, setDrawnIds]);

  // Escape clears — except where Escape already means something: a text field,
  // a dialog, an open menu.
  useEffect(() => {
    if (!selectionActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input:not([type=checkbox]), textarea, select, [role=dialog], [role=menu], [role=listbox]")) return;
      // A popup open anywhere (the Display menu, a Select, the search tips)
      // takes this Escape to close itself; its trigger says so.
      if (document.querySelector('[aria-haspopup][aria-expanded="true"]')) return;
      clearSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectionActive, clearSelection]);

  /* `collapse`: a plain click in the VIEW with 2 or more selected ends the
     multi-selection and makes that item the one previewed, as a file manager
     does. The selection drawer passes false — its rows ARE the selection, and
     clicking one previews it without dropping the rest. */
  const selectFrom = useCallback(
    (collapse: boolean, id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
      const intent = e ? selectionIntent(e) : null;
      if (intent === "toggle") return toggleSelection(id);
      // Touch, with a selection going: a tap adds or removes (a long press
      // starts one — see useTouchSelection).
      if (e && selectionActive && lastPointerWasTouch()) return toggleSelection(id);
      if (intent === "range") return rangeSelection({ order: currentSelectionOrder(), id });
      const preview = () => {
        // A plain click anchors the next Shift range here (see setSelectionAnchorAtom).
        setAnchor(id);
        if (isMobile) {
          openEntity(id);
        } else {
          focusForPreview(id);
          setSelectedId(id);
        }
      };
      if (collapse) collapseSelection(preview);
      else preview();
    },
    [
      isMobile,
      openEntity,
      focusForPreview,
      setSelectedId,
      toggleSelection,
      rangeSelection,
      selectionActive,
      collapseSelection,
      setAnchor,
    ],
  );
  const handleSelect = useCallback(
    (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => selectFrom(true, id, e),
    [selectFrom],
  );
  const handleDrawerSelect = useCallback(
    (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => selectFrom(false, id, e),
    [selectFrom],
  );
  useTouchSelection(toggleSelection);

  // Results-tab full-text snippet: select the entity, then jump the preview's
  // document to the hit page (DocumentViewer consumes scrollToPageAtom). On
  // mobile handleSelect opens the full view; the page jump still applies.
  const handleSnippetSelect = useCallback(
    (id: string, page: number) => {
      handleSelect(id);
      setScrollToPage(page);
      setResultsActivePage({ entityId: id, page });
    },
    [handleSelect, setScrollToPage, setResultsActivePage],
  );

  // Results-tab Properties hit: open the entity preview and deep-focus the field
  // (the drawer switches to its Metadata tab and flashes the field by key).
  const handleFocusProperty = useCallback(
    (id: string, fieldKey: string) => {
      handleSelect(id);
      setFocusMetadataField({ entityId: id, fieldKey });
    },
    [handleSelect, setFocusMetadataField],
  );

  // Retry the CEJIL load — mirrors the left pane's Retry (re-runs the effect).
  // Wrapped so the memoized drawer bodies see one identity for the life of the
  // view; both setters are `useSetAtom` results, which are already stable.
  const handleClearSearch = useCallback(() => clearSearch(), [clearSearch]);
  const handleClearFacets = useCallback(() => clearFacets(), [clearFacets]);

  const handleCejilRetry = useCallback(() => {
    setCejilError(false);
    setCejilRetry((n) => n + 1);
  }, []);

  // What the TABLE row already marks in place — everything else the query hit is
  // off-row evidence (see `MatchOrigin`). Country counts only when the column is
  // ON *and this row has a value in it*: a profile field labelled "Country" can
  // match on an entity whose `country` is empty, and that cell renders an
  // em-dash — suppressing the marker there hides the only evidence there was.
  const countryColumn = listColumnOn("country");
  const rowMarkedFields = useCallback(
    (e: Entity) => (countryColumn && e.country ? TITLE_AND_COUNTRY : TITLE_ONLY),
    [countryColumn],
  );

  // The table's tracks come from `listColumns` — one entry per column, read here
  // AND by the Display menu's toggles, so a column can never be drawable but
  // unlistable (or listed but undrawable, which is what three separate edits per
  // column used to risk). The Match cell is handed in rather than imported by
  // that module: see `ListCellContext.renderMatch`.
  const listSpecs = useMemo(
    () => listColumnSpecs({ hasQuery, fieldLabels }),
    [hasQuery, fieldLabels],
  );
  const tableColumns = buildListColumns(listSpecs, listColumnOn, {
    query,
    language,
    connectionsOf: (e) => countByEntity.get(e.id) ?? 0,
    renderMatch: (e) => (
      <MatchOrigin entity={e} query={query} visibleFieldKeys={rowMarkedFields(e)} onSelect={handleSelect} />
    ),
  });

  const renderLeft = (menuTrigger?: ReactNode) => (
    // The narrow-tier gutter host (12px). The toolbar, the view lane, the time
    // brush and the footer are `bleed` bands: their grounds and rules reach the
    // pane edge and their content sits on the gutter.
    <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 bg-paper">
      {/* Toolbar */}
      <div
        className="bleed shrink-0 flex items-center gap-2 py-2 bg-parchment"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div
          ref={searchBoxRef}
          className="relative flex-1 min-w-0 flex items-center gap-1.5 h-8 py-1 pl-2 pr-2 bg-paper border border-border rounded-md
            focus-within:ring-2 focus-within:ring-ink/25 focus-within:border-ink/30 transition-all"
        >
          <Search size={14} className="text-ink-tertiary shrink-0" />
          <input
            type="text"
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            // Enter and Escape close the panel without moving focus, so a later
            // click on an ALREADY-FOCUSED box fires no focus event and the panel
            // would never come back. Clicking the box is its own request to see
            // the list again.
            onClick={() => setSearchFocused(true)}
            onBlur={() => {
              setSearchFocused(false);
              recordSearch(searchDraft);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                recordSearch(searchDraft);
                setSearchFocused(false);
              }
            }}
            placeholder="Search title & metadata"
            aria-label="Search entities"
            className="flex-1 min-w-[60px] bg-transparent text-xs font-medium placeholder:text-ink-tertiary focus:outline-none"
          />
          {searchDraft && (
            <button
              // Empties the BOX, not the search: the committed query survives so
              // the results stay usable while you retype. Dropping the search
              // itself is the chip in Active filters, or Clear all.
              onClick={() => setSearchDraft("")}
              aria-label="Clear search text"
              className="shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-tertiary hover:text-ink cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <SearchTipsPopover />
          {/* Follows FOCUS; the tips popover follows a click on its chip — which
              blurs the input, so the two can never be open at once without any
              shared state to arbitrate. */}
          <RecentSearches
            anchorRef={searchBoxRef}
            open={searchFocused}
            onPick={(q) => {
              setSearchDraft(q);
              recordSearch(q);
              setSearchFocused(false);
            }}
            onClose={() => setSearchFocused(false)}
          />
        </div>
        {/* THE number for this surface — every other row below dropped its
            count so this masthead slot is the one place it lives. Contents
            toggle between the total ("4,398 entities", "120 of 4,398 entities"
            when facets narrow) and the search form ("312 results for [“q” ×]").
            The chip is `ActiveSearchChip` — the ONE dismiss for a committed
            search — so the readout that reports the results is also where the
            search ends.

            FIXED SLOT, aligned to the SEARCH BOX it reports on. It used to be
            right-aligned, which parked it 8px from "Date added" with the whole
            240px reserve between it and the query — attached, by proximity, to
            the one thing it says nothing about. Now the reserve sits on the
            control side: the readout reads as the search box's caption and the
            gap is what separates it from the controls.

            The slot stays FIXED at 15rem, because the number swings from "82"
            on artworks to "4,398" on CEJIL and every keystroke and facet
            rewrites it. Growth runs rightward into the reserve, so Sort · View ·
            Display · Language never move. The sentence is `shrink-0`; the CHIP
            is what yields (`min-w-0`, its label truncates), so a long query can
            never push the controls.

            ALWAYS MOUNTED. While a collection is still loading there is no
            honest number to print, so the slot holds and its contents are
            empty — it never appears or disappears under the controls beside
            it. Hidden below `md` is a viewport rule, not a state one: the row
            has no room there, the same reason Sort and Language step aside
            (on a phone the Results sheet's section label still carries the
            count).

            `aria-busy` + a dim carry staleness instead of the footer's
            "updating…" word: the counts describe the set ON SCREEN, which
            during a transition is the previous query's, and a second string
            appearing beside this one would need a reserve of its own.

            ONE TREATMENT, whole sentence, both states: `text-meta
            tabular-nums text-ink-tertiary` off this element and nothing
            overriding it. The figure used to be lifted to `font-medium
            text-ink-secondary` against a tertiary unit, on the theory that it
            was the loudest thing inside the readout without outranking the row.
            At one size, weight and colour ARE the size — a heavier, darker
            numeral among lighter words reads as larger type, so the readout
            printed a number that looked like a different step of the scale from
            the words attached to it. It is one sentence and now looks like one;
            `tabular-nums` stays, because what the figure actually needs is to
            not reflow while it changes, and that was never the weight's job. */}
        <span
          aria-busy={searchPending}
          // `pe-3` is INSIDE the fixed slot: it guarantees a gap before Sort in
          // the long state too, where the chip otherwise truncates flush to the
          // slot's edge and reads as a second control pill beside "Date added".
          // The slot's outer width is untouched, so the controls still never move.
          className={`hidden md:flex items-center justify-start gap-1.5 shrink-0 w-[15rem] pe-3
            text-meta tabular-nums text-ink-tertiary transition-opacity ${
              searchPending ? "opacity-60" : "opacity-100"
            }`}
        >
          {!cejilLoading &&
            (hasQuery ? (
              <>
                <span dir="ltr" className="shrink-0 whitespace-nowrap">
                  {filtered.length.toLocaleString()}
                  {filtered.length !== matchTypeBase.length && (
                    <> of {matchTypeBase.length.toLocaleString()}</>
                  )}{" "}
                  {matchTypeBase.length === 1 ? "result" : "results"} for
                </span>
                <ActiveSearchChip className="min-w-0" />
              </>
            ) : (
              <span dir="ltr" className="truncate">
                {filtered.length.toLocaleString()}
                {filtered.length !== entities.length && (
                  <> of {entities.length.toLocaleString()}</>
                )}{" "}
                {entities.length === 1 ? "entity" : "entities"}
              </span>
            ))}
        </span>
        {/* Sort steps aside on a phone — it moves into the Display popover, where
            it costs no width. The VIEW switcher does not: cards / list / map /
            results are the point of the Library, and they were unreachable on
            mobile because this whole cluster was `hidden sm:block`. */}
        <div className="hidden sm:block">
          <Select
            value={sort}
            onChange={(v) => {
              const key = v as typeof sort;
              setSort(key);
              setSortDir(defaultSortDir(key));
            }}
            ariaLabel={t("System", "Sort")}
            // Same rows, chrome-language labels; values stay the sort keys.
            options={SORTS.map((s) => ({ ...s, label: t("System", s.label) }))}
            // Same row, same reason as the switcher: this trigger swung 47px
            // between "Title" and "Connections", shoving View, Display and
            // Language sideways on every sort change.
            steady
          />
        </div>
        {/* The switcher is a dropdown, like Sort and Language either side of it,
            so this row reads as three of one control rather than two dropdowns
            and a segmented widget. It is also the narrowest the switcher has
            been: five segments cost a fixed 156px whatever they show, while one
            trigger costs the widest label once. `steady` is what makes that
            safe — see Select. The trade is real and deliberate: every view is
            still reachable, but at two clicks rather than one, and the trigger
            names the active view where five icons couldn't. */}
        <ViewSwitcher value={viewMode} onChange={(v) => setViewMode(v as typeof viewMode)} />
        {/* Display is icon-only and ALWAYS mounted; the view-specific modifiers
            (the results layout) live inside its popover. Anything that appears and
            disappears from this row shoves every other control sideways when you
            change view — which is exactly what it used to do. */}
        <DisplayMenu />
        {/* Languages: one dropdown of fixed width (codes, not names — a "Français"
            label would resize the trigger and shift the row again). */}
        <div className="hidden md:block">
          <Select
            value={language}
            onChange={(v) => setLanguage(v as Language)}
            ariaLabel="Language"
            align="end"
            options={LANGUAGES.map((l) => ({ value: l, label: l }))}
          />
        </div>
        {menuTrigger}
      </div>

      {/* Results */}
      <div
        // A Shift+click is a range, not a text selection across the grid.
        onMouseDown={(e) => {
          if (e.shiftKey) e.preventDefault();
          groundDown.current = { x: e.clientX, y: e.clientY };
        }}
        onClick={clearOnGround}
        // A `bleed` lane: warm ground and scrollbar at the pane edge, content on
        // the gutter. Every view mode sits on it, Results included — its header
        // row and card lane carry no side padding of their own.
        className={`bleed flex-1 min-h-0 py-3 bg-warm ${
          viewMode === "map" || viewMode === "results"
            ? "flex flex-col overflow-hidden"
            : "overflow-auto"
        }`}
      >
        {cejilLoading ? (
          cejilError ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-sm text-ink-muted">
              <span>Couldn’t load the CEJIL collection.</span>
              <button
                onClick={() => setCejilRetry((n) => n + 1)}
                className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-sm text-ink-muted">
              <span className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
              Loading the full CEJIL collection…
            </div>
          )
        ) : viewMode === "map" ? (
          <div className="flex-1 min-h-0">
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
                  Loading map…
                </div>
              }
            >
              <LibraryMapView entities={filtered} />
            </Suspense>
          </div>
        ) : viewMode === "results" ? (
          // The evidence view at full width. It owns its own scroll, paging and
          // blank states (including "no query yet"), so it sits above the shared
          // empty-state branch below.
          <div className="flex-1 min-h-0">
            <ResultsMainView
              query={query}
              entities={filtered}
              source={dataSource}
              language={language}
              cejilLoading={cejilLoading}
              cejilError={cejilError}
              onRetry={handleCejilRetry}
              onFocusProperty={handleFocusProperty}
              onSelectSnippet={handleSnippetSelect}
              onSelect={handleSelect}
              selectedId={selectedId}
              onClearSearch={() => clearSearch()}
              hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
              onClearFilters={() => clearFacets()}
              matchTypeCounts={matchTypeCounts}
              totalMatches={matchTypeBase.length}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
            No entities match your filters.
          </div>
        ) : viewMode === "cards" ? (
          <div className={`grid ${cardGridCols} gap-3`}>
            {shown.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                layout="cards"
                query={query}
                selected={selectedId === e.id}
                connections={countByEntity.get(e.id) ?? 0}
                onSelect={handleSelect}
                onView={openEntity}
                selectable
              />
            ))}
          </div>
        ) : tableColumns.length === 0 ? (
          // Every column can be switched off, so "none of them" is a state the
          // table can be in — and an empty grid is not a thing to render. It
          // says so, and names the way out.
          <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
            No columns shown — pick one in Display.
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            // No selection column: the Library selects by modifier click. The
            // row carries the visually hidden checkbox for keyboards and
            // screen readers, beside its primary action.
            rowAccessory={(e) => <EntitySelectBox id={e.id} title={e.title} />}
            data={shown}
            getRowId={(e) => e.id}
            onRowClick={(row, ev) => handleSelect(row.id, ev)}
            rowAriaLabel={(e) => `Preview ${e.title}`}
            isRowSelected={(e) => selectedId === e.id}
            selectedStyle="ring"
            sort={{ key: sort, dir: sortDir }}
            onSort={(key) => setSortKey(key as typeof sort)}
            minWidthRem={34}
            density={listDensity}
          />
        )}

        {/* Not while the table has no columns to draw them in — "show more" of
            nothing is an offer to widen an empty screen. */}
        {!cejilLoading && viewMode !== "map" && viewMode !== "results" &&
          !(viewMode === "list" && tableColumns.length === 0) && shown.length < filtered.length && (
          <div className="flex justify-center pt-4">
            <button
              onClick={() => setVisibleCount((n) => n + DISPLAY_STEP)}
              className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Show more — {(filtered.length - shown.length).toLocaleString()} remaining
            </button>
          </div>
        )}
      </div>

      {/* Footer action bar. A container, so the selection's actions fold to
          their icons (each keeps its name) when the pane is too narrow for
          their labels, instead of wrapping inside a fixed-height bar. */}
      <div
        className="@container bleed shrink-0 flex items-center gap-1 h-12 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {/* The bar swaps IN PLACE between the baseline actions and the
            selection's — same bar, same height. The selection's readout, Clear
            and the tri-state select-all sit at the bar's END, in
            LibrarySelectionBar. */}
        {selectionActive ? (
          <LibrarySelectionBar
            filteredIds={filteredIds}
            loadedIds={drawnIds}
            corpus={dataSource}
            filtersSlot={<ActiveFiltersButton className="ms-2 shrink-0" />}
          />
        ) : (
          <>
            <CreateEntityButton
              preset={createPreset}
              named={createNamed}
              // No template menu on main: Create entity is one button, and the
              // form's searchable Template field (recents on top) picks any other.
              recent={[]}
              types={libraryTypes}
              onCreate={handleCreate}
            />
            <FooterButton
              icon={<Upload size={13} className="text-ink-tertiary" />}
              label="Upload PDF"
              onClick={() => uploadInputRef.current?.click()}
            />
            {/* No divider between Import and Export: one group, the CSV pair. */}
            <FooterButton
              icon={<FileUp size={13} className="text-ink-tertiary" />}
              label="Import CSV"
              onClick={() => guard(() => setImportOpen(true))}
            />
            {/* With a selection, the bar's own Export CSV exports the
                selection; without one, this exports the current results. */}
            <FooterButton
              icon={<FileDown size={13} className="text-ink-tertiary" />}
              label="Export CSV"
              onClick={handleExport}
            />
            {/* Phone: the four actions above are `hidden sm:flex`, so the bar
                there was empty — the same actions, in a sheet. */}
            <button
              type="button"
              onClick={() => setPhoneActionsOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={phoneActionsOpen}
              className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md cursor-pointer`}
            >
              <MoreHorizontal size={13} className="text-ink-tertiary" aria-hidden /> Actions
            </button>
            <ActiveFiltersButton className="ms-2" />
          </>
        )}
        {/* Not rendered: the file input Upload PDF opens. */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          hidden
          onChange={(e) => {
            handleUpload(e.target.files);
            // Cleared so choosing the same file again still fires a change.
            e.target.value = "";
          }}
        />
        {pendingUploads && (
          <UploadDocumentsModal
            files={pendingUploads}
            types={libraryTypes}
            defaultTypeId={uploadTemplateId(dataSource)}
            onUpload={startUpload}
            onClose={() => setPendingUploads(null)}
          />
        )}
        <NewImportModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImportCsv} />
        {createOpen && (
          <CreateEntityDialog
            types={libraryTypes}
            defaultTypeId={defaultTemplateId(dataSource)}
            onChoose={handleCreate}
            onClose={() => setCreateOpen(false)}
          />
        )}
        {phoneActionsOpen && (
          <ActionsSheet
            heading="Library"
            onClose={() => setPhoneActionsOpen(false)}
            actions={[
              { label: "Create entity", icon: <Plus size={14} />, onClick: () => handleCreate(createPreset) },
              { label: "Upload PDF", icon: <Upload size={14} />, onClick: () => uploadInputRef.current?.click() },
              { label: "Import CSV", icon: <FileUp size={14} />, onClick: () => guard(() => setImportOpen(true)) },
              { label: "Export CSV", icon: <FileDown size={14} />, onClick: handleExport },
            ]}
          />
        )}
      </div>
    </div>
  );

  // Results tab body — the evidence for the running search, where a search
  // opens it (the main view stays as it was). The Results view's own body at
  // drawer width, in the two layouts that read at that width.
  const resultsBody = (
    <ResultsMainView
      query={query}
      entities={filtered}
      source={dataSource}
      language={language}
      cejilLoading={cejilLoading}
      cejilError={cejilError}
      onRetry={handleCejilRetry}
      onFocusProperty={handleFocusProperty}
      onSelectSnippet={handleSnippetSelect}
      onSelect={handleSelect}
      selectedId={selectedId}
      onClearSearch={handleClearSearch}
      hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
      onClearFilters={handleClearFacets}
      matchTypeCounts={matchTypeCounts}
      totalMatches={matchTypeBase.length}
      layout={drawerResultsLayout}
      narrow
      collapseBar
      headerSlot={
        <SegmentedControl
          size="sm"
          ariaLabel="Results layout"
          value={drawerResultsLayout}
          onChange={(v) => setDrawerResultsLayout(v as DrawerResultsLayout)}
          options={[
            { id: "grouped", label: "Grouped" },
            { id: "passages", label: "Passages" },
          ]}
        />
      }
    />
  );

  const filtersDrawer = (
    // The narrow-tier gutter host (12px): the same edge as the entity preview
    // that replaces this panel when an entity is selected, so selecting one
    // does not move the tab strip.
    <div data-gutter-host className="gutter-host flex flex-col h-full min-h-0 bg-warm">
      <DrawerTabs
        tabs={[
          // DOTS, not counts. Both signals here are user-set state that is still
          // in effect while you're looking at the other panel — filters you
          // ticked, a query you typed — which is exactly what the dot is for.
          //
          // A count was the wrong instrument twice over: it can be ABSENT (no
          // filters, no query), so it mounted on first use and widened its own
          // tab, shoving Results sideways the moment you ticked a box; and the
          // number itself was never the point. "Something you set is still on
          // back there" is one bit, and the dot costs no width to say it.
          // `count` stays for inventory — see `DrawerTabs`.
          { id: "filters", label: t("System", "Filters"), dot: activeFilterCount > 0 },
          // A query that found nothing gets no dot: the tab would be pointing at
          // an empty panel. Dot means "there is something here", not "you typed".
          ...(showResultsTab
            ? [{ id: "results", label: t("System", "Results"), dot: hasQuery && filtered.length > 0 }]
            : []),
        ]}
        activeId={drawerTab}
        onChange={(id) => setDrawerTab(id as "filters" | "results")}
      />
      {/* `bleed`: it clips, so it spans the panel for the lanes inside to reach
          the edge. `pt-stack`: the one step below the strip, which pads only its top. */}
      <div className="bleed flex-1 min-h-0 overflow-hidden pt-stack">
        {drawerTab === "results" && showResultsTab ? resultsBody : <LibraryFilters />}
      </div>
    </div>
  );

  // Preview, else the selection (1 or more, unless its list was closed), else
  // a map cluster, else Filters.
  const drawer = selectedId ? (
    <EntityDrawerPreview entityId={selectedId} />
  ) : selectionActive && selectionDrawerOpen ? (
    <LibrarySelectionDrawer onSelect={handleDrawerSelect} query={query} />
  ) : selectedCluster && viewMode === "map" ? (
    <LibraryClusterDrawer />
  ) : (
    filtersDrawer
  );

  return (
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={drawer}
      defaultRightWidth={460}
      minRightWidth={DRAWER_MIN_WIDTH}
      mobileSections={[
        {
          id: "filters",
          label: "Filters",
          count: activeFilterCount || undefined,
          // Both bodies are written for a gutter host (the drawer); the sheet
          // gives them one.
          content: (
            <div data-gutter-host className="gutter-host h-full min-h-0 flex flex-col">
              <LibraryFilters />
            </div>
          ),
        },
        // Same rule on a phone: the Results section is a second copy of the
        // main pane when that pane is already the Results view.
        ...(showResultsTab
          ? [
              {
                id: "results",
                label: "Results",
                count: hasQuery ? filtered.length : undefined,
                content: (
                  <div data-gutter-host className="gutter-host h-full min-h-0 flex flex-col">
                    {resultsBody}
                  </div>
                ),
              },
            ]
          : []),
      ]}
    />
  );
}


function FooterButton({
  icon,
  label,
  onClick,
  lead = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  /** The bar's lead action (at most one); the rest are ghosts. */
  lead?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${lead ? BAR_LEAD : BAR_GHOST} rounded-md transition-colors cursor-pointer`}
    >
      {icon}
      {label}
    </button>
  );
}
