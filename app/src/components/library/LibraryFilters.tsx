import { useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { ChevronRight, Search, Lock, Globe, type LucideIcon } from "lucide-react";
import { entitiesAtom } from "../../atoms/entities";
import { languageAtom } from "../../atoms/language";
import {
  libraryQueryAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryCountryModeAtom,
  libraryActiveFilterCountAtom,
} from "../../atoms/library";
import { entityTypes } from "../../data/entities";
import { typeHasDocument } from "../../data/entityProfiles";
import { entityCountries } from "../../utils/libraryFacets";
import { Checkbox } from "../shared/Checkbox";

/** Carded, grouped facets matching the Uwazi library filters: a "Filters" pill,
 *  bordered facet cards, an expandable Documents group, a keyword-style
 *  Countries card (AND/OR + search, faceted counts), and a Clear at the bottom. */
export function LibraryFilters() {
  const entities = useAtomValue(entitiesAtom);
  const language = useAtomValue(languageAtom);
  const query = useAtomValue(libraryQueryAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entities) m[e.typeId] = (m[e.typeId] ?? 0) + 1;
    return m;
  }, [entities]);
  const docCount = useMemo(
    () => entities.filter((e) => typeHasDocument(e.typeId)).length,
    [entities],
  );
  const publishedCount = useMemo(() => entities.filter((e) => e.published).length, [entities]);
  const restrictedCount = entities.length - publishedCount;

  // Entities matching every OTHER facet (type / has-doc / search) — the base over
  // which country counts are computed, so the Countries facet reacts to the rest.
  const activeTypeIds = Object.entries(typeFilters).filter(([, on]) => on).map(([id]) => id);
  const q = query.trim().toLowerCase();
  const baseEntities = useMemo(
    () =>
      entities.filter(
        (e) =>
          (activeTypeIds.length === 0 || activeTypeIds.includes(e.typeId)) &&
          (!hasDocOnly || typeHasDocument(e.typeId)) &&
          (!q || e.title.toLowerCase().includes(q)),
      ),
    [entities, activeTypeIds.join(","), hasDocOnly, q],
  );
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of baseEntities) for (const c of entityCountries(e, language)) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [baseEntities, language]);

  const nonDocTypes = entityTypes.filter((t) => !typeHasDocument(t.id));
  const docTypes = entityTypes.filter((t) => typeHasDocument(t.id));

  const toggleType = (id: string) => setTypeFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStatus = (id: string) => setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCountry = (c: string) => setCountryFilters((prev) => ({ ...prev, [c]: !prev[c] }));
  const clearAll = () => {
    setTypeFilters({});
    setHasDocOnly(false);
    setStatusFilters({});
    setCountryFilters({});
  };

  const [docOpen, setDocOpen] = useState(true);

  return (
    <div className="flex flex-col h-full min-h-0 bg-warm">
      {/* Filters pill — header padding matches the entity-view DrawerTabs. */}
      <div className="shrink-0 px-3.5 py-2">
        <span className="inline-flex items-center px-3 h-7 text-[13px] font-semibold text-ink bg-vellum rounded-md">
          Filters
        </span>
      </div>

      {/* Facet cards */}
      <div className="flex-1 overflow-auto px-3.5 pb-3 space-y-2">
        <FacetCard>
          <FacetRow
            checked={!!statusFilters.restricted}
            onToggle={() => toggleStatus("restricted")}
            label="Restricted"
            icon={Lock}
            count={restrictedCount}
            bold
          />
          <FacetRow
            checked={!!statusFilters.published}
            onToggle={() => toggleStatus("published")}
            label="Published"
            icon={Globe}
            count={publishedCount}
            bold
          />
        </FacetCard>

        <FacetCard>
          {nonDocTypes.map((t) => (
            <FacetRow
              key={t.id}
              checked={!!typeFilters[t.id]}
              onToggle={() => toggleType(t.id)}
              label={t.name}
              count={typeCounts[t.id] ?? 0}
              bold
            />
          ))}
        </FacetCard>

        <FacetCard>
          <FacetRow
            checked={hasDocOnly}
            onToggle={() => setHasDocOnly((v) => !v)}
            label="Documents"
            count={docCount}
            expandable
            expanded={docOpen}
            onExpand={() => setDocOpen((o) => !o)}
            bold
          />
          {docOpen &&
            docTypes.map((t) => (
              <FacetRow
                key={t.id}
                checked={!!typeFilters[t.id]}
                onToggle={() => toggleType(t.id)}
                label={t.name}
                count={typeCounts[t.id] ?? 0}
                indent
              />
            ))}
        </FacetCard>

        <CountriesCard counts={countryCounts} selected={countryFilters} onToggle={toggleCountry} />
      </div>

      {/* Clear — action-bar height (h-12) matches the entity-view drawer. */}
      <div
        className="shrink-0 flex items-center h-12 px-3.5"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={clearAll}
          disabled={activeFilterCount === 0}
          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer
            text-ink-secondary bg-paper hover:bg-parchment hover:text-ink disabled:opacity-40 disabled:cursor-default disabled:hover:bg-paper"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/* ── Cards & rows ── */

function FacetCard({ children }: { children: ReactNode }) {
  return <div className="bg-paper border border-border/60 rounded-lg p-1.5">{children}</div>;
}

/** Row: chevron (expandable only) · checkbox · label · count. Balanced left/right
 *  padding; the whole row is a rounded inset hover target so the title and its
 *  count read as one unit. Children indent so their checkbox sits to the right
 *  of the parent's. */
function FacetRow({
  checked,
  onToggle,
  label,
  count,
  icon,
  indent,
  bold,
  expandable,
  expanded,
  onExpand,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  icon?: LucideIcon;
  indent?: boolean;
  bold?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}) {
  const Icon = icon;
  return (
    <label
      className={`flex items-center rounded-sm py-1 pe-2 cursor-pointer hover:bg-warm transition-colors ${
        indent ? "ps-10" : expandable ? "ps-1" : "ps-2"
      }`}
    >
      {/* Chevron only for expandable rows; otherwise the checkbox stays flush to
          the card padding (no empty gutter). Tight to the checkbox (me-1). */}
      {expandable && !indent && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onExpand?.();
          }}
          aria-label={expanded ? "Collapse" : "Expand"}
          className="shrink-0 me-1 flex items-center justify-center w-4 h-4 rounded text-ink-tertiary hover:text-ink cursor-pointer
            focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
        >
          <ChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      )}
      <Checkbox checked={checked} onChange={onToggle} ariaLabel={label} />
      <span className="flex-1 min-w-0 flex items-center gap-1.5 ms-2.5">
        <span className={`truncate text-sm ${bold ? "text-ink" : "text-ink-secondary"}`}>{label}</span>
        {Icon && <Icon size={13} className="text-ink-tertiary shrink-0" />}
      </span>
      <span className={`shrink-0 text-sm tabular-nums ${bold ? "font-bold text-ink" : "font-medium text-ink-tertiary"}`}>
        {count}
      </span>
    </label>
  );
}

