import { atom } from "jotai";
import { dataSourceAtom, libraryEntitiesAtom } from "./dataSource";
import { referencesAtom } from "./references";
import { buildNetworkGraph, NETWORK_TYPES_OFF } from "../data/network/graph";
import type { Reference } from "../data/references";
import type { ToggleOption } from "../data/libraryDisplay";

const NO_REFS: Reference[] = [];

/** The Library collection as one graph (`data/network/graph.ts`). Read only by
 *  the Network view and its Display options, so no other view builds it. */
export const networkGraphAtom = atom((get) => {
  const source = get(dataSourceAtom);
  return buildNetworkGraph(source, get(libraryEntitiesAtom), source === "mock" ? get(referencesAtom) : NO_REFS);
});

/** Display › Relationship types: one switch per type the collection carries,
 *  most references first. Stored as `type:<label>` in the Network mode. */
export const networkTypeOptionsAtom = atom((get): ToggleOption[] => {
  const off = new Set(NETWORK_TYPES_OFF[get(dataSourceAtom)] ?? []);
  return get(networkGraphAtom).types.map((t) => ({ id: `type:${t}`, label: t, default: !off.has(t) }));
});
