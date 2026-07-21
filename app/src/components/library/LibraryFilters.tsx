import { useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Play, Search, Lock, Globe, X, ChevronRight, Link2, type LucideIcon } from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../atoms/dataSource";
import { getEntityType } from "../../data/entities";
import type { ChainFacetDef } from "../../data/cejil/chainFacets";
import { languageAtom } from "../../atoms/language";
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
  clearLibraryFiltersAtom,
  type FacetMode,
} from "../../atoms/library";
import { typeHasDocument } from "../../data/entityProfiles";
import { cejilSettings } from "../../data/cejil/settings";
import {
  entityCountries,
  libraryInheritedDefs,
  entityInheritedValues,
} from "../../utils/libraryFacets";
import {
  cejilChainFacetDefs,
  buildActiveChains,
  cejilChainGraph,
} from "../../data/cejil/chainFacets";
import {
  matchesAll,
  buildSearchIndex,
  chainFacetCounts,
  entityIsDoc,
  type LibraryFilterState,
} from "../../utils/libraryFilter";
import { highlightTerms } from "../../utils/queryTokens";
import { Checkbox } from "../shared/Checkbox";
import { ActiveFiltersSheet } from "./ActiveFiltersSheet";

/** Carded, grouped facets matching the Uwazi library filters: a "Filters" pill,
 *  bordered facet cards, an expandable Documents group, a keyword-style
 *  Countries card (AND/OR + search, faceted counts), and a Clear at the bottom. */
