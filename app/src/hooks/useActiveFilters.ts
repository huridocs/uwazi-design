import { useMemo } from "react";
import { CONTENT_GROUPS, CONTENT_GROUP_LABEL, contentRowLabel } from "../utils/entityContent";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  libraryQueryAtom,
  clearLibrarySearchAtom,
  libraryTypeFiltersAtom,
  libraryHasDocAtom,
  libraryStatusFiltersAtom,
  libraryCountryFiltersAtom,
  libraryDescriptorFiltersAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryInheritedFiltersAtom,
  libraryChainFiltersAtom,
  libraryContentFiltersAtom,
  libraryFacetMatchAtom,
  libraryRangeFiltersAtom,
  libraryFilterGroupsAtom,
  type LibraryMatch,
} from "../atoms/library";
import { groupEffective, inheritedKey, rangeKey } from "../utils/libraryFilter";
import { dataSourceAtom } from "../atoms/dataSource";
import { languageAtom } from "../atoms/language";
import { getEntityType } from "../data/entities";
import { libraryInheritedDefs, libraryRangeDefs } from "../utils/libraryFacets";
import { formatDateDisplay, formatMomentSpan } from "../utils/dateFormat";
import { dateBoundMs } from "../utils/timeline";
import { dateFormatAtom } from "../atoms/settingsSingletons";

export interface ActiveFilter {
  id: string;
  /** Which facet it came from — "Type", "Country", the inherited prop's label… */
  group: string;
  label: string;
  color?: string;
  remove: () => void;
  /** The facet key behind it ("type", `inheritedKey(…)`, …), for the groups
   *  picker. Absent on the search, chain values and group chips. */
  facetKey?: string;
}

/** Every active filter, flattened and individually removable.
 *
 *  ONE definition, because two surfaces now show this list — the action bar's
 *  popover (visible while the drawer is showing an entity) and the sheet at the
 *  bottom of the Filters panel. A second copy of "what counts as an active
 *  filter" is exactly the sort of thing that drifts: the two `clearAll`s on this
 *  same state already had, one forgetting the search box and the other the
 *  AND/OR modes. */
