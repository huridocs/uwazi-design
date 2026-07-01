// Relationship CHAIN traversal — the engine behind "chain filters" (multi-hop
// relationship-property filters). See docs/relationship-chain-filters.md.
//
// The two exported primitives:
//   neighbors(graph, id, segment) → the edges of `id` that satisfy ONE hop.
//   chains(graph, root, segments) → every complete PATH (tuple) from `root`
//                                    along the ordered segments.
//
// Crucially, chains() returns *tuples* (one ChainStep per node on the path), not
// a flat set of leaf values. That is what makes the filter PATH-COUPLED: a row
// matches "Pedro gave the order" only when the same path carries both facts.
// The predicate / value-projection layer is built on top of these tuples.
//
// The engine is graph-agnostic: it talks to a `ChainGraph` adapter so the same
// code runs over the CEJIL corpus (data/cejil/graph.ts) or any mock graph in a
// test. It knows nothing about CEJIL, Jotai, or React.

export type Direction = "outgoing" | "incoming";

/** Segment direction. "any" follows the edge regardless of orientation — the
 *  bi-directional fallback for relationships whose label/direction is absent
 *  on one end (see §7 of the design doc). */
export type SegmentDirection = Direction | "any";

/** Sentinel `relationType` that matches every edge, including untyped ones.
 *  Use it for a segment that doesn't constrain the relation type. */
export const ANY_RELATION = "*";

/** One edge incident to an entity, normalised to a (neighbor, type, direction)
 *  triple. `relationType` is null for the corpus's untyped edges. `hub` is
 *  provenance — the n-ary container the edge came from, if any. */
export interface GraphEdge {
  neighborId: string;
  relationType: string | null;
  direction: Direction;
  hub?: string;
}

/** The adapter the engine traverses. Implementations index the underlying data;
 *  the engine only ever calls these. */
export interface ChainGraph {
  /** Every edge incident to `entityId`, in BOTH directions (the adapter emits
   *  an outgoing edge for each `from→to` and an incoming edge for each `to→from`
   *  it participates in). */
  neighbors(entityId: string): GraphEdge[];
  /** Template / type id of an entity, for pinning a hop's far end. Undefined if
   *  the entity is unknown. */
  templateOf(entityId: string): string | undefined;
  /** Display title, for path labels and debugging. */
  titleOf(entityId: string): string | undefined;
  /** Native property value(s) of an entity, for leaf evaluation. `"title"`
   *  returns the title. Returns [] when absent. */
  propertyOf(entityId: string, property: string): string[];
}

/** One hop of a chain. `relationType` is matched against an edge's type
 *  (`ANY_RELATION` matches all). `toTypeId` pins the far end's template — REQUIRED
 *  in practice for overloaded relation types (e.g. CEJIL's `País` links from
 *  Causa, Resolución *and* Juez; without the pin, hops cross-contaminate). */
export interface ChainSegment {
  relationType: string;
  direction: SegmentDirection;
  /** Optional template id the neighbor must match. */
  toTypeId?: string;
  /** Optional human label for the hop (path display). Absent → reuse relationType. */
  label?: string;
}

/** One node on a traversed path. The root step has null relationType/direction;
 *  every subsequent step records the edge that arrived at it. */
export interface ChainStep {
  entityId: string;
  /** Type of the edge used to ARRIVE at this node (null for the root). */
  relationType: string | null;
  /** Direction of the arriving edge (null for the root). */
  direction: Direction | null;
  hub?: string;
}

/** A complete path: [root, step₁, …, leaf]. Length === segments + 1. */
export type ChainTuple = ChainStep[];

/** One resolved, displayable node on a provenance path — how an inherited value
 *  was reached. Lives here (the leaf graph module) so both the resolver
 *  (utils/inheritance) and the field type (data/metadata) can name it without an
 *  import cycle. */
export interface ProvenanceStep {
  entityId: string;
  title: string;
  typeId?: string;
  /** Label of the relation edge that arrived at this node (the hop's name). */
  relationLabel?: string;
}

export interface ChainOptions {
  /** Hard cap on tuples enumerated per root — bounds blow-up at hub nodes
   *  (CEJIL's heaviest País/Court fan out to thousands). Default 500. */
  maxPaths?: number;
  /** Apply only the first N segments (end-user "depth" control). Clamped to
   *  segments.length. Default = full chain. */
  maxDepth?: number;
}

