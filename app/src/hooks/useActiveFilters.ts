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
  type LibraryMatch,
} from "../atoms/library";
import { inheritedKey } from "../utils/libraryFilter";
import { dataSourceAtom } from "../atoms/dataSource";
import { languageAtom } from "../atoms/language";
import { getEntityType } from "../data/entities";
import { libraryInheritedDefs } from "../utils/libraryFacets";

export interface ActiveFilter {
  id: string;
  /** Which facet it came from — "Type", "Country", the inherited prop's label… */
  group: string;
  label: string;
  color?: string;
  remove: () => void;
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
        out.push({ id: `${idPrefix}-missing`, group, label: `No ${group.toLowerCase()}`, remove: resetMatch(key) });
        return;
      }
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `${idPrefix}-${v}`,
            group: mode === "any" ? group : `${group} · ${mode}`,
            label: mode === "none" ? `not ${v}` : v,
            remove: removeValue(v),
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
        });

    if (hasDocOnly)
      out.push({
        id: "doc",
        group: "Document",
        label: "Has a document",
        remove: () => setHasDocOnly(false),
      });

    for (const [id, on] of Object.entries(statusFilters))
      if (on)
        out.push({
          id: `status-${id}`,
          group: "Status",
          label: id === "published" ? "Published" : "Restricted",
          remove: drop(setStatusFilters, id),
        });

    valueChips("country", "Country", "country", countryFilters, (c) => drop(setCountryFilters, c));
    valueChips("descriptor", "Descriptor", "desc", descriptorFilters, (d) => drop(setDescriptorFilters, d));

    if (dateFrom || dateTo)
      out.push({
        id: "date",
        group: "Date",
        // A timed bound reads "2025-09-08 12:30".
        label: `${dateFrom.replace("T", " ") || "…"} → ${dateTo.replace("T", " ") || "…"}`,
        remove: () => {
          setDateFrom("");
          setDateTo("");
        },
      });

    for (const g of CONTENT_GROUPS)
      for (const [id, on] of Object.entries(contentFilters[g] ?? {}))
        if (on)
          out.push({
            id: `content-${g}-${id}`,
            group: "Content",
            label: `${CONTENT_GROUP_LABEL[g]}: ${contentRowLabel(g, id)}`,
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
    dataSource,
    language,
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
  ]);
}
