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
} from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, cejilReadyAtom } from "../atoms/dataSource";
import { loadCejilData, cejilRelsByEntity } from "../data/cejil/load";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { appViewAtom } from "../atoms/navigation";
import { breakpointAtom } from "../atoms/viewport";
import { openEntityAtom, focusEntityForPreviewAtom } from "../atoms/focusedEntity";
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
} from "../atoms/library";
import { getEntityType, type Entity } from "../data/entities";
import { libraryInheritedDefs } from "../utils/libraryFacets";
import { buildActiveChains, cejilChainGraph } from "../data/cejil/chainFacets";
import { matchesAll, buildSearchIndex, type LibraryFilterState } from "../utils/libraryFilter";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { EntityCard } from "../components/library/EntityCard";
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
import { DisplayMenu } from "../components/library/DisplayMenu";
import { ActiveFiltersButton } from "../components/library/ActiveFiltersButton";
import { DataTable, type Column } from "../components/shared/DataTable";
import { EntityTypeChip } from "../components/shared/EntityTypeChip";
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
  const searchIndex = useMemo(() => buildSearchIndex(entities), [entities]);

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
      const rank = (e: Entity) => {
        const t = e.title.toLowerCase();
        if (t === q) return 0;
        if (t.startsWith(q)) return 1;
        if (t.includes(q)) return 2;
        return 3;
      };
      return [...list].sort((a, b) => rank(a) - rank(b) || cmp(a, b));
    }
    return [...list].sort(cmp);
  }, [entities, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), descriptorMode, fromMs, toMs, inheritedKey, chainKey, activeChains, language, q, sort, sortDir, countByEntity, searchIndex]);

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

  const tableColumns: Column<Entity>[] = [
    {
      id: "type",
      header: "Type",
      width: "3.5rem",
      sortKey: "type",
      cell: (e: Entity) => <EntityTypeChip typeId={e.typeId} />,
    },
    {
      id: "title",
      header: "Title",
      sortKey: "title",
      cell: (e: Entity) => <span className="font-medium text-ink truncate">{e.title}</span>,
    },
    info.country !== false && {
      id: "country",
      header: "Country",
      width: "9rem",
      sortKey: "country",
      cell: (e: Entity) => (
        <span className="text-ink-secondary truncate">{e.country ?? "—"}</span>
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
        className={`flex-1 min-h-0 px-3 py-3 bg-warm ${
          viewMode === "map" || viewMode === "timeline"
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

        {!cejilLoading && viewMode !== "map" && viewMode !== "timeline" && shown.length < filtered.length && (
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

  const drawer = selectedId ? (
    <EntityDrawerPreview entityId={selectedId} />
  ) : selectedCluster && viewMode === "map" ? (
    <LibraryClusterDrawer />
  ) : (
    <LibraryFilters />
  );

  return (
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={drawer}
      defaultRightWidth={460}
      minRightWidth={360}
      maxRightWidth={680}
      mobileSections={[{ id: "filters", label: "Filters", content: <LibraryFilters /> }]}
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