export interface ChainResult {
  tuples: ChainTuple[];
  /** True when `maxPaths` stopped enumeration — surface a "showing first N"
   *  note rather than implying the list is complete. */
  truncated: boolean;
}

function relTypeMatches(edgeType: string | null, want: string): boolean {
  if (want === ANY_RELATION) return true;
  // Untyped edges only match the wildcard — they can't be claimed to BE a
  // specific named type. They stay traversable via ANY_RELATION segments and,
  // because the adapter emits them in both directions, remain reachable both
  // ways (the "missing label ⇒ bi-directional" fallback).
  if (edgeType === null) return false;
  return edgeType === want;
}

/** The edges of `entityId` that satisfy ONE segment: direction, relation type,
 *  and (if pinned) the far-end template. */
export function neighbors(
  graph: ChainGraph,
  entityId: string,
  segment: ChainSegment,
): GraphEdge[] {
  const out: GraphEdge[] = [];
  for (const edge of graph.neighbors(entityId)) {
    if (segment.direction !== "any" && edge.direction !== segment.direction) continue;
    if (!relTypeMatches(edge.relationType, segment.relationType)) continue;
    if (segment.toTypeId && graph.templateOf(edge.neighborId) !== segment.toTypeId) continue;
    out.push(edge);
  }
  return out;
}

/** Every complete path from `root` along `segments`. DFS with a per-path visited
 *  set (no node repeats within one path — kills cycles and the hub→back→hub
 *  bounce) and a global `maxPaths` cap. */
export function chains(
  graph: ChainGraph,
  rootId: string,
  segments: ChainSegment[],
  opts: ChainOptions = {},
): ChainResult {
  const maxPaths = opts.maxPaths ?? 500;
  const depth = Math.min(opts.maxDepth ?? segments.length, segments.length);

  const tuples: ChainTuple[] = [];
  const result: ChainResult = { tuples, truncated: false };
  if (depth === 0) {
    tuples.push([{ entityId: rootId, relationType: null, direction: null }]);
    return result;
  }

  const visited = new Set<string>([rootId]);
  const path: ChainStep[] = [{ entityId: rootId, relationType: null, direction: null }];

  const walk = (segIdx: number): void => {
    if (result.truncated) return;
    const node = path[path.length - 1].entityId;
    for (const edge of neighbors(graph, node, segments[segIdx])) {
      if (visited.has(edge.neighborId)) continue;
      const step: ChainStep = {
        entityId: edge.neighborId,
        relationType: edge.relationType,
        direction: edge.direction,
        hub: edge.hub,
      };
      path.push(step);
      if (segIdx + 1 === depth) {
        if (tuples.length >= maxPaths) {
          result.truncated = true;
          path.pop();
          return;
        }
        tuples.push(path.slice());
      } else {
        visited.add(edge.neighborId);
        walk(segIdx + 1);
        visited.delete(edge.neighborId);
      }
      path.pop();
      if (result.truncated) return;
    }
  };

  walk(0);
  return result;
}

// ── Tuple projections (used by the facet / value layer) ─────────────────────

/** Leaf node of a tuple. */
export function leafOf(tuple: ChainTuple): ChainStep {
  return tuple[tuple.length - 1];
}

/** The leaf's value for `leafProperty` — the value a "leaves only" facet shows
 *  and the predicate tests. A leaf may carry several values (multi-valued
 *  property); callers decide how to fan those out. */
export function leafValues(
  graph: ChainGraph,
  tuple: ChainTuple,
  leafProperty: string,
): string[] {
  return graph.propertyOf(leafOf(tuple).entityId, leafProperty);
}

/** The value at a specific segment index (0 = root), for per-segment facets in
 *  Approach B. `segmentIndex` indexes into the tuple's nodes. */
export function valueAt(
  graph: ChainGraph,
  tuple: ChainTuple,
  segmentIndex: number,
  property: string,
): string[] {
  const step = tuple[segmentIndex];
  return step ? graph.propertyOf(step.entityId, property) : [];
}

/** A readable path string, e.g. `killing → gave order → Andrés`. Uses titles. */
export function pathLabel(graph: ChainGraph, tuple: ChainTuple): string {
  return tuple.map((s) => graph.titleOf(s.entityId) ?? s.entityId).join(" → ");
}
