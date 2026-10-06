// Nepal binding for the chain-traversal engine (utils/chainTraversal.ts): the
// loaded references as a `ChainGraph`, for the chains its templates declare
// (templatesSeed.ts).
//
// One computed property, `PLACE_WITHIN`: a location's title followed by the
// titles of every place it sits in (`located_in`, up to the country), so a
// facet on a place counts "Kathmandu District" for an event at a building in
// it. The ancestors are worked out once, when the graph is built, so chain
// segments stay fixed length.
import type { ChainGraph, GraphEdge } from "../../utils/chainTraversal";
import { nepalCorpus, nepalEntity, nepalRefsByEntity } from "./load";
import type { NepalCorpus } from "./load";

/** The property name a chain facet reads for a place and what it is in. */
export const PLACE_WITHIN = "placeWithin";

let cache: { corpus: NepalCorpus; graph: ChainGraph } | null = null;

/** Every place `id` is in, nearest first, by `located_in`. Guards against a
 *  cycle in the data. */
function ancestorsOf(id: string, parentsOf: Map<string, string[]>): string[] {
  const out: string[] = [];
  const seen = new Set([id]);
  let frontier = [id];
  while (frontier.length) {
    const next: string[] = [];
    for (const f of frontier)
      for (const p of parentsOf.get(f) ?? [])
        if (!seen.has(p)) {
          seen.add(p);
          out.push(p);
          next.push(p);
        }
    frontier = next;
  }
  return out;
}

/** A `ChainGraph` over the loaded Nepal corpus. Returns null until the corpus
 *  is fetched; cached per load, with `neighbors()` memoised per entity. */
export function nepalChainGraph(): ChainGraph | null {
  const corpus = nepalCorpus();
  if (!corpus) return null;
  if (cache?.corpus === corpus) return cache.graph;

  const refsByEntity = nepalRefsByEntity();
  const neighborCache = new Map<string, GraphEdge[]>();

  const parentsOf = new Map<string, string[]>();
  for (const r of corpus.references)
    if (r.type === "located_in") {
      const arr = parentsOf.get(r.from);
      if (arr) arr.push(r.to);
      else parentsOf.set(r.from, [r.to]);
    }
  const within = new Map<string, string[]>();
  for (const e of corpus.entities)
    if (e.template === "nepal_location")
      within.set(e.sharedId, [e.title, ...ancestorsOf(e.sharedId, parentsOf).map((id) => nepalEntity(id)?.title ?? id)]);

  const graph: ChainGraph = {
    neighbors(entityId) {
      const cached = neighborCache.get(entityId);
      if (cached) return cached;
      const edges: GraphEdge[] = [];
      for (const r of refsByEntity.get(entityId) ?? []) {
        if (r.from === entityId) edges.push({ neighborId: r.to, relationType: r.type, direction: "outgoing" });
        if (r.to === entityId) edges.push({ neighborId: r.from, relationType: r.type, direction: "incoming" });
      }
      neighborCache.set(entityId, edges);
      return edges;
    },
    templateOf: (entityId) => nepalEntity(entityId)?.template,
    titleOf: (entityId) => nepalEntity(entityId)?.title,
    propertyOf(entityId, property) {
      const e = nepalEntity(entityId);
      if (!e) return [];
      if (property === "title") return [e.title];
      if (property === PLACE_WITHIN) return within.get(entityId) ?? [e.title];
      return (e.metadata[property] ?? [])
        .map((v) => (v.label?.trim() ? v.label.trim() : typeof v.value === "string" ? v.value.trim() : ""))
        .filter(Boolean);
    },
  };

  cache = { corpus, graph };
  return graph;
}
