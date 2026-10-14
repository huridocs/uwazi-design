import { matchesAll, inheritedKey, rangeKey, type LibraryFilterState } from "./libraryFilter";
import { parseSearchQuery, type QueryMatchMode } from "./queryTokens";
import type { Entity } from "../data/entities";

/** One change that would bring a search with no result back to some results,
 *  with how many it would return. `exclude` names the excluding facet by its
 *  facet key (`country`, `descriptor`, `inh:…`, `range:…`), the key
 *  `useActiveFilters` gives its chips; a NOT group is named by its member. */
export type ZeroResultSuggestion =
  | { kind: "match"; to: "partial"; count: number }
  | { kind: "scope"; to: "all"; count: number }
  | { kind: "exclude"; key: string; count: number };

const countWhere = (entities: readonly Entity[], state: LibraryFilterState, except?: string) => {
  let n = 0;
  for (const e of entities) if (matchesAll(e, state, except)) n++;
  return n;
};

/** The switches a zero-result state can offer, each with its count, in this
 *  order: Match back to partial words (only while it is whole words), Search in
 *  back to everything (only while it is narrowed), then each excluding facet
 *  dropped on its own (a facet in `none`, or a NOT group). A switch that would
 *  still return nothing is left out. Pure: the caller passes the filter state
 *  the results were built from, and the raw query and match mode, because the
 *  state holds the query already parsed. */
export function zeroResultSuggestions(
  entities: readonly Entity[],
  state: LibraryFilterState,
  search: { query: string; match: QueryMatchMode },
): ZeroResultSuggestion[] {
  const out: ZeroResultSuggestion[] = [];
  if (search.query.trim() && search.match !== "partial") {
    const partial = { ...state, searchQuery: parseSearchQuery(search.query, { match: "partial" }) };
    const count = countWhere(entities, partial);
    if (count) out.push({ kind: "match", to: "partial", count });
  }
  if (search.query.trim() && state.searchScope && state.searchScope !== "all") {
    const count = countWhere(entities, { ...state, searchScope: "all" });
    if (count) out.push({ kind: "scope", to: "all", count });
  }
  const excluding: string[] = [];
  if (state.countries.length && state.countryMode === "none") excluding.push("country");
  if (state.descriptors.length && state.descriptorMode === "none") excluding.push("descriptor");
  for (const f of state.inherited) if (f.mode === "none" && f.values.size) excluding.push(inheritedKey(f.def.propId));
  for (const r of state.ranges) if (r.mode === "none") excluding.push(rangeKey(r.def.name));
  // `matchesAll` skips the whole node holding the key, so a NOT group is
  // dropped by naming its member.
  for (const g of state.groups) if (g.op === "not" && g.keys[0] && !excluding.includes(g.keys[0])) excluding.push(g.keys[0]);
  for (const key of excluding) {
    const count = countWhere(entities, state, key);
    if (count) out.push({ kind: "exclude", key, count });
  }
  return out;
}
