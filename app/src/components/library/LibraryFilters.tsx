import { useMemo, useState, type ReactNode } from "react";
import { boundDay, boundTime, dateBoundMs, entityInRange } from "../../utils/timeline";
import type { Entity } from "../../data/entities";
import {
  CONTENT_GROUPS,
  CONTENT_GROUP_LABEL,
  CONTENT_ROWS,
  contentSelectionOf,
  entityContent,
  matchesContent,
  type ContentGroup,
} from "../../utils/entityContent";
import { templatesAtom } from "../../atoms/templates";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Play, Search, Lock, Globe, X, ChevronRight, Link2, type LucideIcon } from "lucide-react";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../atoms/dataSource";
import { libraryTemplateFacetsAtom } from "../../atoms/settingsSingletons";
import { getEntityType } from "../../data/entities";
import { languageAtom } from "../../atoms/language";
import {
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
  libraryActiveFilterCountAtom,
  clearLibraryFacetsAtom,
  matchTypeFiltersAtom,
  type FacetMode,
} from "../../atoms/library";
import { MatchModeToggle } from "../shared/MatchModeToggle";
import { cejilSettings } from "../../data/cejil/settings";
import {
  entityCountries,
  libraryInheritedDefs,
  entityInheritedValues,
} from "../../utils/libraryFacets";
import {
  chainFacetDefsFor,
  buildActiveChains,
  chainGraphFor,
  chainGroups,
  type ChainFacetDef,
} from "../../data/chainFacets";
import {
  matchesAll,
  buildSearchIndex,
  chainFacetCounts,
  type LibraryFilterState,
} from "../../utils/libraryFilter";
import { highlightTerms, parseSearchQuery } from "../../utils/queryTokens";
import { Checkbox } from "../shared/Checkbox";
import { ActiveFiltersSheet } from "./ActiveFiltersSheet";
import { BAR_GHOST } from "../shared/warmButton";
import { DateInput } from "../shared/DateInput";

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
  const hasDocOnly = useAtomValue(libraryHasDocAtom);
  const [contentFilters, setContentFilters] = useAtom(libraryContentFiltersAtom);
  const [contentMode, setContentMode] = useAtom(libraryContentModeAtom);
  const contentSelection = useMemo(() => contentSelectionOf(contentFilters), [contentFilters]);
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
  const matchTypes = useAtomValue(matchTypeFiltersAtom);

  // Recomputed when Settings › Templates changes the corpus's templates.
  const templates = useAtomValue(templatesAtom(dataSource));
  const inheritedDefs = useMemo(
    () => libraryInheritedDefs(dataSource, language),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `templates` is the store the defs are read from
    [dataSource, language, templates],
  );
  // Which template property facets show, by Uwazi's rule
  // (Library/helpers/libraryFilters.js, shared/commonProperties.js): with no
  // Type selected, only `defaultfilter` properties; with Types selected, the
  // properties every selected template filters on. The curated facets always
  // show, and so does a facet holding a selection, so it can be cleared.
  const shownDefs = useMemo(() => {
    const typeIds = Object.keys(typeFilters).filter((k) => typeFilters[k]);
    return inheritedDefs.filter(
      (d) =>
        !d.templateIds ||
        (typeIds.length ? typeIds.every((id) => d.templateIds!.includes(id)) : !!d.defaultFilter) ||
        Object.values(inheritedFilters[d.propId] ?? {}).some(Boolean),
    );
  }, [inheritedDefs, typeFilters, inheritedFilters]);
  // Relationship chains the templates declare. A chain shows by the same rule
  // as a property facet: `defaultFilter` with no Type selected, or when every
  // selected Type is its template; and while it holds a selection.
  const chainDefs = useMemo(() => chainFacetDefsFor(dataSource, templates), [dataSource, templates]);
  const shownChains = useMemo(() => {
    const typeIds = Object.keys(typeFilters).filter((k) => typeFilters[k]);
    return chainGroups(chainDefs).filter(
      (g) =>
        (typeIds.length ? typeIds.every((id) => id === g[0].rootTypeId) : g[0].defaultFilter) ||
        g.some((d) => Object.values(chainFilters[d.key] ?? {}).some(Boolean)),
    );
  }, [chainDefs, typeFilters, chainFilters]);
  const searchIndex = useMemo(() => buildSearchIndex(entities, language), [entities, language]);

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
      fromMs: dateBoundMs(dateFrom, "from"),
      toMs: dateBoundMs(dateTo, "to"),
      inherited,
      chains: buildActiveChains(chainFilters, chainDefs, chainGraphFor(dataSource)),
      q: query.trim().toLowerCase(),
      searchIndex,
      searchTerms: highlightTerms(query), // folded
      searchQuery: parseSearchQuery(query),
      fullTextSearch: query.trim().length >= 3,
      matchTypes,
      content: contentSelection,
      contentMode,
    };
  }, [
    dataSource, language, inheritedDefs, searchIndex, typeFilters, hasDocOnly,
    statusFilters, countryFilters, countryMode, descriptorFilters, descriptorMode,
    dateFrom, dateTo, inheritedFilters, chainDefs, chainFilters, query, matchTypes,
    contentSelection, contentMode,
  ]);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of entities)
      if (matchesAll(e, filterState, "type")) m[e.typeId] = (m[e.typeId] ?? 0) + 1;
    return m;
  }, [entities, filterState]);
  // The Content card: per group, the results that pass every other filter and
  // every OTHER content group, tallied by row. `contentAny` is whether the
  // collection carries content at all; without it the card is not drawn.
  const { contentCounts, contentPresent, contentAny } = useMemo(() => {
    const counts = Object.fromEntries(CONTENT_GROUPS.map((g) => [g, new Map<string, number>()])) as Record<
      ContentGroup,
      Map<string, number>
    >;
    // Rows the collection holds at all: they stay listed (at 0) when other
    // filters empty them, as the Template card's rows do, so the card does not
    // change shape under the reader.
    const present = Object.fromEntries(CONTENT_GROUPS.map((g) => [g, new Set<string>()])) as Record<
      ContentGroup,
      Set<string>
    >;
    let any = false;
    for (const e of entities) {
      const c = entityContent(e, dataSource);
      if (!c.contains?.length && !c.quotes?.length) continue;
      any = true;
      for (const g of CONTENT_GROUPS) for (const v of c[g] ?? []) present[g].add(v);
      if (!matchesAll(e, filterState, "content")) continue;
      for (const g of CONTENT_GROUPS) {
        const vals = c[g];
        if (!vals?.length || !matchesContent(c, contentSelection, contentMode, g)) continue;
        for (const v of vals) counts[g].set(v, (counts[g].get(v) ?? 0) + 1);
      }
    }
    return { contentCounts: counts, contentPresent: present, contentAny: any };
  }, [entities, filterState, dataSource, contentSelection, contentMode]);
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
    for (const { propId } of shownDefs) m[propId] = new Map();
    for (const e of entities) {
      if (!matchesAll(e, filterState, "inherited")) continue;
      for (const def of shownDefs)
        for (const v of entityInheritedValues(e, def, language, dataSource))
          m[def.propId].set(v, (m[def.propId].get(v) ?? 0) + 1);
    }
    return m;
  }, [entities, filterState, shownDefs, language, dataSource]);
  // Relationship-chain facet counts (path-coupled), for the chains on show.
  const chainCounts = useMemo(() => {
    const graph = chainGraphFor(dataSource);
    const m: Record<string, Map<string, number>> = {};
    if (!graph) return m;
    for (const group of shownChains)
      for (const def of group) m[def.key] = chainFacetCounts(entities, filterState, def, graph);
    return m;
  }, [entities, filterState, shownChains, dataSource]);
  const chainHasAny = (group: ChainFacetDef[]) =>
    group.some(
      (d) =>
        (chainCounts[d.key]?.size ?? 0) > 0 ||
        Object.values(chainFilters[d.key] ?? {}).some(Boolean),
    );

  // The Template facet follows Settings › Filters: only the templates it
  // shows, in its order. CEJIL also takes its groups; the Sample keeps its
  // Documents card and lists grouped templates flat.
  const facetNodes = useAtomValue(libraryTemplateFacetsAtom);
  const shownOrder = new Map(
    facetNodes.flatMap((n) => (n.kind === "group" ? n.ids : [n.id])).map((id, i) => [id, i] as const),
  );
  const matched = types
    .filter((t) => shownOrder.has(t.id))
    .sort((a, b) => shownOrder.get(a.id)! - shownOrder.get(b.id)!);
  // Saved filters that name none of this corpus's types list every type, as
  // Uwazi does when `settings.filters` is empty.
  const shownTypes = matched.length ? matched : types;
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

  const toggleType = (id: string) => setTypeFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleStatus = (id: string) => setStatusFilters((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleCountry = (c: string) => setCountryFilters((prev) => ({ ...prev, [c]: !prev[c] }));
  const toggleDescriptor = (d: string) => setDescriptorFilters((prev) => ({ ...prev, [d]: !prev[d] }));
  // One clear, shared with the footer readout. Clears the FACETS and keeps the
  // query: the search box has its own X, and wiping someone's query from a
  // "Clear" under the facet list is not what that button looks like it does.
  // used to be a local copy that forgot the search box, while the view's copy
  // forgot the AND/OR modes — the two had already drifted.
  const clearAll = useSetAtom(clearLibraryFacetsAtom);
  const toggleChain = (key: string, value: string) =>
    setChainFilters((s) => ({
      ...s,
      [key]: { ...(s[key] ?? {}), [value]: !s[key]?.[value] },
    }));
  // Date presets with faceted counts (relative to the newest dated entity that
  // passes the other filters) — quick ranges that read like aggregations.
  const datePresets = useMemo<DatePreset[]>(() => {
    const dated: Entity[] = [];
    let maxY = -Infinity;
    for (const e of entities) {
      if (!e.createdAt || !matchesAll(e, filterState, "date")) continue;
      dated.push(e);
      const y = new Date(Date.parse(e.createdAt)).getUTCFullYear();
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
      // The filter's own test, so a preset's count is what it returns.
      const count = dated.reduce((n, e) => n + (entityInRange(e, fromMs, toMs) ? 1 : 0), 0);
      return { label, from: `${fromY}-01-01`, to: `${maxY}-12-31`, count };
    });
  }, [entities, filterState]);
  const hasDates = datePresets.length > 0;
  // Time fields only where records are timed to the hour (Nepal events).
  const hasHours = useMemo(() => entities.some((e) => e.span?.hour), [entities]);
  const toggleInherited = (propId: string, value: string) =>
    setInheritedFilters((s) => ({
      ...s,
      [propId]: { ...(s[propId] ?? {}), [value]: !s[propId]?.[value] },
    }));

  // CEJIL filter groups (e.g. "Documentos") — expanded by default.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const groupNames =
    dataSource === "cejil" ? facetNodes.flatMap((n) => (n.kind === "group" ? [n.name] : [])) : [];
  const cejilHasGroup = groupNames.length > 0;
  const setAllGroups = (open: boolean) => {
    setOpenGroups(Object.fromEntries(groupNames.map((n) => [n, open])));
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
    <div data-component="LibraryFilters" className="flex flex-col h-full min-h-0 bg-warm">
      {/* No active-filter summary row here: the count rides as a BADGE on the
          "Filters" drawer tab, and "Clear" lives in this panel's footer. A row
          that mounts on first tick shoved every facet card down; reserving a
          permanent band for something usually absent just traded the shift for
          dead space. The facet cards sit flush under the tabs at all times. */}
      {/* Facet cards — top padding matches the main content (py-3) so the first
          block lines up with the first library card. */}
      {/* A scroll lane on the host's gutter (12px, the same edge as the entity
          preview that takes this drawer slot); `px-3.5` retired. */}
      <div data-part="facets" className="bleed flex-1 overflow-auto pt-3 pb-3 space-y-1.5">
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
            <FacetCard title="Template">
              {facetNodes.map((node) => {
                if (node.kind === "template") {
                  return (
                    <FacetRow
                      key={node.id}
                      checked={!!typeFilters[node.id]}
                      onToggle={() => toggleType(node.id)}
                      label={typeName(node.id)}
                      count={typeCounts[node.id] ?? 0}
                      reserveGutter={cejilHasGroup}
                      bold
                    />
                  );
                }
                const ids = node.ids;
                const open = openGroups[node.name] ?? true;
                const total = ids.reduce((s, id) => s + (typeCounts[id] ?? 0), 0);
                return (
                  <div key={node.name} data-part="facet-group" role="group" aria-label={node.name}>
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
                        {ids.map((id) => (
                          <FacetRow
                            key={id}
                            checked={!!typeFilters[id]}
                            onToggle={() => toggleType(id)}
                            label={typeName(id)}
                            count={typeCounts[id] ?? 0}
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
            {/* Every template, documents included: what a record CONTAINS is
                the Content card's question now, not the Template card's. */}
            <FacetCard title="Template">
              {shownTypes.map((t) => (
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
          </>
        )}

        {contentAny && (
          <ContentCard
            key={dataSource}
            counts={contentCounts}
            present={contentPresent}
            selected={contentFilters}
            mode={contentMode}
            onModeChange={setContentMode}
            onToggle={(g, id) =>
              setContentFilters((prev) => ({ ...prev, [g]: { ...(prev[g] ?? {}), [id]: !prev[g]?.[id] } }))
            }
            onClear={() => {
              setContentFilters({});
              setContentMode("OR");
            }}
          />
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
          hideWhenEmpty={dataSource === "nepal"}
        />

        {shownDefs.map(({ propId, label }) => (
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

        {shownChains.filter(chainHasAny).map((group) => (
          <section key={group[0].chainId} data-part="chain-group" className="space-y-1.5">
            {/* Chain-filter group: a relationship path the facets traverse. The
                breadcrumb shows the full path; the segments these facets filter
                are emphasised. Selections combine path-coupled. */}
            <header data-part="chain-header" className="px-1.5 pt-1 space-y-1">
              <h2 className="block text-tab font-semibold text-ink">
                {group[0].groupLabel}
              </h2>
              <p className="text-meta text-ink-tertiary leading-snug">
                {group[0].groupDescription}
              </p>
              <ChainPathHelper defs={group} />
            </header>
            {group.map((def) => (
              <KeywordFacetCard
                key={def.key}
                title={def.label}
                counts={chainCounts[def.key] ?? new Map()}
                selected={chainFilters[def.key] ?? {}}
                onToggle={(v) => toggleChain(def.key, v)}
                onClear={() => setChainFilters((s) => ({ ...s, [def.key]: {} }))}
                sort="count"
                hideWhenEmpty
                headingLevel={3}
              />
            ))}
          </section>
        ))}

        {hasDates && (
          <DateRangeCard
            from={dateFrom}
            to={dateTo}
            presets={datePresets}
            hasHours={hasHours}
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
      <footer
        data-part="footer"
        /* `bg-paper`, like every other drawer footer (the entity preview's takes
           this same slot), so the footer meets the gutter. */
        className="bleed shrink-0 flex items-center gap-2 h-12 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {/* Ghosts (`BAR_GHOST`): nothing here commits, so nothing is filled.
            The end boxes meet the gutter, so the hover fill stays inside. */}
        <button
          type="button"
          data-part="collapse-all"
          data-gutter-align="box"
          onClick={collapseAll}
          className={FOOTER_BUTTON}
        >
          Collapse all
        </button>
        <button
          type="button"
          data-part="expand-all"
          onClick={expandAll}
          className={FOOTER_BUTTON}
        >
          Expand all
        </button>
        <button
          type="button"
          data-part="clear"
          data-gutter-align="box"
          onClick={clearAll}
          disabled={activeFilterCount === 0}
          className={`ms-auto ${FOOTER_BUTTON} disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-ink-secondary`}
        >
          Clear
        </button>
      </footer>
    </div>
  );
}

const FOOTER_BUTTON = `px-3 py-1.5 text-xs font-medium rounded-md ${BAR_GHOST} transition-colors cursor-pointer`;

/* ── Cards & rows ── */

/** `bg-paper` on the warm rail, and nothing else — no border, no shadow. The
 *  paper-against-warm step is the whole definition; a stack of these reads as a
 *  column of blocks rather than a column of outlined boxes, which is the calmer
 *  of the two on a rail that already carries the pane's own `border-l`.
 *
 *  Both of the other treatments were tried and dropped. `shadow-sm` claimed to
 *  match "the app's other cards" and didn't — every other `shadow-sm` here is a
 *  floating or media surface (the SegmentedTabs thumb, DocPlaceholder,
 *  the EntityTypeTag swatch, the file thumbnails and modal media) — and it barely read in
 *  dark, where `--shadow-sm` is one 20%-black pixel over a near-black rail. The
 *  hairline border that replaced it read as too much fence for a filter list. */
const FACET_CARD = "bg-paper rounded-lg p-1.5";

/** `title` gives the card the same bold header the keyword cards (Countries,
 *  Descriptores) carry, so every filter block reads as one titled system. */
function FacetCard({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section data-component="FacetCard" className={FACET_CARD}>
      {title && (
        <header data-part="header" className="px-2 pt-1 pb-1.5">
          {/* `pb-1.5`: the same 6px from header to first item as the keyword
              cards, whose `space-y-1.5` puts their search box there. */}
          <h2 data-part="title" className="text-tab font-semibold text-ink">{title}</h2>
        </header>
      )}
      {children}
    </section>
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
    <div data-component="ChainPathHelper" className="flex items-center flex-wrap gap-x-0.5 gap-y-0.5">
      <Link2 size={10} aria-hidden className="text-carbon shrink-0 me-0.5" />
      {nodes.map((n, i) => (
        <span key={i} data-part="node" className="inline-flex items-center">
          {i > 0 && <ChevronRight size={10} aria-hidden className="text-ink-muted shrink-0" />}
          <span
            data-state={facetIdx.has(i) ? "filtered" : undefined}
            className={`text-meta ${
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
    <div data-component="TreeChildren" className="relative ps-[2.375rem]">
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

/** ONE row metric for every facet list in this panel — Status, Type (and its
 *  tree), and the keyword cards (Countries, Descriptores, inherited props) — in
 *  the drawer and the phone sheet alike. The whole label + checkbox row is the
 *  target, so it takes no touch-target floor of its own: `min-h-11` below `md`
 *  made Status/Type rows 44px in the sheet while the keyword rows beside them
 *  stayed 28px. */
const FACET_ROW = "flex items-center py-1 cursor-pointer transition-colors";

/** Row: solid-triangle expander (expandable parents only) · checkbox · optional
 *  status icon · label · bold count. Top-level rows reserve a triangle gutter so
 *  every checkbox aligns in one column; `child` rows drop the gutter (the tree
 *  line provides the indent). */
/* ── Content card ──
   What a record carries and how it is stored (utils/entityContent.ts). Groups
   in card order, each a small heading over rows; a group shows only the rows
   the results hold, and a group with none is not drawn, so the card is as long
   as the collection's content is varied. The first group is open; the rest
   sit behind one "More" row unless one of them holds a selection. */
function ContentCard({
  counts,
  present,
  selected,
  mode,
  onModeChange,
  onToggle,
  onClear,
}: {
  counts: Record<ContentGroup, Map<string, number>>;
  /** Rows the collection holds, whatever the other filters leave. */
  present: Record<ContentGroup, Set<string>>;
  selected: Record<string, Record<string, boolean>>;
  mode: "AND" | "OR";
  onModeChange: (m: "AND" | "OR") => void;
  onToggle: (group: ContentGroup, id: string) => void;
  onClear: () => void;
}) {
  const [more, setMore] = useState(false);
  const isOn = (g: ContentGroup) => Object.values(selected[g] ?? {}).some(Boolean);
  const rowsOf = (g: ContentGroup): { id: string; label: string; hint?: string }[] => {
    if (g === "language") {
      const ids = new Set([...present.language, ...Object.keys(selected.language ?? {}).filter((k) => selected.language[k])]);
      return [...ids]
        // Alphabetical, Other last: an order by count would reshuffle the rows
        // each time another filter changes the counts.
        .sort((a, b) => Number(a === "Other") - Number(b === "Other") || a.localeCompare(b))
        .map((id) => ({ id, label: id }));
    }
    return CONTENT_ROWS[g].filter((row) => present[g].has(row.id) || selected[g]?.[row.id]);
  };
  const groups = CONTENT_GROUPS.filter((g) => rowsOf(g).length > 0);
  const [first, ...rest] = groups;
  const showRest = more || rest.some(isOn);
  const selectedCount = CONTENT_GROUPS.reduce(
    (n, g) => n + Object.values(selected[g] ?? {}).filter(Boolean).length,
    0,
  );

  const group = (g: ContentGroup) => (
    <div key={g} data-part="content-group" data-group={g} role="group" aria-label={CONTENT_GROUP_LABEL[g]}>
      <div className="flex items-center justify-between gap-2 px-2 pt-1.5 pb-0.5">
        <h3 data-part="group-title" className="text-meta font-medium text-ink-tertiary">
          {CONTENT_GROUP_LABEL[g]}
        </h3>
        {g === "contains" && rowsOf(g).length > 1 && (
          <MatchModeToggle mode={mode} onChange={onModeChange} groupLabel="Match mode for Contains" />
        )}
      </div>
      {rowsOf(g).map((row) => (
        <FacetRow
          key={row.id}
          checked={!!selected[g]?.[row.id]}
          onToggle={() => onToggle(g, row.id)}
          label={row.label}
          hint={row.hint}
          count={counts[g].get(row.id) ?? 0}
          bold
        />
      ))}
    </div>
  );

  return (
    <section data-component="ContentCard" className={FACET_CARD}>
      <header data-part="header" className="flex items-center justify-between gap-2 px-2 pt-1">
        <h2 data-part="title" className="text-tab font-semibold text-ink">Content</h2>
        {selectedCount > 0 && (
          <button
            type="button"
            data-part="clear"
            onClick={onClear}
            aria-label="Clear Content"
            className="inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} aria-hidden />
            Clear
          </button>
        )}
      </header>
      {/* Nothing ticked and nothing in these results: one line, not a column
          of zeros. */}
      {first && (selectedCount > 0 || CONTENT_GROUPS.some((g) => counts[g].size > 0)) ? (
        <>
          {group(first)}
          {showRest && rest.map(group)}
          {rest.length > 0 && !rest.some(isOn) && (
            <button
              type="button"
              data-part="more"
              aria-expanded={showRest}
              onClick={() => setMore((m) => !m)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 mt-0.5 rounded-md text-meta text-ink-secondary hover:text-ink hover:bg-warm text-start cursor-pointer"
            >
              <Play size={8} fill="currentColor" aria-hidden className={`shrink-0 transition-transform ${showRest ? "-rotate-90" : "rotate-90"}`} />
              <span className="truncate">
                {showRest ? "Fewer" : `More: ${rest.map((g) => CONTENT_GROUP_LABEL[g]).join(", ")}`}
              </span>
            </button>
          )}
        </>
      ) : (
        <p data-part="empty" className="px-2 py-2 text-meta text-ink-tertiary">
          No files, images or media in these results.
        </p>
      )}
    </section>
  );
}

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
  hint,
}: {
  /** A second line under the label, for a row whose name needs a reason. */
  hint?: string;
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
      data-component="FacetRow"
      data-state={checked ? "checked" : "unchecked"}
      className={`${FACET_ROW} rounded-md pe-2 hover:bg-warm ${
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
              type="button"
              data-part="expand"
              onClick={(e) => {
                e.preventDefault();
                onExpand?.();
              }}
              aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
              aria-expanded={expanded}
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
        <span className="min-w-0 flex flex-col">
          <span data-part="label" className={`truncate text-tab ${bold ? "text-ink" : "text-ink-secondary"}`}>{label}</span>
          {hint && <span data-part="hint" className="text-meta text-ink-tertiary leading-snug">{hint}</span>}
        </span>
      </span>
      <span data-part="count" className={`shrink-0 text-tab tabular-nums ${bold ? "font-semibold text-ink" : "font-semibold text-ink-secondary"}`}>
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
  headingLevel = 2,
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
  /** 3 inside the chain-filter group, which carries its own `h2`. */
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
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
    <section data-component="KeywordFacetCard" className={`${FACET_CARD} space-y-1.5`}>
      <header data-part="header" className="flex items-center justify-between gap-2 px-2 pt-1">
        <span className="flex items-center gap-1.5 min-w-0">
          <Heading data-part="title" className="text-tab font-semibold text-ink truncate">{title}</Heading>
          {selectedCount > 0 && (
            <span data-part="selected-count" className="shrink-0 inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-carbon/10 text-meta font-semibold text-carbon tabular-nums">
              {selectedCount}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {selectedCount > 0 && (
            <button
              type="button"
              data-part="clear"
              onClick={onClear}
              aria-label={`Clear ${title}`}
              className="inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
            >
              <X size={11} aria-hidden />
              Clear
            </button>
          )}
          {mode && onModeChange && (
            <MatchModeToggle
              mode={mode}
              onChange={onModeChange}
              groupLabel={`Match mode for ${title}`}
            />
          )}
        </span>
      </header>

      <div data-part="search" className="px-1">
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
              type="button"
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

      <div data-part="options" className="max-h-64 overflow-auto">
        {visible.length === 0 ? (
          <p className="px-2 py-1 text-xs text-ink-tertiary">No matches.</p>
        ) : (
          visible.map((c) => {
            const checked = !!selected[c];
            return (
              <label
                key={c}
                data-part="option"
                data-state={checked ? "checked" : "unchecked"}
                className={`${FACET_ROW} gap-2.5 px-2 rounded-sm ${
                  checked ? "bg-carbon/[0.04] hover:bg-carbon/[0.07]" : "hover:bg-warm"
                }`}
              >
                <Checkbox checked={checked} onChange={() => onToggle(c)} ariaLabel={c} />
                <span className={`flex-1 truncate text-tab ${checked ? "text-ink font-medium" : "text-ink-secondary"}`}>
                  {c}
                </span>
                <span className="shrink-0 text-tab font-semibold tabular-nums text-ink-secondary">
                  {counts.get(c) ?? 0}
                </span>
              </label>
            );
          })
        )}
        {hidden > 0 && (
          <button
            type="button"
            data-part="load-more"
            onClick={() => setShowAll(true)}
            className="px-2 py-1 text-xs font-medium text-ink-secondary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
          >
            Load {hidden} more
          </button>
        )}
        {showAll && !q && matched.length > KEYWORD_CAP && (
          <button
            type="button"
            data-part="show-less"
            onClick={() => setShowAll(false)}
            className="px-2 py-1 text-xs font-medium text-ink-tertiary underline underline-offset-2 hover:text-ink transition-colors cursor-pointer"
          >
            Show less
          </button>
        )}
      </div>
    </section>
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
  hasHours = false,
  onFrom,
  onTo,
  onSetRange,
  onClear,
}: {
  from: string;
  to: string;
  presets: DatePreset[];
  hasHours?: boolean;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
  onSetRange: (from: string, to: string) => void;
  onClear: () => void;
}) {
  const active = !!from || !!to;
  return (
    <section data-component="DateRangeCard" className={`${FACET_CARD} space-y-1.5`}>
      <header data-part="header" className="flex items-center justify-between gap-2 px-2 pt-1">
        <h2 data-part="title" className="text-tab font-semibold text-ink">Date</h2>
        {active && (
          <button
            type="button"
            data-part="clear"
            aria-label="Clear date"
            onClick={onClear}
            className="inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} />
            Clear
          </button>
        )}
      </header>
      {presets.length > 0 && (
        <div data-part="presets" className="px-1 flex flex-col gap-0.5">
          {presets.map((p) => {
            const isActive = from === p.from && to === p.to;
            return (
              <button
                type="button"
                key={p.label}
                data-part="preset"
                aria-pressed={isActive}
                onClick={() => (isActive ? onClear() : onSetRange(p.from, p.to))}
                className={`flex items-center justify-between gap-2 px-1.5 py-1 rounded-sm text-tab transition-colors cursor-pointer ${
                  isActive ? "bg-carbon/[0.06] text-ink font-medium" : "text-ink-secondary hover:bg-warm"
                }`}
              >
                <span className="truncate">{p.label}</span>
                <span className="shrink-0 text-tab font-semibold tabular-nums text-ink-tertiary">
                  {p.count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <div data-part="range" className="px-1 flex items-center gap-1.5">
        <DateBox value={boundDay(from)} onChange={(d) => onFrom(withTime(d, boundTime(from)))} ariaLabel="From date" />
        <span aria-hidden className="text-ink-tertiary text-xs shrink-0">→</span>
        <DateBox value={boundDay(to)} onChange={(d) => onTo(withTime(d, boundTime(to)))} ariaLabel="To date" />
      </div>
      {hasHours && (
        /* Same columns as the dates above, so each time sits under its day.
           A time needs its day: the field waits for one. */
        <div data-part="times" className="px-1 flex items-center gap-1.5">
          <TimeBox value={boundTime(from)} disabled={!from} onChange={(t) => onFrom(withTime(boundDay(from), t))} ariaLabel="From time" />
          <span aria-hidden className="invisible text-xs shrink-0">→</span>
          <TimeBox value={boundTime(to)} disabled={!to} onChange={(t) => onTo(withTime(boundDay(to), t))} ariaLabel="To time" />
        </div>
      )}
    </section>
  );
}

/** A day plus an optional "HH:MM": the bound the date atoms hold. */
const withTime = (day: string, time: string) => (day && time ? `${day}T${time}` : day);

/** Hours and minutes for a bound, in UTC like the records. Empty = the whole
 *  day. */
function TimeBox({
  value,
  onChange,
  ariaLabel,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="time"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="flex-1 min-w-0 w-full h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary tabular-nums
        focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all disabled:opacity-50"
    />
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
    <DateInput
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className="flex-1 min-w-0 w-full h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all"
    />
  );
}
