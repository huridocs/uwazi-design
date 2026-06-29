// CEJIL binding for the chain-traversal engine (utils/chainTraversal.ts).
//
// Exposes the loaded corpus as a `ChainGraph`: edges come from the hub-collapsed
// pairwise relationships, normalised to (neighbor, type, direction) triples.
//
// Hub model note: every CEJIL relationship is a directed `from→to` pair tagged
// with a `hub`. Multi-member hubs are STAR-shaped (one `from` centre, N `to`
// members), so the materialised pairwise edges already chain across hubs — no
// clique expansion needed. An entity that is a member (`to`) of one hub is the
// centre (`from`) of another, which is exactly what gives the graph its depth
// (Causa→Sentencia→Juez→País walks three different hubs).
import type { ChainGraph, ChainSegment, GraphEdge } from "../../utils/chainTraversal";
import { cejilEsBySid, cejilLoaded, cejilRelsByEntity } from "./load";
import { cejilTemplates } from "./templates";

let cache: { graph: ChainGraph; neighborCache: Map<string, GraphEdge[]> } | null = null;

/** A `ChainGraph` over the loaded CEJIL corpus. Returns null until the corpus is
 *  fetched (`cejilLoaded()`); the caller should gate on that. Cached after first
 *  build; `neighbors()` results are memoised per entity. */
export function cejilChainGraph(): ChainGraph | null {
  if (!cejilLoaded()) return null;
  if (cache) return cache.graph;

  const relsByEntity = cejilRelsByEntity();
  const bySid = cejilEsBySid();
  const neighborCache = new Map<string, GraphEdge[]>();

  const graph: ChainGraph = {
    neighbors(entityId) {
      const cached = neighborCache.get(entityId);
      if (cached) return cached;
      const rels = relsByEntity.get(entityId) ?? [];
      const edges: GraphEdge[] = [];
      for (const r of rels) {
        // An entity can sit on either end (and, for a self-loop, both). Emit an
        // outgoing edge when it is the `from`, incoming when it is the `to`.
        if (r.from === entityId) {
          edges.push({ neighborId: r.to, relationType: r.typeName, direction: "outgoing", hub: r.hub });
        }
        if (r.to === entityId) {
          edges.push({ neighborId: r.from, relationType: r.typeName, direction: "incoming", hub: r.hub });
        }
      }
      neighborCache.set(entityId, edges);
      return edges;
    },
    templateOf(entityId) {
      return bySid.get(entityId)?.template;
    },
    titleOf(entityId) {
      return bySid.get(entityId)?.title;
    },
    propertyOf(entityId, property) {
      const e = bySid.get(entityId);
      if (!e) return [];
      if (property === "title") return [e.title];
      const vals = e.metadata?.[property];
      if (!vals?.length) return [];
      return vals
        .map((v) => {
          if (typeof v.label === "string" && v.label.trim()) return v.label.trim();
          if (typeof v.value === "string" && v.value.trim()) return v.value.trim();
          return "";
        })
        .filter(Boolean);
    },
  };

  cache = { graph, neighborCache };
  return graph;
}

/** Resolve a template id from its display name (the demo chains read more
 *  clearly when pinned by name). */
function templateId(name: string): string | undefined {
  return cejilTemplates.find((t) => t.name === name)?._id;
}

/** Demo chain proven to exist in the published corpus:
 *  Causa ─CorteIDH→ Sentencia ─Firmantes→ Juez ─País→ País.
 *  Maps onto the Event-Act model: Causa=Event, Sentencia=Act, Juez=Person,
 *  País=leaf (the judge's nationality). Segments pin the far-end template because
 *  `País`/`Firmantes` are overloaded across source types. */
export const CEJIL_PERPETRATOR_CHAIN: {
  id: string;
  label: string;
  rootTypeId: string | undefined;
  segments: ChainSegment[];
  leaf: { property: string; label: string };
} = {
  id: "causa-sentencia-juez-pais",
  label: "Jurisdicción de los jueces firmantes",
  rootTypeId: templateId("Causa"),
  segments: [
    {
      relationType: "CorteIDH",
      direction: "outgoing",
      toTypeId: templateId("Sentencia de la CorteIDH"),
      label: "Sentencia",
    },
    {
      relationType: "Firmantes",
      direction: "outgoing",
      toTypeId: templateId("Juez y/o Comisionado"),
      label: "Juez firmante",
    },
    {
      relationType: "País",
      direction: "outgoing",
      toTypeId: templateId("País"),
      label: "País",
    },
  ],
  leaf: { property: "title", label: "País" },
};
