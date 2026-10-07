// Vegas binding for the chain-traversal engine (utils/chainTraversal.ts): the
// loaded references as a `ChainGraph`, for the chains its templates declare
// (templatesSeed.ts).
import type { ChainGraph, GraphEdge } from "../../utils/chainTraversal";
import { vegasCorpus, vegasEntity, vegasRefsByEntity, type VegasCorpus } from "./load";
import { vegasRelTypeName } from "./schema";

let cache: { corpus: VegasCorpus; graph: ChainGraph } | null = null;

/** A link's verification, as path rows print it. */
const STATUS: Record<string, string> = {
  confirmed: "Confirmed",
  "single-source": "Single source",
  disputed: "Disputed",
};

/** A `ChainGraph` over the loaded Vegas corpus. Null until the corpus is
 *  fetched; cached per load, with `neighbors()` memoised per entity. */
export function vegasChainGraph(): ChainGraph | null {
  const corpus = vegasCorpus();
  if (!corpus) return null;
  if (cache?.corpus === corpus) return cache.graph;

  const refsByEntity = vegasRefsByEntity();
  const neighborCache = new Map<string, GraphEdge[]>();
  const graph: ChainGraph = {
    neighbors(entityId) {
      const cached = neighborCache.get(entityId);
      if (cached) return cached;
      const edges: GraphEdge[] = [];
      for (const r of refsByEntity.get(entityId) ?? []) {
        const extras = { label: vegasRelTypeName.get(r.type) ?? r.type, status: STATUS[r.verification] };
        if (r.from === entityId) edges.push({ neighborId: r.to, relationType: r.type, direction: "outgoing", ...extras });
        if (r.to === entityId) edges.push({ neighborId: r.from, relationType: r.type, direction: "incoming", ...extras });
      }
      neighborCache.set(entityId, edges);
      return edges;
    },
    templateOf: (entityId) => vegasEntity(entityId)?.template,
    titleOf: (entityId) => vegasEntity(entityId)?.title,
    propertyOf(entityId, property) {
      const e = vegasEntity(entityId);
      if (!e) return [];
      if (property === "title") return [e.title];
      return (e.metadata[property] ?? [])
        .map((v) => (v.label?.trim() ? v.label.trim() : typeof v.value === "string" ? v.value.trim() : ""))
        .filter(Boolean);
    },
  };
  cache = { corpus, graph };
  return graph;
}
