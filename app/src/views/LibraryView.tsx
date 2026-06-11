import { useMemo, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Search, X, LayoutGrid, List, Map as MapIcon, Plus, Upload, FileSpreadsheet } from "lucide-react";
import { entitiesAtom } from "../atoms/entities";
import { referencesAtom } from "../atoms/references";
import { languageAtom, type Language } from "../atoms/language";
import { appViewAtom } from "../atoms/navigation";
import { breakpointAtom } from "../atoms/viewport";
import { openEntityAtom, focusEntityForPreviewAtom } from "../atoms/focusedEntity";
import {
  libraryQueryAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryCountryModeAtom,
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

export function LibraryView() {
  const entities = useAtomValue(entitiesAtom);
  const references = useAtomValue(referencesAtom);
  const [query, setQuery] = useAtom(libraryQueryAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const countryMode = useAtomValue(libraryCountryModeAtom);
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

  const isMobile = breakpoint === "mobile";

  const countByEntity = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of references) {
      m.set(r.sourceEntityId, (m.get(r.sourceEntityId) ?? 0) + 1);
      m.set(r.targetEntityId, (m.get(r.targetEntityId) ?? 0) + 1);
    }
    return m;
  }, [references]);

  const activeTypeIds = Object.entries(typeFilters)
    .filter(([, on]) => on)
    .map(([id]) => id);
  const activeCountries = Object.entries(countryFilters)
    .filter(([, on]) => on)
    .map(([c]) => c);
  const wantPublished = !!statusFilters.published;
  const wantRestricted = !!statusFilters.restricted;
  const statusActive = wantPublished || wantRestricted;
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    const list = entities.filter(
      (e) =>
        (activeTypeIds.length === 0 || activeTypeIds.includes(e.typeId)) &&
        (!hasDocOnly || typeHasDocument(e.typeId)) &&
        (!statusActive || (wantPublished && e.published) || (wantRestricted && !e.published)) &&
        matchesCountries(entityCountries(e, language), activeCountries, countryMode) &&
        (!q || e.title.toLowerCase().includes(q)),
    );
    const sorted = [...list];
    if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "connections")
      sorted.sort((a, b) => (countByEntity.get(b.id) ?? 0) - (countByEntity.get(a.id) ?? 0));
    else sorted.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")); // recent first
    return sorted;
  }, [entities, activeTypeIds.join(","), hasDocOnly, wantPublished, wantRestricted, statusActive, activeCountries.join(","), countryMode, language, q, sort, countByEntity]);

  const toggleType = (id: string) => setTypeFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStatus = (id: string) => setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCountry = (c: string) => setCountryFilters((prev) => ({ ...prev, [c]: !prev[c] }));

  // Tap-to-preview on desktop/tablet; tap-to-open on mobile (no side drawer).
  // Previewing focuses the entity so the drawer's tabbed bodies (Relationships /
  // Files / Document read the focused + scoped atoms) reflect it immediately.
  const handleSelect = (id: string) => {
    if (isMobile) {
      openEntity(id);
    } else {
      focusForPreview(id);
      setSelectedId(id);
    }
  };

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
            placeholder="Search"
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

        {viewMode === "map" ? (
          <div className="flex-1 min-h-0">
            <LibraryMapView entities={filtered} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
            No entities match your filters.
          </div>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                layout="cards"
                selected={selectedId === e.id}
                onSelect={() => handleSelect(e.id)}
                onView={() => openEntity(e.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((e) => (
              <EntityCard
                key={e.id}
                entity={e}
                layout="list"
                selected={selectedId === e.id}
                onSelect={() => handleSelect(e.id)}
                onView={() => openEntity(e.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer action bar */}
      <div
        className="shrink-0 flex items-center gap-2 h-12 px-3 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <FooterButton icon={<Plus size={13} className="text-ink-tertiary" />} label="Create entity" />
        <FooterButton icon={<Upload size={13} className="text-ink-tertiary" />} label="Upload PDF" />
        <FooterButton
          icon={<FileSpreadsheet size={13} className="text-ink-tertiary" />}
          label="Import / Export CSV"
          onClick={() => setAppView("import-csv")}
        />
        <span className="ms-2 text-[11px] text-ink-tertiary">
          Showing <span className="font-semibold text-ink-secondary">{filtered.length}</span> of {entities.length}
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
