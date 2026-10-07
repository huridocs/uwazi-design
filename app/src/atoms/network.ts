import { atom } from "jotai";
import { dataSourceAtom, libraryEntitiesAtom } from "./dataSource";
import { referencesAtom } from "./references";
import { buildNetworkGraph, NETWORK_TYPES_OFF } from "../data/network/graph";
import type { Reference } from "../data/references";
import type { Entity } from "../data/entities";
import type { DataSource } from "./dataSource";
import type { ToggleOption } from "../data/libraryDisplay";

const NO_REFS: Reference[] = [];

/** Enter and Shift+Enter in the masthead search, while the Network view is
 *  open and the query is the one already searched: step the find cursor. `n`
 *  changes on every press. */
export const networkFindStepAtom = atom<{ dir: 1 | -1; n: number }>({ dir: 1, n: 0 });

/** The Library collection as one graph (`data/network/graph.ts`). Read only by
 *  the Network view and its Display options, so no other view builds it. */
export const networkGraphAtom = atom((get) => {
  const source = get(dataSourceAtom);
  const entities = get(libraryEntitiesAtom);
  const refs = source === "mock" ? get(referencesAtom) : NO_REFS;
  // By input identity: Split's two panes evaluate this atom once each, and
  // share one graph.
  if (lastGraph?.source !== source || lastGraph.entities !== entities || lastGraph.refs !== refs) {
    lastGraph = { source, entities, refs, graph: buildNetworkGraph(source, entities, refs) };
  }
  return lastGraph.graph;
});
let lastGraph: {
  source: DataSource;
  entities: Entity[];
  refs: Reference[];
  graph: ReturnType<typeof buildNetworkGraph>;
} | null = null;

/** Display › Relationship types: one switch per type the collection carries,
 *  most references first. Stored as `type:<label>` in the Network mode. */
export const networkTypeOptionsAtom = atom((get): ToggleOption[] => {
  const off = new Set(NETWORK_TYPES_OFF[get(dataSourceAtom)] ?? []);
  return get(networkGraphAtom).types.map((t) => ({ id: `type:${t}`, label: t, default: !off.has(t) }));
});
