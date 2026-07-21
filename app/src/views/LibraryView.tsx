import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  Search,
  X,
  LayoutGrid,
  List,
  Map as MapIcon,
  CalendarRange,
  Plus,
  Upload,
  FileSpreadsheet,
  TextSearch,
} from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, cejilReadyAtom } from "../atoms/dataSource";
import { loadCejilData, cejilRelsByEntity } from "../data/cejil/load";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { appViewAtom } from "../atoms/navigation";
import { breakpointAtom } from "../atoms/viewport";
import { openEntityAtom, focusEntityForPreviewAtom } from "../atoms/focusedEntity";
import { scrollToPageAtom } from "../atoms/selection";
import { useNotify } from "../hooks/useNotify";
import {
  libraryQueryAtom,
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
  libraryInfoAtom,
  libraryTimeHubAtom,
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
} from "../atoms/library";
import { getEntityType, type Entity } from "../data/entities";
import { libraryInheritedDefs } from "../utils/libraryFacets";
import { buildActiveChains, cejilChainGraph } from "../data/cejil/chainFacets";
import { matchesAll, matchesSearch, buildSearchIndex, type LibraryFilterState } from "../utils/libraryFilter";
import { highlightTerms, fold } from "../utils/queryTokens";
import { matchCategories } from "../utils/librarySnippets";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { EntityCard } from "../components/library/EntityCard";
import { MatchOrigin } from "../components/library/MatchOrigin";
// Lazy: react-simple-maps + the world atlas are the heaviest static chunk in
// the bundle and only the map view needs them — split so the default Library
// (and everything else) never downloads them.
const LibraryMapView = lazy(() =>
  import("../components/library/LibraryMapView").then((m) => ({ default: m.LibraryMapView })),
);
import { LibraryTimelineView } from "../components/library/LibraryTimelineView";
import { TimeBrush } from "../components/library/TimeBrush";
import { LibraryFilters } from "../components/library/LibraryFilters";
import { LibraryClusterDrawer } from "../components/library/LibraryClusterDrawer";
import { EntityDrawerPreview } from "../components/library/EntityDrawerPreview";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { ResultsBody } from "../components/library/ResultsSnippets/ResultsBody";
import { ResultsMainView } from "../components/library/ResultsSnippets/ResultsMainView";
import { SearchTipsPopover } from "../components/library/SearchTipsPopover";
import { DisplayMenu } from "../components/library/DisplayMenu";
import { ActiveFiltersButton } from "../components/library/ActiveFiltersButton";
import { DataTable, type Column } from "../components/shared/DataTable";
import { EntityTypeChip } from "../components/shared/EntityTypeChip";
import { HighlightedText } from "../components/shared/HighlightedText";
import { Select } from "../components/shared/Select";
import { SegmentedControl } from "../components/shared/SegmentedControl";

const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

/** Sort keys — shared by the toolbar Select and (on mobile, where the Select
 *  steps aside for the view switcher) the Display popover. */
export const SORTS = [
  { value: "recent", label: "Date added" },
  { value: "title", label: "Title" },
  { value: "connections", label: "Connections" },
  { value: "type", label: "Type" },
  { value: "country", label: "Country" },
];

/** How many cards to reveal per page in the Library grid/list. */
const DISPLAY_STEP = 120;

/** Stable identities for the "what does this row already mark?" sets — a fresh
 *  literal per row would re-run every marker's match scan on every render. */
const TITLE_ONLY = ["title"] as const;
const TITLE_AND_COUNTRY = ["title", "country"] as const;

