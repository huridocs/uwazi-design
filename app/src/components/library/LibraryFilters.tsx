import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { Play, Search, Lock, Globe, X, ChevronRight, Link2, Plus, type LucideIcon } from "lucide-react";
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
  libraryDescriptorFiltersAtom,
  libraryFacetMatchAtom,
  libraryRangeFiltersAtom,
  libraryFilterGroupsAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  libraryActiveFilterCountAtom,
  clearLibraryFacetsAtom,
  matchTypeFiltersAtom,
} from "../../atoms/library";
import { MatchModeToggle } from "../shared/MatchModeToggle";
import { cejilSettings } from "../../data/cejil/settings";
import {
  entityCountries,
  libraryInheritedDefs,
  libraryRangeDefs,
  entityInheritedValues,
  type LibraryRangeDef,
} from "../../utils/libraryFacets";
import { entityPropertyIntervals } from "../../utils/propertyValues";
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
  forEachFacetBase,
  activeInheritedOf,
  inheritedCarriers,
  inheritedKey,
  rangeKey,
  activeRangesOf,
  matchInterval,
  rangeBoundsOf,
  countryCarriersOf,
  descriptorCarriersOf,
  type LibraryFilterState,
  type FilterGroup,
  type LibraryMatch,
  type RangeBounds,
} from "../../utils/libraryFilter";
import { useActiveFilters } from "../../hooks/useActiveFilters";
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
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const [facetMatch, setFacetMatch] = useAtom(libraryFacetMatchAtom);
  const [rangeFilters, setRangeFilters] = useAtom(libraryRangeFiltersAtom);
  const [groups, setGroups] = useAtom(libraryFilterGroupsAtom);
  const countryMode = facetMatch.country ?? "any";
  const descriptorMode = facetMatch.descriptor ?? "any";
  const setMatch = (key: string, mode: LibraryMatch) =>
    setFacetMatch((m) => {
      const next = { ...m };
      if (mode === "any") delete next[key];
      else next[key] = mode;
      return next;
    });
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
        Object.values(inheritedFilters[d.propId] ?? {}).some(Boolean) ||
        !!facetMatch[inheritedKey(d.propId)],
    );
  }, [inheritedDefs, typeFilters, inheritedFilters, facetMatch]);
  // Numeric and date range facets, shown by the same rule as property facets.
  const rangeDefs = useMemo(
    () => libraryRangeDefs(dataSource),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `templates` is the store the defs are read from
    [dataSource, templates],
  );
  const shownRanges = useMemo(() => {
    const typeIds = Object.keys(typeFilters).filter((k) => typeFilters[k]);
    return rangeDefs.filter(
      (d) =>
        (typeIds.length ? typeIds.every((id) => d.templateIds.includes(id)) : !!d.defaultFilter) ||
        !!rangeFilters[d.name]?.from ||
        !!rangeFilters[d.name]?.to ||
        !!facetMatch[rangeKey(d.name)],
    );
  }, [rangeDefs, typeFilters, rangeFilters, facetMatch]);
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
    const inherited = activeInheritedOf(inheritedFilters, facetMatch, inheritedDefs, entities, language, dataSource);
    return {
      source: dataSource,
      language,
      typeIds: on(typeFilters),
      hasDocOnly,
      wantPublished: !!statusFilters.published,
      wantRestricted: !!statusFilters.restricted,
      countries: on(countryFilters),
      countryMode,
      countryCarriers: countryCarriersOf(entities, dataSource, language),
      descriptors: on(descriptorFilters),
      descriptorMode,
      descriptorCarriers: descriptorCarriersOf(entities, dataSource),
      fromMs: dateBoundMs(dateFrom, "from"),
      toMs: dateBoundMs(dateTo, "to"),
      inherited,
      ranges: activeRangesOf(rangeFilters, facetMatch, rangeDefs),
      groups,
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
    dateFrom, dateTo, inheritedFilters, facetMatch, rangeFilters, rangeDefs, groups, chainDefs, chainFilters, query, matchTypes,
    contentSelection, contentMode, entities,
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
  // Each keyword facet's value counts, and how many records that can carry
  // the value have none (what `missing` would keep), over the records passing
  // every other facet.
  const countryCounts = useMemo(() => {
    const m = new Map<string, number>();
    const carriers = countryCarriersOf(entities, dataSource, language);
    let missing = 0;
    for (const e of entities)
      if (matchesAll(e, filterState, "country")) {
        const vals = entityCountries(e, language);
        if (!vals.length && carriers.has(e.typeId)) missing++;
        for (const c of vals) m.set(c, (m.get(c) ?? 0) + 1);
      }
    return { values: m, missing };
  }, [entities, filterState, language, dataSource]);
  const descriptorCounts = useMemo(() => {
    const m = new Map<string, number>();
    const carriers = descriptorCarriersOf(entities, dataSource);
    let missing = 0;
    for (const e of entities)
      if (matchesAll(e, filterState, "descriptor")) {
        const vals = e.descriptors ?? [];
        if (!vals.length && carriers.has(e.typeId)) missing++;
        for (const d of vals) m.set(d, (m.get(d) ?? 0) + 1);
      }
    return { values: m, missing };
  }, [entities, filterState, dataSource]);
  // Every shown property and range facet in one pass: a record counts towards
  // a facet when it passes all the other facets, so ticking a value in one
  // narrows the counts of the rest but never its own. A range keeps how many
  // records its own bounds keep, and the lowest and highest value (the number
  // boxes' placeholders).
  const { inheritedCounts, rangeStats } = useMemo(() => {
    const inheritedCounts: Record<string, { values: Map<string, number>; missing: number }> = {};
    const rangeStats: Record<string, RangeStats> = {};
    const facets = shownDefs.map((def) => ({
      def,
      key: inheritedKey(def.propId),
      carriers: inheritedCarriers(def, entities, language, dataSource),
      out: (inheritedCounts[def.propId] = { values: new Map<string, number>(), missing: 0 }),
    }));
    const ranges = shownRanges.map((def) => {
      const mode = facetMatch[rangeKey(def.name)] ?? "any";
      return {
        def,
        key: rangeKey(def.name),
        mode,
        ...rangeBoundsOf(def, rangeFilters[def.name]),
        carriers: new Set(def.templateIds),
        out: (rangeStats[def.name] = { kept: 0, missing: 0, min: Infinity, max: -Infinity }),
      };
    });
    forEachFacetBase(entities, filterState, (e, failed) => {
      for (const f of facets) {
        if (failed && !failed.includes(f.key)) continue;
        const vals = entityInheritedValues(e, f.def, language, dataSource);
        if (!vals.length && f.carriers.has(e.typeId)) f.out.missing++;
        for (const v of vals) f.out.values.set(v, (f.out.values.get(v) ?? 0) + 1);
      }
      for (const r of ranges) {
        if (failed && !failed.includes(r.key)) continue;
        const carrier = r.carriers.has(e.typeId);
        const ivs = entityPropertyIntervals(e, r.def.name, language, r.def.kind);
        if (!ivs.length && carrier) r.out.missing++;
        if (matchInterval(ivs, r.lo, r.hi, r.mode, carrier)) r.out.kept++;
        for (const [a, b] of ivs) {
          if (Number.isFinite(a) && a < r.out.min) r.out.min = a;
          if (Number.isFinite(b) && b > r.out.max) r.out.max = b;
        }
      }
    });
    return { inheritedCounts, rangeStats };
  }, [entities, filterState, shownDefs, shownRanges, facetMatch, rangeFilters, language, dataSource]);
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

  // Groups pick from the facets that narrow now, named as their chips are,
  // then from the property facets shown that do not, by name: a member can
  // join before it is set, and its values are then ticked inside the group.
  const activeFilters = useActiveFilters();
  const groupOptions = useMemo(() => {
    const m = new Map<string, { name: string; values: string[] }>();
    for (const f of activeFilters) {
      if (!f.facetKey) continue;
      const entry = m.get(f.facetKey) ?? { name: f.group.split(" · ")[0], values: [] };
      entry.values.push(f.label);
      m.set(f.facetKey, entry);
    }
    const narrowing = [...m].map(([key, { name, values }]) => ({
      key,
      name,
      // A range's chip already starts with its name ("Age 18 → 30").
      label: values[0]?.startsWith(name) ? values.join(", ") : `${name}: ${values.join(", ")}`,
    }));
    const unset = [
      ...shownDefs.map((d) => ({ key: inheritedKey(d.propId), name: d.label })),
      ...shownRanges.map((d) => ({ key: rangeKey(d.name), name: d.label })),
    ]
      .filter((o) => !m.has(o.key))
      .map((o) => ({ ...o, label: o.name }));
    return [...narrowing, ...unset];
  }, [activeFilters, shownDefs, shownRanges]);
  // A facet's name when it no longer narrows, so a group can still show it.
  const facetName = (key: string) => {
    if (key.startsWith("inh:")) return inheritedDefs.find((d) => d.propId === key.slice(4))?.label ?? key.slice(4);
    if (key.startsWith("range:")) return rangeDefs.find((d) => d.name === key.slice(6))?.label ?? key.slice(6);
    return FIXED_FACET_NAMES[key] ?? key;
  };
  // A new group starts empty: guessing its members picked the first two
  // narrowing facets, which were rarely the ones meant.
  const addGroup = () => setGroups((gs) => [...gs, { id: `group-${Date.now().toString(36)}`, op: "or", keys: [] }]);
  const updateGroup = (id: string, next: Partial<FilterGroup>) =>
    setGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...next } : g)));
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
              counts={descriptorCounts.values}
              selected={descriptorFilters}
              onToggle={toggleDescriptor}
              onClear={() => {
                setDescriptorFilters({});
                setMatch("descriptor", "any");
              }}
              match={{ mode: descriptorMode, onChange: (m) => setMatch("descriptor", m), multi: true, missing: descriptorCounts.missing }}
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
          counts={countryCounts.values}
          selected={countryFilters}
          onToggle={toggleCountry}
          onClear={() => {
            setCountryFilters({});
            setMatch("country", "any");
          }}
          match={{ mode: countryMode, onChange: (m) => setMatch("country", m), multi: true, missing: countryCounts.missing }}
          sort="alpha"
          hideWhenEmpty={dataSource === "nepal"}
        />

        {shownDefs.map(({ propId, label, multi }) => (
          <KeywordFacetCard
            key={propId}
            title={label}
            counts={inheritedCounts[propId]?.values ?? new Map()}
            selected={inheritedFilters[propId] ?? {}}
            onToggle={(v) => toggleInherited(propId, v)}
            onClear={() => {
              setInheritedFilters((s) => ({ ...s, [propId]: {} }));
              setMatch(inheritedKey(propId), "any");
            }}
            match={{
              mode: facetMatch[inheritedKey(propId)] ?? "any",
              onChange: (m) => setMatch(inheritedKey(propId), m),
              multi: multi !== false,
              missing: inheritedCounts[propId]?.missing ?? 0,
            }}
            sort="count"
            hideWhenEmpty
          />
        ))}

        {shownRanges.map((def) => (
          <RangeFacetCard
            key={def.name}
            def={def}
            bounds={rangeFilters[def.name] ?? { from: "", to: "" }}
            stats={rangeStats[def.name]}
            onChange={(b) => setRangeFilters((s) => ({ ...s, [def.name]: b }))}
            onClear={() => {
              setRangeFilters((s) => {
                const next = { ...s };
                delete next[def.name];
                return next;
              });
              setMatch(rangeKey(def.name), "any");
            }}
            mode={facetMatch[rangeKey(def.name)] ?? "any"}
            onMode={(m) => setMatch(rangeKey(def.name), m)}
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
        {groups.map((g) => (
          <FilterGroupCard
            key={g.id}
            group={g}
            options={groupOptions}
            taken={new Set(groups.filter((x) => x.id !== g.id).flatMap((x) => x.keys))}
            facetName={facetName}
            onChange={(next) => updateGroup(g.id, next)}
            onRemove={() => setGroups((gs) => gs.filter((x) => x.id !== g.id))}
          />
        ))}
        <button
          type="button"
          data-part="add-group"
          onClick={addGroup}
          className="flex items-center gap-1.5 w-full h-8 px-2 rounded-md text-tab text-ink-secondary hover:text-ink hover:bg-paper transition-colors cursor-pointer"
        >
          <Plus size={13} aria-hidden className="shrink-0" />
          Add group
        </button>
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
  match,
  sort,
  hideWhenEmpty = false,
  headingLevel = 2,
}: {
  title: string;
  counts: Map<string, number>;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
  onClear: () => void;
  /** The facet's Match row. Absent on chain facets, whose values combine
   *  path-coupled. */
  match?: FacetMatch;
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
  const missingMode = match?.mode === "missing";
  // In `missing` the ticks are kept but ignored, so they are not counted.
  const selectedCount = missingMode ? 0 : Object.values(selected).filter(Boolean).length;
  const narrowing = selectedCount > 0 || (!!match && match.mode !== "any");

  if (hideWhenEmpty && list.length === 0 && !narrowing) return null;

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
          {narrowing && (
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
        </span>
      </header>

      {match && (
        <FacetMatchRow
          title={title}
          match={match}
          note={missingMode ? `${match.missing.toLocaleString()} without` : ""}
        />
      )}

      {/* In `missing` the list stays in place, dimmed and inert: the ticks are
          kept for the way back and do not take part. */}
      <div
        data-part="values"
        className={`space-y-1.5 transition-opacity ${missingMode ? "opacity-40" : ""}`}
        ref={(el) => el?.toggleAttribute("inert", missingMode)}
      >
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
      </div>
    </section>
  );
}

/** A facet's Match mode, and what `missing` would keep. */
interface FacetMatch {
  mode: LibraryMatch;
  onChange: (mode: LibraryMatch) => void;
  /** Records can hold several values: offer `all`. */
  multi: boolean;
  /** Records that could carry a value and have none, over the other facets. */
  missing: number;
}

const MATCH_LABEL: Record<LibraryMatch, string> = { any: "any", all: "all", none: "none", missing: "missing" };

/** One quiet line under a facet's title: how its ticks select records. Text
 *  segments, not a toolbar; the current one takes the warm fill. `note` ends
 *  the line (how many records have no value, or how many a range keeps); the
 *  slot is always there, so the row never changes height. */
function FacetMatchRow({ title, match, note }: { title: string; match: Pick<FacetMatch, "mode" | "onChange" | "multi">; note: string }) {
  const modes: LibraryMatch[] = match.multi ? ["any", "all", "none", "missing"] : ["any", "none", "missing"];
  return (
    <SegmentRow
      component="FacetMatchRow"
      caption="Match"
      groupLabel={`Match mode for ${title}`}
      options={modes.map((m) => ({ value: m, label: MATCH_LABEL[m] }))}
      value={match.mode}
      onChange={match.onChange}
      note={note}
    />
  );
}

/** The Match row's shape: a caption, text segments, and a note slot at the
 *  end that is always mounted. */
function SegmentRow<T extends string>({
  component,
  caption,
  groupLabel,
  options,
  value,
  onChange,
  note,
}: {
  component: string;
  caption: string;
  groupLabel: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  note: string;
}) {
  return (
    <div data-component={component} className="flex items-center gap-0.5 h-5 px-2">
      <span aria-hidden className="text-meta text-ink-tertiary me-1">{caption}</span>
      <div role="group" aria-label={groupLabel} className="flex items-center gap-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            data-part="mode"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-1.5 h-5 rounded-sm text-meta transition-colors cursor-pointer ${
              value === o.value ? "bg-warm text-ink" : "text-ink-tertiary hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <span data-part="missing" aria-live="polite" className="ms-auto text-meta tabular-nums text-ink-tertiary">
        {note}
      </span>
    </div>
  );
}

/** Facet keys that are not property facets, by the name their chips use. */
const FIXED_FACET_NAMES: Record<string, string> = {
  type: "Type",
  doc: "Document",
  status: "Status",
  country: "Country",
  descriptor: "Descriptor",
  date: "Date",
  content: "Content",
};

/* ── Group card — two facets joined by OR, or one negated. The facets keep
   their own cards and selections; the group only changes how they combine. ── */

function FilterGroupCard({
  group,
  options,
  taken,
  facetName,
  onChange,
  onRemove,
}: {
  group: FilterGroup;
  options: { key: string; label: string }[];
  /** Keys another group holds. */
  taken: ReadonlySet<string>;
  facetName: (key: string) => string;
  onChange: (next: Partial<FilterGroup>) => void;
  onRemove: () => void;
}) {
  const slots = group.op === "or" ? 2 : 1;
  const setSlot = (i: number, key: string) => {
    const keys = [...group.keys];
    keys[i] = key;
    onChange({ keys: keys.filter(Boolean) });
  };
  const choices = (i: number) => {
    const current = group.keys[i];
    const other = new Set(group.keys.filter((_, j) => j !== i));
    const list = options.filter((o) => !taken.has(o.key) && !other.has(o.key));
    // A chosen facet that no longer narrows stays listed, so the box does not
    // jump to another one.
    if (current && !list.some((o) => o.key === current))
      list.unshift({ key: current, label: `${facetName(current)}: nothing set` });
    return list;
  };
  return (
    <section data-component="FilterGroupCard" aria-label="Group" className={`${FACET_CARD} space-y-1.5`}>
      <header data-part="header" className="flex items-center justify-between gap-2 px-2 pt-1">
        <h2 data-part="title" className="text-tab font-semibold text-ink">Group</h2>
        <button
          type="button"
          data-part="remove"
          aria-label="Remove group"
          onClick={onRemove}
          className="inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
        >
          <X size={11} aria-hidden />
          Remove
        </button>
      </header>
      <SegmentRow
        component="GroupJoinRow"
        caption="Join"
        groupLabel="How the group joins its facets"
        options={[
          { value: "or", label: "either" },
          { value: "not", label: "not" },
        ]}
        value={group.op}
        onChange={(op) => onChange({ op, keys: group.keys.slice(0, op === "or" ? 2 : 1) })}
        note=""
      />
      <div data-part="members" className="px-1 pb-0.5 flex flex-col gap-1">
        {Array.from({ length: slots }, (_, i) => (
          <div key={i} className="flex flex-col gap-1">
            {i > 0 && <span className="px-1 text-meta text-ink-tertiary">or</span>}
            <select
              value={group.keys[i] ?? ""}
              onChange={(e) => setSlot(i, e.target.value)}
              aria-label={group.op === "or" ? (i === 0 ? "First facet" : "Second facet") : "Facet to exclude"}
              className="w-full min-w-0 h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary truncate
                focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all cursor-pointer"
            >
              <option value="">{choices(i).length ? "Choose a filter" : "Set a filter above first"}</option>
              {choices(i).map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}

/** What a range facet's card reads from the counting pass. */
interface RangeStats {
  /** Records its own bounds and mode keep, over the other facets. */
  kept: number;
  missing: number;
  min: number;
  max: number;
}

/* ── Range facet card — a numeric or date property flagged for filtering
   (Uwazi's numeric and date filters), with the same Match row. ── */

function RangeFacetCard({
  def,
  bounds,
  stats,
  onChange,
  onClear,
  mode,
  onMode,
}: {
  def: LibraryRangeDef;
  bounds: RangeBounds;
  stats: RangeStats | undefined;
  onChange: (b: RangeBounds) => void;
  onClear: () => void;
  mode: LibraryMatch;
  onMode: (m: LibraryMatch) => void;
}) {
  const bounded = !!bounds.from || !!bounds.to;
  const narrowing = bounded || mode !== "any";
  const note =
    mode === "missing"
      ? `${(stats?.missing ?? 0).toLocaleString()} without`
      : bounded
        ? `${(stats?.kept ?? 0).toLocaleString()} match`
        : "";
  // Lowest and highest value over the other facets, as the boxes' hints.
  const hint = (n: number | undefined) =>
    n === undefined || !Number.isFinite(n) ? "" : def.kind === "number" ? n.toLocaleString() : "";
  const missingMode = mode === "missing";
  return (
    <section data-component="RangeFacetCard" className={`${FACET_CARD} space-y-1.5`}>
      <header data-part="header" className="flex items-center justify-between gap-2 px-2 pt-1">
        <h2 data-part="title" className="text-tab font-semibold text-ink truncate">{def.label}</h2>
        {narrowing && (
          <button
            type="button"
            data-part="clear"
            aria-label={`Clear ${def.label}`}
            onClick={onClear}
            className="inline-flex items-center gap-0.5 text-meta text-ink-tertiary hover:text-ink transition-colors cursor-pointer"
          >
            <X size={11} aria-hidden />
            Clear
          </button>
        )}
      </header>
      <FacetMatchRow title={def.label} match={{ mode, onChange: onMode, multi: def.multi }} note={note} />
      <div
        data-part="range"
        className={`px-1 pb-0.5 flex items-center gap-1.5 transition-opacity ${missingMode ? "opacity-40" : ""}`}
        ref={(el) => el?.toggleAttribute("inert", missingMode)}
      >
        {def.kind === "date" ? (
          <>
            <DateBox value={bounds.from} onChange={(v) => onChange({ ...bounds, from: v })} ariaLabel={`${def.label} from`} />
            <span aria-hidden className="text-ink-tertiary text-xs shrink-0">→</span>
            <DateBox value={bounds.to} onChange={(v) => onChange({ ...bounds, to: v })} ariaLabel={`${def.label} to`} />
          </>
        ) : (
          <>
            <NumberBox value={bounds.from} placeholder={hint(stats?.min)} onChange={(v) => onChange({ ...bounds, from: v })} ariaLabel={`${def.label} from`} />
            <span aria-hidden className="text-ink-tertiary text-xs shrink-0">→</span>
            <NumberBox value={bounds.to} placeholder={hint(stats?.max)} onChange={(v) => onChange({ ...bounds, to: v })} ariaLabel={`${def.label} to`} />
          </>
        )}
      </div>
    </section>
  );
}

function NumberBox({
  value,
  onChange,
  ariaLabel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  placeholder: string;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      className="flex-1 min-w-0 w-full h-8 px-2 bg-warm border border-border rounded-md text-xs font-medium text-ink-secondary tabular-nums placeholder:text-ink-muted
        focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 transition-all"
    />
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
 *  day. A text field, 24-hour ("16:00"): a native time input follows the
 *  browser's locale and printed "04:00 PM" beside dates in the collection's
 *  format. Text that is not a time is kept as typed and dropped on blur. */
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
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const parse = (t: string) => {
    const m = /^(\d{1,2}):?(\d{2})$/.exec(t.trim());
    if (!m || +m[1] > 23 || +m[2] > 59) return null;
    return `${m[1].padStart(2, "0")}:${m[2]}`;
  };
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      placeholder="hh:mm"
      value={text}
      disabled={disabled}
      onChange={(e) => {
        setText(e.target.value);
        if (!e.target.value.trim()) return onChange("");
        // While typing, only "h:mm" commits; "1630" waits for the blur.
        const t = e.target.value.includes(":") ? parse(e.target.value) : null;
        if (t) onChange(t);
      }}
      onBlur={() => {
        const t = parse(text);
        if (t && t !== value) onChange(t);
        setText(t ?? (text.trim() ? value : ""));
      }}
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