export function LibraryFilters() {
  const entities = useAtomValue(libraryEntitiesAtom);
  const types = useAtomValue(libraryTypesAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const language = useAtomValue(languageAtom);
  const query = useAtomValue(libraryQueryAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const [countryMode, setCountryMode] = useAtom(libraryCountryModeAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const [descriptorMode, setDescriptorMode] = useAtom(libraryDescriptorModeAtom);
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);

  const inheritedDefs = useMemo(
    () => libraryInheritedDefs(dataSource, language),
    [dataSource, language],
  );
  const chainDefs = useMemo(
    () => (dataSource === "cejil" ? cejilChainFacetDefs() : []),
    [dataSource],
  );
  const searchIndex = useMemo(() => buildSearchIndex(entities), [entities]);

  // The shared filter state — each facet's aggregation counts entities passing
  // every OTHER active filter (excluding its own dimension), so the numbers are
  // true faceted aggregations that react to the rest of the query.
  const filterState = useMemo<LibraryFilterState>(() => {
    const on = (rec: Record<string, boolean>) =>
      Object.entries(rec).filter(([, v]) => v).map(([k]) => k);
    const inherited = Object.entries(inheritedFilters)
      .map(([propId, vals]) => ({
        def: inheritedDefs.find((d) => d.propId === propId),
        values: new Set(on(vals)),
      }))
      .filter((f) => f.def && f.values.size > 0) as {
      def: (typeof inheritedDefs)[number];
      values: Set<string>;
    }[];
    return {
      source: dataSource,
      language,
      typeIds: on(typeFilters),
      hasDocOnly,
      wantPublished: !!statusFilters.published,
      wantRestricted: !!statusFilters.restricted,
      countries: on(countryFilters),
      countryMode,
      descriptors: on(descriptorFilters),
      descriptorMode,
      fromMs: dateFrom ? Date.parse(dateFrom) : null,
      toMs: dateTo ? Date.parse(dateTo) + 86_400_000 - 1 : null,
      inherited,
      chains: buildActiveChains(chainFilters, dataSource === "cejil" ? cejilChainGraph() : null),
      q: query.trim().toLowerCase(),
      searchIndex,
      searchTerms: highlightTerms(query).map((t) => t.toLowerCase()),
      fullTextSearch: query.trim().length >= 3,
    };
  }, [
    dataSource, language, inheritedDefs, searchIndex, typeFilters, hasDocOnly,
    statusFilters, countryFilters, countryMode, descriptorFilters, descriptorMode,
    dateFrom, dateTo, inheritedFilters, chainFilters, query,
  ]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entities)
      if (matchesAll(e, filterState, "type")) m[e.typeId] = (m[e.typeId] ?? 0) + 1;
    return m;
  }, [entities, filterState]);
  const docCount = useMemo(
    () =>
      entities.filter((e) => matchesAll(e, filterState, "doc") && entityIsDoc(e, dataSource)).length,
    [entities, filterState, dataSource],
  );
  const statusBase = useMemo(
    () => entities.filter((e) => matchesAll(e, filterState, "status")),
    [entities, filterState],
  );
  const publishedCount = useMemo(() => statusBase.filter((e) => e.published).length, [statusBase]);
  const restrictedCount = statusBase.length - publishedCount;
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entities)
      if (matchesAll(e, filterState, "country"))
        for (const c of entityCountries(e, language)) m.set(c, (m.get(c) ?? 0) + 1);
    return m;
  }, [entities, filterState, language]);
  const descriptorCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of entities)
      if (matchesAll(e, filterState, "descriptor"))
        for (const d of e.descriptors ?? []) m.set(d, (m.get(d) ?? 0) + 1);
    return m;
  }, [entities, filterState]);
  const inheritedCounts = useMemo(() => {
    const m: Record<string, Map<string, number>> = {};
    for (const { propId } of inheritedDefs) m[propId] = new Map();
    for (const e of entities) {
      if (!matchesAll(e, filterState, "inherited")) continue;
      for (const def of inheritedDefs)
        for (const v of entityInheritedValues(e, def, language, dataSource))
          m[def.propId].set(v, (m[def.propId].get(v) ?? 0) + 1);
    }
    return m;
  }, [entities, filterState, inheritedDefs, language, dataSource]);
  // Relationship-chain facet counts (path-coupled). CEJIL only; empty otherwise.
  const chainCounts = useMemo(() => {
    const graph = dataSource === "cejil" ? cejilChainGraph() : null;
    const m: Record<string, Map<string, number>> = {};
    if (!graph) return m;
    for (const def of chainDefs) m[def.key] = chainFacetCounts(entities, filterState, def, graph);
    return m;
  }, [entities, filterState, chainDefs, dataSource]);
  const chainHasAny = chainDefs.some(
    (d) =>
      (chainCounts[d.key]?.size ?? 0) > 0 ||
      Object.values(chainFilters[d.key] ?? {}).some(Boolean),
  );

  const nonDocTypes = types.filter((t) => !typeHasDocument(t.id));
  const docTypes = types.filter((t) => typeHasDocument(t.id));

  const toggleType = (id: string) => setTypeFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStatus = (id: string) => setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCountry = (c: string) => setCountryFilters((prev) => ({ ...prev, [c]: !prev[c] }));
  const toggleDescriptor = (d: string) => setDescriptorFilters((prev) => ({ ...prev, [d]: !prev[d] }));
  // One clear, shared with the footer readout (clearLibraryFiltersAtom). This
  // used to be a local copy that forgot the search box, while the view's copy
  // forgot the AND/OR modes — the two had already drifted.
  const clearAll = useSetAtom(clearLibraryFiltersAtom);
  const toggleChain = (key: string, value: string) =>
    setChainFilters((s) => ({
      ...s,
      [key]: { ...(s[key] ?? {}), [value]: !s[key]?.[value] },
    }));
  // Date presets with faceted counts (relative to the newest dated entity that
  // passes the other filters) — quick ranges that read like aggregations.
  const datePresets = useMemo<DatePreset[]>(() => {
    const dated: number[] = [];
    let maxY = -Infinity;
    for (const e of entities) {
      if (!e.createdAt || !matchesAll(e, filterState, "date")) continue;
      const ts = Date.parse(e.createdAt);
      dated.push(ts);
      const y = new Date(ts).getUTCFullYear();
      if (y > maxY) maxY = y;
    }
    if (dated.length === 0) return [];
    const spans = [
      { label: "Last year", years: 1 },
      { label: "Last 5 years", years: 5 },
      { label: "Last 10 years", years: 10 },
    ];
    return spans.map(({ label, years }) => {
      const fromY = maxY - years + 1;
      const fromMs = Date.parse(`${fromY}-01-01`);
      const toMs = Date.parse(`${maxY}-12-31`) + 86_400_000 - 1;
      const count = dated.reduce((n, ts) => n + (ts >= fromMs && ts <= toMs ? 1 : 0), 0);
      return { label, from: `${fromY}-01-01`, to: `${maxY}-12-31`, count };
    });
  }, [entities, filterState]);
  const hasDates = datePresets.length > 0;
  const toggleInherited = (propId: string, value: string) =>
    setInheritedFilters((s) => ({
      ...s,
      [propId]: { ...(s[propId] ?? {}), [value]: !s[propId]?.[value] },
    }));

  const [docOpen, setDocOpen] = useState(true);
  // CEJIL filter groups (e.g. "Documentos") — expanded by default.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const groupNames =
    dataSource === "cejil"
      ? cejilSettings.filters.filter((n) => n.items).map((n) => n.name)
      : [];
  const cejilHasGroup = groupNames.length > 0;
  const setAllGroups = (open: boolean) => {
    setOpenGroups(Object.fromEntries(groupNames.map((n) => [n, open])));
    setDocOpen(open);
  };
  const collapseAll = () => setAllGroups(false);
  const expandAll = () => setAllGroups(true);
  const groupActive = (ids: string[]) => ids.length > 0 && ids.every((id) => typeFilters[id]);
  const toggleGroup = (ids: string[]) => {
    const turnOff = groupActive(ids);
    setTypeFilters((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = !turnOff;
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-warm">
      {/* Active-filter summary — count + Clear all. The "Filters" label itself
          now lives in the drawer tab (and the mobile sheet title), so the old
          "Filters" pill was removed to stop it doubling up. This panel is still
          the ONLY place active filters live: the chip row that used to sit above
          the results was a block that appeared and vanished, shoving the whole
          result set up and down. Filters are set here, so they are read here —
          the ticked boxes already say what's on; this row totals them and offers
          the way out. It only mounts when something is active, so with no filters
          the facet cards sit flush under the tabs. */}
      {activeFilterCount > 0 && (
        <div
          className="shrink-0 flex items-center gap-2 px-3.5 py-2"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <span className="inline-flex items-center gap-1.5 text-[11px] text-ink-tertiary tabular-nums">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: "var(--accent-blue)" }}
            />
            {activeFilterCount} active
          </span>
          <button
            onClick={clearAll}
            className="ms-auto px-2 h-6 text-[11px] font-medium rounded-md text-ink-tertiary
              hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Facet cards — top padding matches the main content (py-3) so the first
          block lines up with the first library card. */}
      <div className="flex-1 overflow-auto px-3.5 pt-3 pb-3 space-y-2">
        <FacetCard title="Status">
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

        {dataSource === "cejil" ? (
          <>
            {/* CEJIL: the curated summa.cejil.org filter config — top-level
                templates + the expandable "Documentos" group. */}
            <FacetCard title="Type">
              {cejilSettings.filters.map((node) => {
                if (!node.items) {
                  return (
                    <FacetRow
                      key={node.id}
                      checked={!!typeFilters[node.id!]}
                      onToggle={() => toggleType(node.id!)}
                      label={node.name}
                      count={typeCounts[node.id!] ?? 0}
                      reserveGutter={cejilHasGroup}
                      bold
                    />
                  );
                }
                const ids = node.items.map((c) => c.id!).filter(Boolean);
                const open = openGroups[node.name] ?? true;
                const total = ids.reduce((s, id) => s + (typeCounts[id] ?? 0), 0);
                return (
                  <div key={node.name}>
                    <FacetRow
                      checked={groupActive(ids)}
                      onToggle={() => toggleGroup(ids)}
                      label={node.name}
                      count={total}
                      expandable
                      expanded={open}
                      onExpand={() => setOpenGroups((p) => ({ ...p, [node.name]: !open }))}
                      bold
                    />
                    {open && (
                      <TreeChildren>
                        {node.items.map((c) => (
                          <FacetRow
                            key={c.id}
                            checked={!!typeFilters[c.id!]}
                            onToggle={() => toggleType(c.id!)}
                            label={c.name}
                            count={typeCounts[c.id!] ?? 0}
                            child
                          />
                        ))}
                      </TreeChildren>
                    )}
                  </div>
                );
              })}
            </FacetCard>
            <KeywordFacetCard
              title="Descriptores"
              counts={descriptorCounts}
              selected={descriptorFilters}
              onToggle={toggleDescriptor}
              onClear={() => setDescriptorFilters({})}
              mode={descriptorMode}
              onModeChange={setDescriptorMode}
              sort="count"
              hideWhenEmpty
            />
          </>
        ) : (
          <>
            <FacetCard title="Type">
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
              {docOpen && (
                <TreeChildren>
                  {docTypes.map((t) => (
                    <FacetRow
                      key={t.id}
                      checked={!!typeFilters[t.id]}
                      onToggle={() => toggleType(t.id)}
                      label={t.name}
                      count={typeCounts[t.id] ?? 0}
                      child
                    />
                  ))}
                </TreeChildren>
              )}
            </FacetCard>
          </>
        )}

        <KeywordFacetCard
          title="Countries"
          counts={countryCounts}
          selected={countryFilters}
          onToggle={toggleCountry}
          onClear={() => setCountryFilters({})}
          mode={countryMode}
          onModeChange={setCountryMode}
          sort="alpha"
        />

        {inheritedDefs.map(({ propId, label }) => (
          <KeywordFacetCard
            key={propId}
            title={label}
            counts={inheritedCounts[propId] ?? new Map()}
            selected={inheritedFilters[propId] ?? {}}
            onToggle={(v) => toggleInherited(propId, v)}
            onClear={() => setInheritedFilters((s) => ({ ...s, [propId]: {} }))}
            sort="count"
            hideWhenEmpty
          />
        ))}

        {chainHasAny && (
          <div className="space-y-2">
            {/* Chain-filter group: a relationship path the facets traverse. The
                breadcrumb shows the full path; the segments these facets filter
                are emphasised. Selections combine path-coupled. */}
            <div className="px-1.5 pt-1 space-y-1">
              <span className="block text-sm font-bold text-ink">
                {chainDefs[0].groupLabel}
              </span>
              <p className="text-[11px] text-ink-tertiary leading-snug">
                {chainDefs[0].groupDescription}
              </p>
              <ChainPathHelper defs={chainDefs} />
            </div>
            {chainDefs.map((def) => (
              <KeywordFacetCard
                key={def.key}
                title={def.label}
                counts={chainCounts[def.key] ?? new Map()}
                selected={chainFilters[def.key] ?? {}}
                onToggle={(v) => toggleChain(def.key, v)}
                onClear={() => setChainFilters((s) => ({ ...s, [def.key]: {} }))}
                sort="count"
                hideWhenEmpty
              />
            ))}
          </div>
        )}

        {hasDates && (
          <DateRangeCard
            from={dateFrom}
            to={dateTo}
            presets={datePresets}
            onFrom={setDateFrom}
            onTo={setDateTo}
            onSetRange={(f, t) => {
              setDateFrom(f);
              setDateTo(t);
            }}
            onClear={() => {
              setDateFrom("");
              setDateTo("");
            }}
          />
        )}
      </div>

      {/* What's actually ON — a sheet across the foot of the panel. The facet
          cards above say what you COULD filter by; scrolling them to find the
          four boxes you ticked isn't reading your query. This is the query. */}
      <ActiveFiltersSheet />

      {/* Footer — Collapse all / Expand all (left) + Clear (right). */}
      <div
        className="shrink-0 flex items-center gap-2 h-12 px-3.5"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={collapseAll}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-ink-secondary bg-warm hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
        >
          Collapse all
        </button>
        <button
          onClick={expandAll}
          className="px-3 py-1.5 text-xs font-medium rounded-md text-ink-secondary bg-warm hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
        >
          Expand all
        </button>
        <button
          onClick={clearAll}
          disabled={activeFilterCount === 0}
          className="ms-auto px-3 py-1.5 text-xs font-medium rounded-md text-ink-secondary bg-warm hover:bg-parchment hover:text-ink transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-warm"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/* ── Cards & rows ── */

/** Soft-lifted card (no hard border) — bg-paper on the warm rail, defined by a
 *  subtle shadow like the app's other cards. */
const FACET_CARD = "bg-paper rounded-lg p-1.5 shadow-sm";

/** `title` gives the card the same bold header the keyword cards (Countries,
 *  Descriptores) carry, so every filter block reads as one titled system. */
function FacetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className={FACET_CARD}>
      {title && (
        <div className="px-2 pt-1 pb-0.5">
          <span className="text-sm font-bold text-ink">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}

/** Visual helper above a chain-filter group: the relationship path the facets
 *  traverse, as a breadcrumb (root › hop › hop …). The path nodes these facets
 *  actually filter are emphasised in carbon, so it's clear which point along the
 *  chain each card narrows. */
function ChainPathHelper({ defs }: { defs: ChainFacetDef[] }) {
  const { segments, rootTypeId } = defs[0];
  const facetIdx = new Set(defs.map((d) => d.segmentIndex));
  // Path nodes line up with tuple indices: [root, seg0, seg1, …].
  const nodes = [
    getEntityType(rootTypeId)?.name ?? "…",
    ...segments.map((s) => s.label ?? s.toTypeId ?? s.relationType),
  ];
  return (
    <div className="flex items-center flex-wrap gap-x-0.5 gap-y-0.5">
      <Link2 size={10} className="text-carbon shrink-0 me-0.5" />
      {nodes.map((n, i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <ChevronRight size={10} className="text-ink-muted shrink-0" />}
          <span
            className={`text-[11px] ${
              facetIdx.has(i) ? "font-semibold text-carbon" : "text-ink-tertiary"
            }`}
          >
            {n}
          </span>
        </span>
      ))}
    </div>
  );
}

/** Indented children of an expandable row, connected by a vertical tree guide
 *  line. The line sits at the parent checkbox's left edge (≈1.6rem in) and the
 *  children indent one consistent step past it, so the line reads as "these
 *  belong to the row above" and the child checkboxes form their own column. */
function TreeChildren({ children }: { children: ReactNode }) {
  return (
    <div className="relative ps-[2.375rem]">
      {/* Slim group line in the parent's checkbox column (≈1.25rem). Child rows
          drop their own padding so their checkboxes align under the parent's
          LABEL (≈2.375rem) — mirroring the parent row one level in. */}
      <span
        aria-hidden
        className="absolute inset-y-1 start-[1.25rem] w-px bg-border"
      />
      {children}
    </div>
  );
}

/** Row: solid-triangle expander (expandable parents only) · checkbox · optional
 *  status icon · label · bold count. Top-level rows reserve a triangle gutter so
 *  every checkbox aligns in one column; `child` rows drop the gutter (the tree
 *  line provides the indent). */
function FacetRow({
  checked,
  onToggle,
  label,
  count,
  icon,
  child,
  bold,
  expandable,
  expanded,
  onExpand,
  reserveGutter,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  icon?: LucideIcon;
  child?: boolean;
  bold?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
  /** Reserve the chevron gutter even when this row has no chevron — set on every
   *  row in a card that contains an expandable row, so they all stay aligned.
   *  Cards with no expandable rows skip it, so the checkbox starts flush. */
  reserveGutter?: boolean;
}) {
  const Icon = icon;
  return (
    <label
      className={`flex items-center rounded-md py-1.5 pe-2 cursor-pointer hover:bg-warm transition-colors ${
        child ? "ps-0" : expandable || reserveGutter ? "ps-0" : "ps-2"
      }`}
    >
      {/* Chevron gutter — reserved only in cards that have an expandable row, so
          checkboxes there align; the triangle itself renders for expandable
          parents. justify-start: the triangle hugs the row's start edge so it
          sits optically balanced between the card border and the label. */}
      {!child && (expandable || reserveGutter) && (
        <span className="shrink-0 w-3 me-0.5 flex items-center justify-start">
          {expandable && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onExpand?.();
              }}
              aria-label={expanded ? "Collapse" : "Expand"}
              className="flex items-center justify-center text-ink-tertiary hover:text-ink cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 rounded"
            >
              <Play
                size={8}
                fill="currentColor"
                className={`transition-transform ${expanded ? "rotate-90" : ""}`}
              />
            </button>
          )}
        </span>
      )}
      <Checkbox checked={checked} onChange={onToggle} ariaLabel={label} />
      <span className="flex-1 min-w-0 flex items-center gap-1.5 ms-2.5">
        {Icon && <Icon size={13} className="text-ink-tertiary shrink-0" />}
        <span className={`truncate text-sm ${bold ? "text-ink" : "text-ink-secondary"}`}>{label}</span>
      </span>
      <span className={`shrink-0 text-sm tabular-nums ${bold ? "font-bold text-ink" : "font-semibold text-ink-secondary"}`}>
        {count}
      </span>
    </label>
  );
}

