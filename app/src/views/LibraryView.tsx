import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Search, X, LayoutGrid, List, Map as MapIcon, Plus, Upload, FileSpreadsheet } from "lucide-react";
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
  libraryActiveFilterCountAtom,
  libraryViewModeAtom,
  librarySortAtom,
  librarySelectedEntityIdAtom,
  librarySelectedClusterAtom,
} from "../atoms/library";
import { getEntityType } from "../data/entities";
import { typeHasDocument } from "../data/entityProfiles";
import { entityCountries, matchesCountries } from "../utils/libraryFacets";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { EntityCard } from "../components/library/EntityCard";
import { LibraryMapView } from "../components/library/LibraryMapView";
import { LibraryFilters } from "../components/library/LibraryFilters";
import { LibraryClusterDrawer } from "../components/library/LibraryClusterDrawer";
import { EntityDrawerPreview } from "../components/library/EntityDrawerPreview";
import { ActiveFilterChip } from "../components/shared/ActiveFilterChip";
import { Select } from "../components/shared/Select";
import { SegmentedControl } from "../components/shared/SegmentedControl";

const LANGUAGES: Language[] = ["EN", "ES", "FR", "AR"];

/** How many cards to reveal per page in the Library grid/list. */
const DISPLAY_STEP = 120;

export function LibraryView() {
  const entities = useAtomValue(libraryEntitiesAtom);
  const [dataSource, setDataSource] = useAtom(dataSourceAtom);
  const [cejilReady, setCejilReady] = useAtom(cejilReadyAtom);
  // Fetch the full CEJIL corpus on demand the first time the source is selected.
  useEffect(() => {
    if (dataSource === "cejil" && !cejilReady) {
      let alive = true;
      loadCejilData().then(() => alive && setCejilReady(true));
      return () => {
        alive = false;
      };
    }
  }, [dataSource, cejilReady, setCejilReady]);
  const cejilLoading = dataSource === "cejil" && !cejilReady;
  const references = useAtomValue(referencesAtom);
  const [query, setQuery] = useAtom(libraryQueryAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const countryMode = useAtomValue(libraryCountryModeAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);
  const [viewMode, setViewMode] = useAtom(libraryViewModeAtom);
  const [sort, setSort] = useAtom(librarySortAtom);
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
  const searchIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of entities) {
      const parts = [e.title, e.country ?? "", ...(e.fields?.map((f) => f.value) ?? []), ...(e.descriptors ?? [])];
      m.set(e.id, parts.join(" ").toLowerCase());
    }
    return m;
  }, [entities]);

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

  const filtered = useMemo(() => {
    const list = entities.filter(
      (e) =>
        (activeTypeIds.length === 0 || activeTypeIds.includes(e.typeId)) &&
        (!hasDocOnly || (dataSource === "cejil" ? e.preview === "document" : typeHasDocument(e.typeId))) &&
        (!statusActive || (wantPublished && e.published) || (wantRestricted && !e.published)) &&
        (activeCountries.length === 0 || matchesCountries(entityCountries(e, language), activeCountries, countryMode)) &&
        (activeDescriptors.length === 0 || (e.descriptors ?? []).some((d) => activeDescriptors.includes(d))) &&
        (!q || (searchIndex.get(e.id) ?? "").includes(q)),
    );
    const sorted = [...list];
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "connections")
      sorted.sort((a, b) => (countByEntity.get(b.id) ?? 0) - (countByEntity.get(a.id) ?? 0));
    else sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")); // recent first
    return sorted;
  }, [entities, dataSource, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, activeDescriptors.join(","), language, q, sort, countByEntity, searchIndex]);

  // The full CEJIL corpus is thousands of entities — cap the rendered cards and
  // let the user reveal more, so the card/list grid never paints them all at once.
  const [visibleCount, setVisibleCount] = useState(DISPLAY_STEP);
  useEffect(() => setVisibleCount(DISPLAY_STEP), [filtered]);
  const shown = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const toggleType = (id: string) => setTypeFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStatus = (id: string) => setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCountry = (c: string) => setCountryFilters((prev) => ({ ...prev, [c]: !prev[c] }));

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
        <SegmentedControl
          ariaLabel="Data source"
          value={dataSource}
          onChange={(v) => {
            setDataSource(v as typeof dataSource);
            // type/country ids differ per source — clear stale facets + preview.
            setTypeFilters({});
            setCountryFilters({});
            setStatusFilters({});
            setDescriptorFilters({});
            setSelectedId(null);
          }}
          options={[
            { id: "mock", label: "Sample" },
            { id: "cejil", label: "CEJIL" },
          ]}
        />
        <Select
          value={sort}
          onChange={(v) => setSort(v as typeof sort)}
          ariaLabel="Sort"
          options={[
            { value: "recent", label: "Date added" },
            { value: "title", label: "Title" },
            { value: "connections", label: "Connections" },
          ]}
        />
        <div className="hidden sm:block">
          <SegmentedControl
            ariaLabel="View"
            value={viewMode}
            onChange={(v) => setViewMode(v as typeof viewMode)}
            options={[
              { id: "cards", label: "Cards", icon: LayoutGrid },
              { id: "list", label: "List", icon: List },
              { id: "map", label: "Map", icon: MapIcon },
            ]}
          />
        </div>
        <div className="hidden md:flex items-center gap-1">
          {LANGUAGES.map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                language === l ? "bg-vellum text-ink" : "bg-warm text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        {menuTrigger}
      </div>

      {/* Results */}
      <div
        className={`flex-1 min-h-0 px-3 py-3 bg-warm ${
          viewMode === "map" ? "flex flex-col overflow-hidden" : "overflow-auto"
        }`}
      >
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap pb-3">
            {activeTypeIds.map((id) => (
              <ActiveFilterChip
                key={id}
                label={getEntityType(id)?.name ?? id}
                color={getEntityType(id)?.color}
                onRemove={() => toggleType(id)}
              />
            ))}
            {hasDocOnly && <ActiveFilterChip label="Has a document" onRemove={() => setHasDocOnly(false)} />}
            {wantRestricted && <ActiveFilterChip label="Restricted" onRemove={() => toggleStatus("restricted")} />}
            {wantPublished && <ActiveFilterChip label="Published" onRemove={() => toggleStatus("published")} />}
            {activeCountries.map((c) => (
              <ActiveFilterChip key={c} label={c} onRemove={() => toggleCountry(c)} />
            ))}
            {q && <ActiveFilterChip label={`“${query.trim()}”`} onRemove={() => setQuery("")} />}
          </div>
        )}

        {cejilLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-sm text-ink-muted">
            <span className="w-5 h-5 rounded-full border-2 border-border border-t-carbon animate-spin" />
            Loading the full CEJIL collection…
          </div>
        ) : viewMode === "map" ? (
          <div className="flex-1 min-h-0">
            <LibraryMapView entities={filtered} />
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
          <div className="flex flex-col gap-2">
            {shown.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                layout="list"
                selected={selectedId === e.id}
                connections={countByEntity.get(e.id) ?? 0}
                onSelect={handleSelect}
                onView={openEntity}
              />
            ))}
          </div>
        )}

        {!cejilLoading && viewMode !== "map" && shown.length < filtered.length && (
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
        <span className="ms-2 text-[11px] text-ink-tertiary">
          Showing <span className="font-semibold text-ink-secondary">{shown.length.toLocaleString()}</span> of {filtered.length.toLocaleString()}
        </span>
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
