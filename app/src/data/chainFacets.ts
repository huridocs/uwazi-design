// Relationship-CHAIN filter facets, per collection (Approach B from the design
// doc): one value facet per declared node of a chain, path-coupled at filter
// time. The chains are declared on the templates (`TemplateDef.chains`); the
// graph each collection's chains walk is registered below.
// See docs/relationship-chain-filters.md + utils/chainTraversal.ts.
import type { Corpus } from "./entityChanges";
import type { TemplateDef } from "./templates/types";
import { templatesMirror } from "./templates/mirror";
import type { ChainGraph, ChainSegment } from "../utils/chainTraversal";
import type { ActiveChain } from "../utils/libraryFilter";
import { cejilChainGraph } from "./cejil/graph";
import { nepalChainGraph } from "./nepal/graph";
import { vegasChainGraph } from "./vegas/graph";

/** A single chain-segment value facet — renders as one keyword facet card and
 *  tests one node on the traversed path. */
export interface ChainFacetDef {
  /** Stable facet key, also the selections-atom key: `${chainId}:${segmentIndex}`,
   *  plus `:${property}` when the facet reads something other than the title
   *  (two facets may read one node). */
  key: string;
  chainId: string;
  /** Header shown above the chain's group of facets. */
  groupLabel: string;
  /** One-line helper under the group header (what the group filters). */
  groupDescription: string;
  /** This facet's title. */
  label: string;
  rootTypeId: string;
  segments: ChainSegment[];
  /** Tuple index of the node this facet filters (0 = root). */
  segmentIndex: number;
  /** Property read at that node (`"title"` for the entity name). */
  property: string;
  maxPaths: number;
  defaultFilter: boolean;
  partialPaths: boolean;
}

const CHAIN_MAX_PATHS = 400;

/** The graph a collection's chains walk; null until its corpus has loaded,
 *  and for a collection with no chains. */
const GRAPHS: Partial<Record<Corpus, () => ChainGraph | null>> = {
  cejil: cejilChainGraph,
  nepal: nepalChainGraph,
  vegas: vegasChainGraph,
};

export const chainGraphFor = (corpus: Corpus): ChainGraph | null => GRAPHS[corpus]?.() ?? null;

/** A group of templates a path search can be told not to pass through.
 *  `label` names it in the UI ("Through sources"). */
export interface PathSkipGroup {
  id: string;
  typeIds: string[];
  label: string;
}

/** Per collection, the templates a path search does not pass through by
 *  default:
 *  - Nepal's sources report on everything, so a path through one says only
 *    that one article mentions both ends.
 *  - Nepal's places: a path through "Kathmandu" says only that two things
 *    happened in the same city. Measured on 600 random person, organisation
 *    and event pairs (sources skipped), a quarter of the connected pairs had a
 *    shortest path through a place, two thirds of those through Kathmandu or
 *    Nepal. Without places, 8% lost every path within four hops and 3% got
 *    longer; the empty result offers to include them.
 *  - The Vegas map's Source places and times nearly every recording, so a
 *    path through a source says only that both ends are on the map. */
const PATH_SKIP: Partial<Record<Corpus, PathSkipGroup[]>> = {
  nepal: [
    { id: "sources", typeIds: ["nepal_source"], label: "sources" },
    { id: "places", typeIds: ["nepal_location"], label: "places" },
  ],
  vegas: [{ id: "sources", typeIds: ["vegas_source"], label: "sources" }],
};

export const pathSkipFor = (corpus: Corpus): PathSkipGroup[] => PATH_SKIP[corpus] ?? [];

const defsCache = new WeakMap<TemplateDef[], ChainFacetDef[]>();

/** Every chain facet the collection's templates declare, in template order.
 *  Cached per template list, so a memo keyed on the result sees a new array
 *  only when the templates change. */
export function chainFacetDefsFor(corpus: Corpus, templates: TemplateDef[] = templatesMirror(corpus)): ChainFacetDef[] {
  if (!GRAPHS[corpus]) return [];
  const hit = defsCache.get(templates);
  if (hit) return hit;
  const out: ChainFacetDef[] = [];
  for (const t of templates)
    for (const c of t.chains ?? [])
      for (const f of c.facets)
        out.push({
          key: f.property === "title" ? `${c.id}:${f.segmentIndex}` : `${c.id}:${f.segmentIndex}:${f.property}`,
          chainId: c.id,
          groupLabel: c.label,
          groupDescription: c.description,
          label: f.label,
          rootTypeId: t.id,
          segments: c.segments,
          segmentIndex: f.segmentIndex,
          property: f.property,
          maxPaths: CHAIN_MAX_PATHS,
          defaultFilter: !!c.defaultFilter,
          partialPaths: !!c.partialPaths,
        });
  defsCache.set(templates, out);
  return out;
}

/** The defs grouped by chain, in order. */
export function chainGroups(defs: ChainFacetDef[]): ChainFacetDef[][] {
  const byChain = new Map<string, ChainFacetDef[]>();
  for (const d of defs) {
    const arr = byChain.get(d.chainId);
    if (arr) arr.push(d);
    else byChain.set(d.chainId, [d]);
  }
  return [...byChain.values()];
}

/** Build the active-chain filter state from the raw selections atom. Groups the
 *  per-segment selections back under their chain (so the predicate can couple
 *  them on one path) and drops chains with no active values. `graph` is null
 *  until the corpus loads → returns []. */
export function buildActiveChains(
  selections: Record<string, Record<string, boolean>>,
  defs: ChainFacetDef[],
  graph: ChainGraph | null,
): ActiveChain[] {
  if (!graph) return [];
  const out: ActiveChain[] = [];
  for (const group of chainGroups(defs)) {
    const constraints = group
      .map((d) => ({
        segmentIndex: d.segmentIndex,
        facetKey: d.key,
        property: d.property,
        values: new Set(
          Object.entries(selections[d.key] ?? {})
            .filter(([, on]) => on)
            .map(([v]) => v),
        ),
      }))
      .filter((c) => c.values.size > 0);
    if (constraints.length === 0) continue;
    const first = group[0];
    out.push({
      chainId: first.chainId,
      rootTypeId: first.rootTypeId,
      segments: first.segments,
      graph,
      maxPaths: first.maxPaths,
      partialPaths: first.partialPaths,
      constraints,
    });
  }
  return out;
}