/* ── Keyword facet card (Countries · Descriptores) ──
   One searchable, multi-select property facet: header with title + Any/All mode
   + a per-card Clear, a search box, and a count-tagged checkbox list. Shared so
   the library's keyword facets behave exactly like the relationships ones. */

const KEYWORD_CAP = 6;

function KeywordFacetCard({
  title,
  counts,
  selected,
  onToggle,
  onClear,
  mode,
  onModeChange,
  sort,
  hideWhenEmpty = false,
}: {
  title: string;
  counts: Map<string, number>;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onClear: () => void;
  mode?: FacetMode;
  onModeChange?: (m: FacetMode) => void;
  sort: "alpha" | "count";
  hideWhenEmpty?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const q = search.trim().toLowerCase();

  // Items with a non-zero faceted count, plus any selected (so a selection never
  // disappears under the current facet base).
  const list = useMemo(() => {
    const names = new Set<string>([...counts.keys()].filter((c) => (counts.get(c) ?? 0) > 0));
    for (const c of Object.keys(selected)) if (selected[c]) names.add(c);
    return [...names].sort((a, b) =>
      sort === "count"
        ? (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b)
        : a.localeCompare(b),
    );
  }, [counts, selected, sort]);

  const matched = q ? list.filter((c) => c.toLowerCase().includes(q)) : list;
  const cap = q || showAll ? Infinity : KEYWORD_CAP;
  const visible = matched.slice(0, cap);
  const hidden = matched.length - visible.length;
  const selectedCount = Object.values(selected).filter(Boolean).length;

  if (hideWhenEmpty && list.length === 0) return null;

  return (
    <div className={`${FACET_CARD} space-y-1.5`}>
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-bold text-ink truncate">{title}</span>
          {selectedCount > 0 && (
            <span className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-carbon/10 text-[10px] font-semibold text-carbon tabular-nums">
              {selectedCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {selectedCount > 0 && (
            <button
              onClick={onClear}
              className="inline-flex items-center gap-0.5 text-[11px] text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
            >
              <X size={11} />
              Clear
            </button>
          )}
          {mode && onModeChange && (
            <div className="inline-flex items-center gap-0.5 bg-warm rounded-md p-0.5">
              {(["AND", "OR"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => onModeChange(m)}
                  className={`px-2 h-5 rounded text-[10px] font-bold tracking-wide transition-colors cursor-pointer ${
                    mode === m ? "bg-vellum text-ink" : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </span>
      </div>

      <div className="px-1">
        <div className="relative flex items-center gap-1.5 h-8 px-2 bg-warm border border-border rounded-md focus-within:ring-2 focus-within:ring-carbon/20 focus-within:border-carbon/40 transition-all">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            aria-label={`Search ${title.toLowerCase()}`}
            className="flex-1 min-w-0 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
          />
          {search ? (
            <button
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="shrink-0 text-ink-muted hover:text-ink cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : (
            <Search size={14} className="text-ink-muted shrink-0" />
          )}
        </div>
      </div>

      <div className="max-h-64 overflow-auto">
        {visible.length === 0 ? (
          <p className="px-2 py-1 text-xs text-ink-muted">No matches.</p>
        ) : (
          visible.map((c) => {
            const checked = !!selected[c];
            return (
              <label
                key={c}
                className={`flex items-center gap-2.5 py-1 px-2 rounded-sm transition-colors cursor-pointer ${
                  checked ? "bg-carbon/[0.04] hover:bg-carbon/[0.07]" : "hover:bg-warm"
                }`}
              >
                <Checkbox checked={checked} onChange={() => onToggle(c)} ariaLabel={c} />
                <span className={`flex-1 truncate text-sm ${checked ? "text-ink font-medium" : "text-ink-secondary"}`}>
                  {c}
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-secondary">
                  {counts.get(c) ?? 0}
                </span>
              </label>
            );
          })
        )}
        {hidden > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="px-2 py-1 text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
          >
            Load {hidden} more
          </button>
        )}
        {showAll && !q && matched.length > KEYWORD_CAP && (
          <button
            onClick={() => setShowAll(false)}
            className="px-2 py-1 text-xs font-medium text-ink-tertiary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Date-range card — the entity's representative date (Uwazi DateFilter). ── */

export interface DatePreset {
  label: string;
  from: string; // yyyy-mm-dd
  to: string;
  count: number;
}

function DateRangeCard({
  from,
  to,
  presets,
  onFrom,
  onTo,
  onSetRange,
  onClear,
}: {
  from: string;
  to: string;
  presets: DatePreset[];
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSetRange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const active = !!from || !!to;
  return (
    <div className={`${FACET_CARD} space-y-1.5`}>
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <span className="text-sm font-bold text-ink">Date</span>
        {active && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-0.5 text-[11px] text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </div>
      {presets.length > 0 && (
        <div className="px-1 flex flex-col gap-0.5">
          {presets.map((p) => {
            const isActive = from === p.from && to === p.to;
            return (
              <button
                key={p.label}
                onClick={() => (isActive ? onClear() : onSetRange(p.from, p.to))}
                className={`flex items-center justify-between gap-2 px-1.5 py-1 rounded-sm text-sm transition-colors cursor-pointer ${
                  isActive ? "bg-carbon/[0.06] text-ink font-medium" : "text-ink-secondary hover:bg-warm"
                }`}
              >
                <span className="truncate">{p.label}</span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-ink-tertiary">
                  {p.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div className="px-1 flex items-center gap-1.5">
        <DateBox value={from} onChange={onFrom} ariaLabel="From date" />
        <span className="text-ink-tertiary text-xs shrink-0">→</span>
        <DateBox value={to} onChange={onTo} ariaLabel="To date" />
      </div>
    </div>
  );
}

function DateBox({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="flex-1 min-w-0 h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all cursor-pointer"
    />
  );
}