export function LibraryView() {
  const entities = useAtomValue(libraryEntitiesAtom);
  const dataSource = useAtomValue(dataSourceAtom);
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
        () => alive && setCejilReady(true),
        () => alive && setCejilError(true),
      );
      return () => {
        alive = false;
      };
    }
  }, [dataSource, cejilReady, setCejilReady, cejilRetry]);
  const cejilLoading = dataSource === "cejil" && !cejilReady;
  const references = useAtomValue(referencesAtom);
  const [query, setQuery] = useAtom(libraryQueryAtom);
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
  const info = useAtomValue(libraryInfoAtom);
  const timeHub = useAtomValue(libraryTimeHubAtom);
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
  useEffect(() => {
    // …but not when the MAIN pane is already the Results view: two copies of the
    // same evidence list side by side is one too many. The tab stays reachable;
    // it just isn't what a query auto-opens there.
    setDrawerTab(hasQuery && viewMode !== "results" ? "results" : "filters");
  }, [hasQuery, viewMode]);
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

  const filterState: LibraryFilterState = {
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
  };

  const filtered = useMemo(() => {
    const list = entities.filter((e) => matchesAll(e, filterState));
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
          const c = matchCategories(e, query, language, dataSource);
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
  }, [entities, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, fromMs, toMs, inheritedKey, chainKey, activeChains, language, q, sort, sortDir, countByEntity, searchIndex, cejilReady, matchTypes]);

  // How many entities the query matches with the FACETS widened — so the Results
  // tab can offer to reveal the ones the current facets are hiding.
  const searchMatchCount = useMemo(
    () => (q ? entities.reduce((n, e) => n + (matchesSearch(e, filterState) ? 1 : 0), 0) : 0),
    [entities, filterState, q],
  );

  // Chip counts + the pre-chip total: entities passing every filter EXCEPT the
  // match-type chips (the same faceted-aggregation pattern the facets use), then
  // categorised by where they matched.
  const matchTypeBase = useMemo(
    () => (q ? entities.filter((e) => matchesAll(e, filterState, "matchType")) : []),
    [entities, filterState, q],
  );
  const matchTypeCounts = useMemo(() => {
    const c = { title: 0, properties: 0, document: 0 };
    for (const e of matchTypeBase) {
      const m = matchCategories(e, query, language, dataSource);
      if (m.title) c.title++;
      if (m.properties) c.properties++;
      if (m.document) c.document++;
    }
    return c;
  }, [matchTypeBase, query, language, dataSource]);

  // The chips are query-relative — a new query starts from "all kinds" so they
  // never linger as an invisible filter.
  useEffect(() => {
    setMatchTypes(ALL_MATCH_TYPES);
  }, [q, setMatchTypes]);

  // The time strip rides under EVERY layout, not just the map and the timeline it
  // started under — it filters by date and charts the whole result set, so cards
  // and the table want it just as much. A display option (Display → Time strip),
  // on by default.
  const showBrush = timeHub && !cejilLoading;

  // The brush's histogram is the results with EVERY facet applied except the
  // date one — so the bars keep showing what widening the window would give back
  // (dimmed outside the range), instead of collapsing to the current selection.
  const timeChart = useMemo(
    () => (showBrush ? entities.filter((e) => matchesAll(e, filterState, "date")) : []),
    [entities, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, chainKey, activeChains, language, q, searchIndex, showBrush],
  );
  // …and the Lanes grid drops the template facet too, so drilling into one lane
  // doesn't shrink the grid to that single lane.
  const laneChart = useMemo(
    () =>
      viewMode === "timeline" && !cejilLoading
        ? entities.filter((e) => matchesAll(e, { ...filterState, typeIds: [] }, "date"))
        : [],
    [entities, dataSource, hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, inheritedKey, chainKey, activeChains, language, q, searchIndex, viewMode, cejilLoading],
  );

  // The full CEJIL corpus is thousands of entities — cap the rendered cards and
  // let the user reveal more, so the card/list grid never paints them all at once.
  const [visibleCount, setVisibleCount] = useState(DISPLAY_STEP);
  useEffect(() => setVisibleCount(DISPLAY_STEP), [filtered]);
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);


  // Tap-to-preview on desktop/tablet; tap-to-open on mobile (no side drawer).
  // Previewing focuses the entity so the drawer's tabbed bodies (Relationships /
  // Files / Document read the focused + scoped atoms) reflect it immediately.
  // Stable so memoized EntityCards don't re-render on every selection/hover.
  const handleSelect = useCallback(
    (id: string) => {
      if (isMobile) {
        openEntity(id);
      } else {
        focusForPreview(id);
        setSelectedId(id);
      }
    },
    [isMobile, openEntity, focusForPreview, setSelectedId],
  );

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
  const handleCejilRetry = useCallback(() => {
    setCejilError(false);
    setCejilRetry((n) => n + 1);
  }, []);

  // What the TABLE row already marks in place — everything else the query hit is
  // off-row evidence (see `MatchOrigin`). Country counts only when the column is
  // ON *and this row has a value in it*: a profile field labelled "Country" can
  // match on an entity whose `country` is empty, and that cell renders an
  // em-dash — suppressing the marker there hides the only evidence there was.
  const rowMarkedFields = useCallback(
    (e: Entity) => (info.country !== false && e.country ? TITLE_AND_COUNTRY : TITLE_ONLY),
    [info.country],
  );

  const tableColumns: Column<Entity>[] = [
    {
      // The type rides WITH the title, not in a column of its own.
      //
      // A column can't work here: the chip is 1.5rem but the "TYPE" header needs
      // room for its label and its sort arrow, so the track is always ~2rem wider
      // than what's in it. Left-aligned, that gap sits between the chip and the
      // title; right-aligned, it sits between the row edge and the chip. The
      // space has to go somewhere — unless the column goes.
      //
      // Sorting by type is still there, in the toolbar's Sort control.
      id: "title",
      header: "Title",
      sortKey: "title",
      cell: (e: Entity) => (
        <span className="flex items-center gap-2 min-w-0">
          <EntityTypeChip typeId={e.typeId} />
          <span className="font-medium text-ink truncate">
            <HighlightedText text={e.title} query={query} />
          </span>
        </span>
      ),
    },
    // WHERE it matched, when the row can't show it.
    //
    // Title and Country are marked in place — that mark is the evidence. A hit in
    // any other property, or in the document body, leaves the row looking
    // unmatched, which in a few thousand results is the difference between a
    // result list and a list. The column is 3.5rem of reserved track: contents
    // come and go per row as the query is refined, the track never moves. It
    // mounts only while a query is active — the one transition (no query → query)
    // that replaces every row anyway.
    hasQuery && {
      id: "match",
      header: "Match",
      width: "3.5rem",
      cell: (e: Entity) => (
        <MatchOrigin entity={e} visibleFieldKeys={rowMarkedFields(e)} onSelect={handleSelect} />
      ),
    },
    info.country !== false && {
      id: "country",
      header: "Country",
      width: "9rem",
      sortKey: "country",
      cell: (e: Entity) => (
        <span className="text-ink-secondary truncate">
          {e.country ? <HighlightedText text={e.country} query={query} /> : "—"}
        </span>
      ),
    },
    info.date !== false && {
      id: "date",
      header: "Date",
      width: "5rem",
      sortKey: "recent",
      cell: (e: Entity) => (
        <span className="text-ink-tertiary tabular-nums">
          {e.createdAt ? new Date(e.createdAt).getUTCFullYear() : "—"}
        </span>
      ),
    },
    info.connections !== false && {
      id: "connections",
      header: "Connections",
      width: "8rem",
      align: "right" as const,
      sortKey: "connections",
      cell: (e: Entity) => (
        <span className="text-ink-secondary tabular-nums">
          {(countByEntity.get(e.id) ?? 0).toLocaleString()}
        </span>
      ),
    },
  ].filter(Boolean) as Column<Entity>[];

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      {/* Toolbar */}
      <div
        className="shrink-0 flex items-center gap-2 px-3 py-2"
        style={{ borderBottom: "1px solid var(--border-primary)" }}
      >
        <div
          className="relative flex-1 min-w-0 flex items-center gap-1.5 h-8 py-1 pl-2 pr-2 bg-warm border border-border rounded-md
            focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all"
        >
          <Search size={14} className="text-ink-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search title & metadata"
            aria-label="Search entities"
            className="flex-1 min-w-[60px] bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="shrink-0 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer transition-colors"
            >
              <X size={12} />
            </button>
          )}
          <SearchTipsPopover />
        </div>
        {/* Sort steps aside on a phone — it moves into the Display popover, where
            it costs no width. The VIEW switcher does not: cards / list / map /
            timeline are the point of the Library, and they were unreachable on
            mobile because this whole cluster was `hidden sm:block`. */}
        <div className="hidden sm:block">
          <Select
            value={sort}
            onChange={(v) => {
              const key = v as typeof sort;
              setSort(key);
              setSortDir(defaultSortDir(key));
            }}
            ariaLabel="Sort"
            options={SORTS}
          />
        </div>
        <SegmentedControl
          ariaLabel="View"
          value={viewMode}
          onChange={(v) => setViewMode(v as typeof viewMode)}
          options={[
            { id: "cards", label: "Cards", icon: LayoutGrid },
            { id: "list", label: "List", icon: List },
            { id: "map", label: "Map", icon: MapIcon },
            { id: "timeline", label: "Timeline", icon: CalendarRange },
            // Always mounted, query or not. A segment that appears when you type
            // would resize the switcher and shove every control beside it — the
            // view renders its own "search to see where terms match" state.
            { id: "results", label: "Results", icon: TextSearch },
          ]}
        />
        {/* Display is icon-only and ALWAYS mounted; the view-specific modifiers
            (timeline layout) live inside its popover. Anything that appears and
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
        // Results brings its own gutters — its header is a `ListInfoRow`, which
        // carries the app's standard `px-3`. Doubling up would indent the whole
        // view past every other layout.
        className={`flex-1 min-h-0 py-3 bg-warm ${viewMode === "results" ? "" : "px-3"} ${
          viewMode === "map" || viewMode === "timeline" || viewMode === "results"
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
        ) : viewMode === "timeline" ? (
          <div className="flex-1 min-h-0">
            <LibraryTimelineView
              entities={filtered}
              chart={timeChart}
              laneChart={laneChart}
              selectedId={selectedId}
              onSelect={handleSelect}
              onView={openEntity}
              countByEntity={countByEntity}
            />
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
              onClearSearch={() => setQuery("")}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {shown.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                layout="cards"
                selected={selectedId === e.id}
                connections={countByEntity.get(e.id) ?? 0}
                onSelect={handleSelect}
                onView={openEntity}
              />
            ))}
          </div>
        ) : (
          <DataTable
            columns={tableColumns}
            data={shown}
            getRowId={(e) => e.id}
            onRowClick={(e) => handleSelect(e.id)}
            rowAriaLabel={(e) => `Select ${e.title}`}
            isRowSelected={(e) => selectedId === e.id}
            sort={{ key: sort, dir: sortDir }}
            onSort={(key) => setSortKey(key as typeof sort)}
            minWidthRem={34}
          />
        )}

        {!cejilLoading && viewMode !== "map" && viewMode !== "timeline" && viewMode !== "results" && shown.length < filtered.length && (
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

      {/* Time brush — map + timeline */}
      {showBrush && <TimeBrush entities={timeChart} />}

      {/* Footer action bar */}
      <div
        className="shrink-0 flex items-center gap-2 h-12 px-3 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <FooterButton
          icon={<Plus size={13} className="text-ink-tertiary" />}
          label="Create entity"
          onClick={() => notify("Create entity isn't available in the prototype")}
        />
        <FooterButton
          icon={<Upload size={13} className="text-ink-tertiary" />}
          label="Upload PDF"
          onClick={() => notify("Upload started")}
        />
        <FooterButton
          icon={<FileSpreadsheet size={13} className="text-ink-tertiary" />}
          label="Import / Export CSV"
          onClick={() => setAppView("import-csv")}
        />
        {/* Result status. Nothing is mounted or unmounted here — only the text
            changes — so the results above it never move. This is also the only
            place the active-filter count survives while the drawer is showing an
            entity instead of the Filters panel; clicking it puts the panel back. */}
        <span className="ms-2 text-[11px] text-ink-tertiary">
          Showing{" "}
          <span className="font-semibold text-ink-secondary">{shown.length.toLocaleString()}</span> of{" "}
          {filtered.length.toLocaleString()}
        </span>
        <ActiveFiltersButton />
      </div>
    </div>
  );

  // Results tab body — the per-entity evidence view (where each term hit).
  const resultsBody = (
    <ResultsBody
      query={query}
      entities={filtered}
      source={dataSource}
      language={language}
      cejilLoading={cejilLoading}
      cejilError={cejilError}
      onRetry={handleCejilRetry}
      onFocusProperty={handleFocusProperty}
      onSelectSnippet={handleSnippetSelect}
      onClearSearch={() => setQuery("")}
      hiddenByFilters={Math.max(0, searchMatchCount - matchTypeBase.length)}
      onClearFilters={() => clearFacets()}
      matchTypeCounts={matchTypeCounts}
      totalMatches={matchTypeBase.length}
    />
  );

  const filtersDrawer = (
    <div className="flex flex-col h-full min-h-0 bg-warm">
      <DrawerTabs
        tabs={[
          // Count rides as a badge here rather than as a row inside the panel —
          // a row that mounts on first tick shifted every facet card.
          { id: "filters", label: "Filters", count: activeFilterCount || undefined },
          { id: "results", label: "Results" },
        ]}
        activeId={drawerTab}
        onChange={(id) => setDrawerTab(id as "filters" | "results")}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        {drawerTab === "filters" ? <LibraryFilters /> : resultsBody}
      </div>
    </div>
  );

  const drawer = selectedId ? (
    <EntityDrawerPreview entityId={selectedId} />
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
      minRightWidth={360}
      mobileSections={[
        {
          id: "filters",
          label: "Filters",
          count: activeFilterCount || undefined,
          content: <LibraryFilters />,
        },
        { id: "results", label: "Results", content: resultsBody },
      ]}
    />
  );
}


function FooterButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}