export function useActiveFilters(): ActiveFilter[] {
  const dataSource = useAtomValue(dataSourceAtom);
  const language = useAtomValue(languageAtom);
  // Date chips print in the collection's format: a change re-labels them.
  const datePattern = useAtomValue(dateFormatAtom);
  // The chip shows — and drops — the COMMITTED query, not the box's text.
  const query = useAtomValue(libraryQueryAtom);
  const clearSearch = useSetAtom(clearLibrarySearchAtom);
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hasDocOnly, setHasDocOnly] = useAtom(libraryHasDocAtom);
  const [statusFilters, setStatusFilters] = useAtom(libraryStatusFiltersAtom);
  const [countryFilters, setCountryFilters] = useAtom(libraryCountryFiltersAtom);
  const [descriptorFilters, setDescriptorFilters] = useAtom(libraryDescriptorFiltersAtom);
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const [inheritedFilters, setInheritedFilters] = useAtom(libraryInheritedFiltersAtom);
  const [chainFilters, setChainFilters] = useAtom(libraryChainFiltersAtom);
  const [contentFilters, setContentFilters] = useAtom(libraryContentFiltersAtom);
  const [facetMatch, setFacetMatch] = useAtom(libraryFacetMatchAtom);
  const [rangeFilters, setRangeFilters] = useAtom(libraryRangeFiltersAtom);
  const [groups, setGroups] = useAtom(libraryFilterGroupsAtom);

  return useMemo<ActiveFilter[]>(() => {
    const out: ActiveFilter[] = [];
    const resetMatch = (key: string) => () =>
      setFacetMatch((m) => {
        const next = { ...m };
        delete next[key];
        return next;
      });
    /** A value-list facet's chips, read through its Match mode: `missing` is
     *  one chip that ends the mode; `none` prefixes each value with "not";
     *  `all` with "all of" on the first, so "a, b" reads as both. */
    const valueChips = (
      key: string,
      group: string,
      idPrefix: string,
      vals: Record<string, boolean>,
      removeValue: (v: string) => () => void,
    ) => {
      const mode: LibraryMatch = facetMatch[key] ?? "any";
      if (mode === "missing") {
        out.push({ id: `${idPrefix}-missing`, group, label: `No ${group.toLowerCase()}`, remove: resetMatch(key), facetKey: key });
        return;
      }
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `${idPrefix}-${v}`,
            group: mode === "any" ? group : `${group} · ${mode}`,
            label: mode === "none" ? `not ${v}` : v,
            remove: removeValue(v),
            facetKey: key,
          });
    };
    const drop = <T,>(set: (fn: (s: T) => T) => void, key: string) => () =>
      set((s: T) => {
        const next = { ...(s as object) } as Record<string, unknown>;
        delete next[key];
        return next as T;
      });

    if (query.trim())
      out.push({
        id: "q",
        group: "Search",
        label: `“${query.trim()}”`,
        // Dismissing the chip is the deliberate act, so it drops the text too.
        remove: () => clearSearch(),
      });

    for (const [id, on] of Object.entries(typeFilters))
      if (on)
        out.push({
          id: `type-${id}`,
          group: "Type",
          label: getEntityType(id)?.name ?? id,
          color: getEntityType(id)?.color,
          remove: drop(setTypeFilters, id),
          facetKey: "type",
        });

    if (hasDocOnly)
      out.push({
        id: "doc",
        group: "Document",
        label: "Has a document",
        remove: () => setHasDocOnly(false),
        facetKey: "doc",
      });

    for (const [id, on] of Object.entries(statusFilters))
      if (on)
        out.push({
          id: `status-${id}`,
          group: "Status",
          label: id === "published" ? "Published" : "Restricted",
          remove: drop(setStatusFilters, id),
          facetKey: "status",
        });

    valueChips("country", "Country", "country", countryFilters, (c) => drop(setCountryFilters, c));
    valueChips("descriptor", "Descriptor", "desc", descriptorFilters, (d) => drop(setDescriptorFilters, d));

    if (dateFrom || dateTo)
      out.push({
        id: "date",
        group: "Date",
        // In the collection's date format; a timed bound adds ", 12:30".
        label: formatMomentSpan(
          dateBoundMs(dateFrom, "from"),
          dateBoundMs(dateTo, "from"),
          dateFrom.includes("T") || dateTo.includes("T"),
        ),
        remove: () => {
          setDateFrom("");
          setDateTo("");
        },
        facetKey: "date",
      });

    for (const g of CONTENT_GROUPS)
      for (const [id, on] of Object.entries(contentFilters[g] ?? {}))
        if (on)
          out.push({
            id: `content-${g}-${id}`,
            group: "Content",
            label: `${CONTENT_GROUP_LABEL[g]}: ${contentRowLabel(g, id)}`,
            facetKey: "content",
            remove: () =>
              setContentFilters((s) => {
                const next = { ...(s[g] ?? {}) };
                delete next[id];
                return { ...s, [g]: next };
              }),
          });

    const defs = libraryInheritedDefs(dataSource, language);
    for (const def of defs) {
      const propId = def.propId;
      valueChips(inheritedKey(propId), def.label, `inh-${propId}`, inheritedFilters[propId] ?? {}, (v) => () =>
        setInheritedFilters((s) => {
          const next = { ...(s[propId] ?? {}) };
          delete next[v];
          return { ...s, [propId]: next };
        }),
      );
    }

    // A range is one chip: its bounds, read through its mode.
    for (const def of libraryRangeDefs(dataSource)) {
      const key = rangeKey(def.name);
      const mode: LibraryMatch = facetMatch[key] ?? "any";
      const b = rangeFilters[def.name];
      const clear = () => {
        setRangeFilters((s) => {
          const next = { ...s };
          delete next[def.name];
          return next;
        });
        resetMatch(key)();
      };
      if (mode === "missing") {
        out.push({ id: `range-${def.name}`, group: def.label, label: `No ${def.label.toLowerCase()}`, remove: clear, facetKey: key });
        continue;
      }
      if (!b?.from && !b?.to) continue;
      const end = (v: string | undefined) => (v ? (def.kind === "date" ? formatDateDisplay(v) : v) : "…");
      const span = `${end(b.from)} – ${end(b.to)}`;
      out.push({
        id: `range-${def.name}`,
        group: mode === "any" ? def.label : `${def.label} · ${mode}`,
        label: mode === "none" ? `${def.label} not ${span}` : `${def.label} ${span}`,
        remove: clear,
        facetKey: key,
      });
    }

    for (const [key, vals] of Object.entries(chainFilters))
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `chain-${key}-${v}`,
            group: "Connected",
            label: v,
            remove: () =>
              setChainFilters((s) => {
                const next = { ...(s[key] ?? {}) };
                delete next[v];
                return { ...s, [key]: next };
              }),
          });

    // A group that changes the result is one chip ("Cause or Age", "Not
    // Verification"); dropping it ungroups and keeps both facets.
    const names = new Map<string, string>();
    for (const f of out) if (f.facetKey && !names.has(f.facetKey)) names.set(f.facetKey, f.group.split(" · ")[0]);
    for (const g of groups) {
      if (!groupEffective(g, (k) => names.has(k))) continue;
      const members = g.keys.filter((k) => names.has(k)).map((k) => names.get(k)!);
      out.push({
        id: `group-${g.id}`,
        group: g.op === "or" ? "Either" : "Not",
        label: g.op === "or" ? members.join(" or ") : `Not ${members.join(", ")}`,
        remove: () => setGroups((gs) => gs.filter((x) => x.id !== g.id)),
      });
    }

    return out;
  }, [
    query,
    typeFilters,
    hasDocOnly,
    statusFilters,
    countryFilters,
    descriptorFilters,
    dateFrom,
    dateTo,
    inheritedFilters,
    chainFilters,
    contentFilters,
    setContentFilters,
    facetMatch,
    rangeFilters,
    groups,
    dataSource,
    language,
    datePattern,
    clearSearch,
    setTypeFilters,
    setHasDocOnly,
    setStatusFilters,
    setCountryFilters,
    setDescriptorFilters,
    setDateFrom,
    setDateTo,
    setInheritedFilters,
    setChainFilters,
    setFacetMatch,
    setRangeFilters,
    setGroups,
  ]);
}
