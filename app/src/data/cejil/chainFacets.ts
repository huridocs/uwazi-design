// CEJIL relationship-CHAIN filter facets (Approach B from the design doc): one
// value facet per exposed segment of a chain, path-coupled at filter time.
// See docs/relationship-chain-filters.md + utils/chainTraversal.ts.
import type { ChainGraph, ChainSegment } from "../../utils/chainTraversal";
import type { ActiveChain } from "../../utils/libraryFilter";
import { CEJIL_PERPETRATOR_CHAIN, cejilChainGraph } from "./graph";

/** A single chain-segment value facet — renders as one keyword facet card and
 *  tests one node on the traversed path. */
export interface ChainFacetDef {
  /** Stable facet key, also the selections-atom key: `${chainId}:${segmentIndex}`. */
  key: string;
  chainId: string;
  /** Header shown above the chain's group of facets. */
  groupLabel: string;
  /** This facet's title. */
  label: string;
  rootTypeId: string;
  segments: ChainSegment[];
  /** Tuple index of the node this facet filters (0 = root). */
  segmentIndex: number;
  /** Property read at that node (`"title"` for the entity name). */
  property: string;
  maxPaths: number;
}

const CHAIN_MAX_PATHS = 400;

/** The chain facets available for the CEJIL corpus. Today: the perpetrator-style
 *  chain Causa → Sentencia → Juez → País, exposing the signing judge (idx 2) and
 *  that judge's country (idx 3) as combinable, path-coupled facets. Returns []
 *  until the templates resolve (rootTypeId present). */
export function cejilChainFacetDefs(): ChainFacetDef[] {
  const c = CEJIL_PERPETRATOR_CHAIN;
  if (!c.rootTypeId) return [];
  const base = {
    chainId: c.id,
    groupLabel: c.label,
    rootTypeId: c.rootTypeId,
    segments: c.segments,
    property: "title",
    maxPaths: CHAIN_MAX_PATHS,
  };
  return [
    { ...base, key: `${c.id}:2`, label: "Juez firmante", segmentIndex: 2 },
    { ...base, key: `${c.id}:3`, label: "País del juez", segmentIndex: 3 },
  ];
}

/** Build the active-chain filter state from the raw selections atom. Groups the
 *  per-segment selections back under their chain (so the predicate can couple
 *  them on one path) and drops chains with no active values. `graph` is null
 *  until the corpus loads → returns []. */
export function buildActiveChains(
  selections: Record<string, Record<string, boolean>>,
  graph: ChainGraph | null,
): ActiveChain[] {
  if (!graph) return [];
  const defs = cejilChainFacetDefs();
  const byChain = new Map<string, ChainFacetDef[]>();
  for (const d of defs) {
    const arr = byChain.get(d.chainId);
    if (arr) arr.push(d);
    else byChain.set(d.chainId, [d]);
  }
  const out: ActiveChain[] = [];
  for (const [chainId, group] of byChain) {
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
      chainId,
      rootTypeId: first.rootTypeId,
      segments: first.segments,
      graph,
      maxPaths: first.maxPaths,
      constraints,
    });
  }
  return out;
}

/** Convenience: the live CEJIL graph (null until the corpus is fetched). */
export { cejilChainGraph };