/* ── Countries keyword card ── */

function CountriesCard({
  counts,
  selected,
  onToggle,
}: {
  counts: Map<string, number>;
  selected: Record<string, boolean>;
  onToggle: (c: string) => void;
}) {
  const [mode, setMode] = useAtom(libraryCountryModeAtom);
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();

  // Show countries with a non-zero faceted count, plus any selected (so a
  // selection never disappears), sorted alphabetically.
  const list = useMemo(() => {
    const names = new Set<string>([...counts.keys()].filter((c) => (counts.get(c) ?? 0) > 0));
    for (const c of Object.keys(selected)) if (selected[c]) names.add(c);
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [counts, selected]);
  const visible = q ? list.filter((c) => c.toLowerCase().includes(q)) : list;

  return (
    <div className="bg-paper border border-border/60 rounded-lg p-1.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <span className="text-sm font-bold text-ink">Countries</span>
        <div className="inline-flex items-center gap-0.5 bg-warm rounded-md p-0.5">
          {(["AND", "OR"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 h-5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                mode === m ? "bg-vellum text-ink" : "text-ink-tertiary hover:text-ink-secondary"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="px-1">
        <div className="relative flex items-center gap-1.5 h-8 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            aria-label="Search countries"
            className="flex-1 min-w-0 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
          />
          <Search size={14} className="text-ink-muted shrink-0" />
        </div>
      </div>

      <div>
        {visible.length === 0 ? (
          <p className="px-2 py-1 text-xs text-ink-muted">No countries match.</p>
        ) : (
          visible.map((c) => (
            <label
              key={c}
              className="flex items-center gap-2.5 py-1 px-2 rounded-sm hover:bg-warm transition-colors cursor-pointer"
            >
              <Checkbox checked={!!selected[c]} onChange={() => onToggle(c)} ariaLabel={c} />
              <span className="flex-1 truncate text-sm text-ink-secondary">{c}</span>
              <span className="shrink-0 text-sm font-medium tabular-nums text-ink-tertiary">
                {counts.get(c) ?? 0}
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
