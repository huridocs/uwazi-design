// The Library's Network view: a whole collection as one graph.
//
// Nodes are the records the Library lists (`libraryEntitiesAtom`, so CEJIL's
// Spanish records and the session's created entities). Edges are one per
// unordered pair of records that a stored reference joins, in either
// direction, carrying how many references back the pair and which types they
// have. Hub members are already pairs (CEJIL hubs are stars), so nothing is
// expanded. References to ids the Library does not list are dropped.
//
// Positions come from `data/network/layout.ts`; this file is structure only.
import type { DataSource } from "../../atoms/dataSource";
import type { Entity } from "../entities";
import type { Reference, Verification } from "../references";
import { cejilCorpus } from "../cejil/load";
import { nepalCorpus } from "../nepal/load";
import { nepalRelTypeName } from "../nepal/schema";
import { travesiaCorpus } from "../travesia/load";
import { relationDisplayLabel } from "../../utils/inheritance";

/** A record with this many neighbours or more is a hub; its edges draw faint
 *  by default. Research's thresholds (dev/results/library-graph/counts.md):
 *  31 CEJIL records reach 100 and hold 65% of edges, 10 Nepal records reach 50.
 *  `scripts/build-network-layout.mjs` weighs the same edges down. */
export const HUB_DEGREE: Record<DataSource, number> = {
  cejil: 100,
  nepal: 50,
  mock: 20,
  travesia: 20,
  artworks: 20,
};

/** Types off by default, per collection. CEJIL's Mecanismo, País, Paises and
 *  "Relacionado a" are classification links (a ruling → its country or its
 *  court): 29% of references, and nothing the País and Organismo facets do not
 *  already say. */
export const NETWORK_TYPES_OFF: Partial<Record<DataSource, string[]>> = {
  cejil: ["Mecanismo", "País", "Paises", "Relacionado a"],
};

/** Templates the Evidence toggle hides with their edges: Nepal's sources,
 *  claims and media, which link the evidence layer to events and actors. */
export const NETWORK_EVIDENCE_TEMPLATES: Partial<Record<DataSource, string[]>> = {
  nepal: ["nepal_source", "nepal_claim", "nepal_media"],
};

export interface NetworkGraph {
  source: DataSource;
  ids: string[];
  index: Map<string, number>;
  /** Per node: its template id. */
  typeIds: string[];
  /** Per edge: endpoint indexes, reference count, and a bit per type in `types`. */
  a: Uint32Array;
  b: Uint32Array;
  refs: Uint16Array;
  mask: Uint32Array;
  /** Type labels, most references first. Bit i of `mask` is `types[i]`; a
   *  collection with more than 32 types folds the rest into bit 31. */
  types: string[];
  /** Per node: distinct neighbours. */
  degree: Uint32Array;
  /** Adjacency as CSR: node i's edges are `adjEdge[adjStart[i] .. adjStart[i+1]]`. */
  adjStart: Uint32Array;
  adjEdge: Uint32Array;
}

export type RawLink = { from: string; to: string; type: string };

/** Every stored reference of the collection, as endpoint pairs with a type label. */
function linksOf(source: DataSource, sampleRefs: Reference[]): RawLink[] {
  switch (source) {
    case "cejil":
      // Untyped CEJIL references read "related", as on the Relationships tab.
      return (cejilCorpus()?.relationships ?? []).map((r) => ({ from: r.from, to: r.to, type: r.typeName || "related" }));
    case "nepal":
      return (nepalCorpus()?.references ?? []).map((r) => ({
        from: r.from,
        to: r.to,
        type: relationDisplayLabel(nepalRelTypeName.get(r.type) ?? r.type),
      }));
    case "travesia":
      return (travesiaCorpus()?.relationships ?? []).map((r) => ({ from: r.from, to: r.to, type: r.typeName }));
    case "mock":
      return sampleRefs.map((r) => ({
        from: r.sourceEntityId,
        to: r.targetEntityId,
        type: relationDisplayLabel(r.relationType),
      }));
    default:
      return [];
  }
}

const cache = new WeakMap<Entity[], { refs: Reference[]; graph: NetworkGraph }>();

/** The collection's graph, built once per entity list (and, for the Sample,
 *  per reference list). CEJIL: about 20 ms. */
