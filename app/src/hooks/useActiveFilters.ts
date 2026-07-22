import { useMemo } from "react";
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
} from "../atoms/library";
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

  return useMemo<ActiveFilter[]>(() => {
    const out: ActiveFilter[] = [];
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

    for (const [c, on] of Object.entries(countryFilters))
      if (on)
        out.push({ id: `country-${c}`, group: "Country", label: c, remove: drop(setCountryFilters, c) });

    for (const [d, on] of Object.entries(descriptorFilters))
      if (on)
        out.push({
          id: `desc-${d}`,
          group: "Descriptor",
          label: d,
          remove: drop(setDescriptorFilters, d),
        });

    if (dateFrom || dateTo)
      out.push({
        id: "date",
        group: "Date",
        label: `${dateFrom || "…"} → ${dateTo || "…"}`,
        remove: () => {
          setDateFrom("");
          setDateTo("");
        },
      });

    const defs = libraryInheritedDefs(dataSource, language);
    for (const [propId, vals] of Object.entries(inheritedFilters))
      for (const [v, on] of Object.entries(vals))
        if (on)
          out.push({
            id: `inh-${propId}-${v}`,
            group: defs.find((d) => d.propId === propId)?.label ?? propId,
            label: v,
            remove: () =>
              setInheritedFilters((s) => {
                const next = { ...(s[propId] ?? {}) };
                delete next[v];
                return { ...s, [propId]: next };
              }),
          });

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
  ]);
}