export function buildNetworkGraph(source: DataSource, entities: Entity[], sampleRefs: Reference[]): NetworkGraph {
  const hit = cache.get(entities);
  if (hit && (source !== "mock" || hit.refs === sampleRefs) && hit.graph.source === source) return hit.graph;

  const graph = graphFromLinks(
    source,
    entities.map((e) => e.id),
    entities.map((e) => e.typeId),
    linksOf(source, sampleRefs),
  );
  cache.set(entities, { refs: sampleRefs, graph });
  return graph;
}

/** The graph over `ids` (with their templates) from raw links: one edge per
 *  unordered pair, links to unknown ids and self-links dropped. */
export function graphFromLinks(source: DataSource, ids: string[], typeIds: string[], links: RawLink[]): NetworkGraph {
  const index = new Map<string, number>();
  ids.forEach((id, i) => index.set(id, i));
  const typeCount = new Map<string, number>();
  for (const l of links) typeCount.set(l.type, (typeCount.get(l.type) ?? 0) + 1);
  const types = [...typeCount.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).map(([t]) => t);
  const bit = new Map(types.map((t, i) => [t, 1 << Math.min(i, 31)]));

  const pairOf = new Map<number, number>();
  const A: number[] = [];
  const B: number[] = [];
  const R: number[] = [];
  const M: number[] = [];
  const n = ids.length;
  for (const l of links) {
    const x = index.get(l.from);
    const y = index.get(l.to);
    if (x === undefined || y === undefined || x === y) continue;
    const lo = x < y ? x : y;
    const hi = x < y ? y : x;
    const key = lo * n + hi;
    let e = pairOf.get(key);
    if (e === undefined) {
      e = A.length;
      pairOf.set(key, e);
      A.push(lo);
      B.push(hi);
      R.push(0);
      M.push(0);
    }
    R[e] = Math.min(65535, R[e] + 1);
    M[e] |= bit.get(l.type)!;
  }

  const m = A.length;
  const degree = new Uint32Array(n);
  for (let e = 0; e < m; e++) {
    degree[A[e]]++;
    degree[B[e]]++;
  }
  const adjStart = new Uint32Array(n + 1);
  for (let i = 0; i < n; i++) adjStart[i + 1] = adjStart[i] + degree[i];
  const fill = adjStart.slice(0, n);
  const adjEdge = new Uint32Array(2 * m);
  for (let e = 0; e < m; e++) {
    adjEdge[fill[A[e]]++] = e;
    adjEdge[fill[B[e]]++] = e;
  }

  return {
    source,
    ids,
    index,
    typeIds,
    a: Uint32Array.from(A),
    b: Uint32Array.from(B),
    refs: Uint16Array.from(R),
    mask: Uint32Array.from(M),
    types,
    degree,
    adjStart,
    adjEdge,
  };
}

const graphIds = new WeakMap<NetworkGraph, number>();
let nextGraphId = 1;
/** A number per graph object, for cache keys: two graphs of the same size
 *  (the Sample after a reference is added) never share one. */
export function graphId(g: NetworkGraph): number {
  let id = graphIds.get(g);
  if (id === undefined) graphIds.set(g, (id = nextGraphId++));
  return id;
}

/** The other end of edge `e` from node `i`. */
export const otherEnd = (g: NetworkGraph, e: number, i: number) => (g.a[e] === i ? g.b[e] : g.a[e]);

export interface PairEvidence {
  type: string;
  quote?: string;
  verification?: Verification;
}

/** The references between two records that carry a quote or a status, for an
 *  edge's tooltip. Only Nepal's do; every other collection returns none. Read
 *  on hover, one scan of the collection's references. */
export function pairEvidence(source: DataSource, idA: string, idB: string, limit = 3): PairEvidence[] {
  if (source !== "nepal") return [];
  const out: PairEvidence[] = [];
  for (const r of nepalCorpus()?.references ?? []) {
    if (!((r.from === idA && r.to === idB) || (r.from === idB && r.to === idA))) continue;
    if (!r.quote && !r.verification) continue;
    out.push({
      type: relationDisplayLabel(nepalRelTypeName.get(r.type) ?? r.type),
      quote: r.quote,
      verification: r.verification,
    });
    if (out.length >= limit) break;
  }
  return out;
}
