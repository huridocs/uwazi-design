// One record's neighbourhood as a Network graph, for the Relationships panel's
// Graph view: the panel's entity at the centre, the records its (filtered)
// references reach, and the links among those records that the collection
// holds. Drawn by the Library's `NetworkCanvas`; laid out by Focus's worker
// (`focus.ts`) with the centre fixed. Nothing here filters: the references come
// from `useFilteredReferences`.
import type { DataSource } from "../../atoms/dataSource";
import type { Reference, Verification } from "../references";
import { selectionPage } from "../references";
import { graphFromLinks, NETWORK_TYPES_OFF, otherEnd, pairEvidence, type NetworkGraph, type PairEvidence, type RawLink } from "./graph";
import type { StoredLayout } from "./layout";
import type { FocusRequest } from "./focus";

/** A node's group (the panel's Group by): its key and its caption. */
export interface HoodGroup {
  key: string;
  label: string;
}

export interface NeighbourhoodInput {
  source: DataSource;
  centreId: string;
  refs: Reference[];
  /** The record's template, for its dot. */
  templateOf: (id: string) => string;
  /** Display label of a reference's type. */
  typeLabel: (r: Reference) => string;
  /** The group of a target under the panel's Group by; null for none. */
  groupOf: ((r: Reference) => HoodGroup) | null;
  /** A "Connect to…" path from the centre: ids, centre first. */
  path: string[] | null;
  /** The types of a path hop past the first, centre side first. */
  hopTypes: (a: string, b: string) => string[];
  /** The collection's graph, for the links among the neighbours; null skips them. */
  collection: NetworkGraph | null;
  /** The collection's stored layout, for the seeds. */
  stored: StoredLayout | null;
}

export interface Neighbourhood {
  graph: NetworkGraph;
  /** Seeds and groups in the stored-layout shape, for `placeNetwork`. */
  seeds: StoredLayout;
  /** Group captions by community id; empty without Group by. */
  groupLabels: Map<number, string>;
  /** Per edge: 1 a→b, -1 b→a, 2 both ways, 0 not a reference of the centre. */
  arrows: Int8Array;
  /** Per edge: the centre's references it stands for (empty for a link among neighbours). */
  edgeRefs: Reference[][];
  /** Per edge: its type labels, with the direction for the centre's ("cites →", "← cited by"). */
  edgeTypes: string[][];
  /** The path's nodes and edges, centre first; null without one. */
  path: { nodes: number[]; edges: number[] } | null;
  /** The worker's request: every node a member, the centre fixed. */
  request: Omit<FocusRequest, "id">;
}

/** Layout units between neighbours, for the worker's scale. */
const UNIT = 420;

export function buildNeighbourhood(input: NeighbourhoodInput): Neighbourhood {
  const { source, centreId, refs } = input;
  const ids: string[] = [centreId];
  const index = new Map<string, number>([[centreId, 0]]);
  const add = (id: string) => {
    if (!index.has(id)) {
      index.set(id, ids.length);
      ids.push(id);
    }
    return index.get(id)!;
  };

  // The centre's references, one link each, from the centre's side.
  const links: RawLink[] = [];
  const dirOf = new Map<string, number>();
  const refsOf = new Map<string, Reference[]>();
  const typesOf = new Map<string, Set<string>>();
  const groupCount = new Map<string, { label: string; n: number }>();
  const groupOfNode = new Map<string, string>();
  const refsInGroup = new Map<string, Map<string, number>>();
  for (const r of refs) {
    const t = r.targetEntityId;
    if (t === centreId) continue;
    add(t);
    const label = input.typeLabel(r);
    const out = (r.direction ?? "outgoing") === "outgoing";
    links.push(out ? { from: centreId, to: t, type: label } : { from: t, to: centreId, type: label });
    dirOf.set(t, (dirOf.get(t) ?? 0) | (out ? 1 : 2));
    (refsOf.get(t) ?? refsOf.set(t, []).get(t)!).push(r);
    (typesOf.get(t) ?? typesOf.set(t, new Set()).get(t)!).add(out ? `${label} →` : `← ${label}`);
    if (input.groupOf) {
      const g = input.groupOf(r);
      const c = groupCount.get(g.key) ?? { label: g.label, n: 0 };
      c.n++;
      groupCount.set(g.key, c);
      const per = refsInGroup.get(t) ?? refsInGroup.set(t, new Map()).get(t)!;
      per.set(g.key, (per.get(g.key) ?? 0) + 1);
    }
  }
  // A record in several groups (two relationship types) sits in the one it
  // has most references in.
  for (const [t, per] of refsInGroup) groupOfNode.set(t, [...per.entries()].sort((a, b) => b[1] - a[1])[0][0]);

  // The path past its first hop: nodes the centre's references may not reach.
  const path = input.path && input.path.length >= 2 && input.path[0] === centreId ? input.path : null;
  if (path) {
    for (let k = 1; k < path.length; k++) {
      add(path[k]);
      if (k < 2) continue;
      const types = input.hopTypes(path[k - 1], path[k]);
      for (const type of types.length ? types : ["related"]) links.push({ from: path[k - 1], to: path[k], type });
    }
  }

  // Links among the neighbours, as the collection holds them (its default
  // type switches applied), so the layout and the hover can show the
  // neighbourhood's own structure.
  const g0 = input.collection;
  const off = new Set(NETWORK_TYPES_OFF[source] ?? []);
  if (g0) {
    for (let k = 1; k < ids.length; k++) {
      const gi = g0.index.get(ids[k]);
      if (gi === undefined) continue;
      for (let j = g0.adjStart[gi]; j < g0.adjStart[gi + 1]; j++) {
        const e = g0.adjEdge[j];
        const o = g0.ids[otherEnd(g0, e, gi)];
        const ok = index.get(o);
        // Each pair once; never the centre (its links are the references above).
        if (ok === undefined || ok === 0 || ok <= k) continue;
        for (let t = 0; t < g0.types.length; t++) {
          if (!(g0.mask[e] & (1 << Math.min(t, 31))) || off.has(g0.types[t])) continue;
          links.push({ from: ids[k], to: o, type: g0.types[t] });
        }
      }
    }
  }

  const graph = graphFromLinks(source, ids, ids.map((id) => input.templateOf(id)), links);
  const m = graph.a.length;
  const arrows = new Int8Array(m);
  const edgeRefs: Reference[][] = Array.from({ length: m }, () => []);
  const edgeTypes: string[][] = Array.from({ length: m }, () => []);
  const pairEdge = new Map<number, number>();
  const n = ids.length;
  for (let e = 0; e < m; e++) pairEdge.set(graph.a[e] * n + graph.b[e], e);
  const edgeOf = (x: number, y: number) => pairEdge.get(Math.min(x, y) * n + Math.max(x, y));
  for (let e = 0; e < m; e++) {
    const a = graph.a[e];
    const b = graph.b[e];
    if (a === 0) {
      // The centre is node 0, so it is always `a`: a→b is outgoing.
      const t = ids[b];
      const d = dirOf.get(t) ?? 0;
      arrows[e] = d === 3 ? 2 : d === 1 ? 1 : d === 2 ? -1 : 0;
      edgeRefs[e] = refsOf.get(t) ?? [];
      edgeTypes[e] = [...(typesOf.get(t) ?? [])];
      if (!edgeTypes[e].length) edgeTypes[e] = graph.types.filter((_, k) => graph.mask[e] & (1 << Math.min(k, 31)));
    } else {
      edgeTypes[e] = graph.types.filter((_, k) => graph.mask[e] & (1 << Math.min(k, 31)));
    }
  }

  // Groups: one community per group, largest first; without Group by, one.
  const groupKeys = [...groupCount.entries()].sort((a, b) => b[1].n - a[1].n).map(([k]) => k);
  const groupId = new Map(groupKeys.map((k, i) => [k, i + 1]));
  const groupLabels = new Map<number, string>(groupKeys.map((k, i) => [i + 1, groupCount.get(k)!.label]));

  // Seeds. With groups: each group a sector around the centre, sized by its
  // records, so the fans read as groups. Without: the collection's stored
  // positions about the centre, else a spiral around it.
  const xy = new Float32Array(n * 2);
  const pos = new Map<string, [number, number, number]>();
  const centreAt = input.stored?.pos.get(centreId);
  const cx = centreAt?.[0] ?? 0;
  const cy = centreAt?.[1] ?? 0;
  if (input.groupOf && groupKeys.length) {
    const members = new Map<string, number[]>(groupKeys.map((k) => [k, []]));
    for (let i = 1; i < n; i++) {
      const k = groupOfNode.get(ids[i]);
      if (k) members.get(k)!.push(i);
    }
    const total = Math.max(1, n - 1);
    let angle = -Math.PI / 2;
    for (const k of groupKeys) {
      const list = members.get(k)!;
      const span = (Math.PI * 2 * list.length) / total;
      list.forEach((i, q) => {
        const a = angle + span * ((q + 0.5) / Math.max(1, list.length));
        const ring = 1 + Math.floor(q / 24);
        xy[i * 2] = cx + Math.cos(a) * UNIT * 3 * ring;
        xy[i * 2 + 1] = cy + Math.sin(a) * UNIT * 3 * ring;
      });
      angle += span;
    }
  }
  let spiral = 0;
  for (let i = 1; i < n; i++) {
    if (input.groupOf && groupOfNode.has(ids[i])) continue;
    const s = input.stored?.pos.get(ids[i]);
    if (s && centreAt) {
      xy[i * 2] = s[0];
      xy[i * 2 + 1] = s[1];
    } else {
      const a = spiral * 2.399963;
      const r = UNIT * 2 * Math.sqrt(spiral + 1);
      xy[i * 2] = cx + Math.cos(a) * r;
      xy[i * 2 + 1] = cy + Math.sin(a) * r;
      spiral++;
    }
  }
  xy[0] = cx;
  xy[1] = cy;
  for (let i = 0; i < n; i++) pos.set(ids[i], [xy[i * 2], xy[i * 2 + 1], groupId.get(groupOfNode.get(ids[i]) ?? "") ?? 0]);

  const fixed = new Uint8Array(n);
  fixed[0] = 1;
  // With groups, the layout also links each group's records in a chain (not
  // drawn), so a group settles together and its caption sits on it.
  const ea = Array.from(graph.a);
  const eb = Array.from(graph.b);
  if (groupKeys.length > 1) {
    const byGroup = new Map<string, number[]>();
    for (let i = 1; i < n; i++) {
      const k = groupOfNode.get(ids[i]);
      if (k) (byGroup.get(k) ?? byGroup.set(k, []).get(k)!).push(i);
    }
    for (const list of byGroup.values())
      for (let q = 0; q + 1 < list.length; q++) {
        ea.push(list[q]);
        eb.push(list[q + 1]);
      }
  }
  const pathOut = path
    ? {
        nodes: path.map((id) => index.get(id)!),
        edges: path.slice(1).flatMap((id, k) => {
          const e = edgeOf(index.get(path[k])!, index.get(id)!);
          return e === undefined ? [] : [e];
        }),
      }
    : null;

  return {
    graph,
    seeds: { pos },
    groupLabels,
    arrows,
    edgeRefs,
    edgeTypes,
    path: pathOut,
    request: { hub: new Uint8Array(n), xy, ea: Uint32Array.from(ea), eb: Uint32Array.from(eb), unit: UNIT, fixed },
  };
}

/** What an edge's tooltip shows of the evidence: the centre's references with
 *  a quote or a status, else (a link among neighbours) what the collection
 *  holds for the pair. */
export function hoodEvidence(h: Neighbourhood, e: number, limit = 3): PairEvidence[] {
  const refs = h.edgeRefs[e];
  if (!refs.length) return pairEvidence(h.graph.source, h.graph.ids[h.graph.a[e]], h.graph.ids[h.graph.b[e]], limit);
  const out: PairEvidence[] = [];
  for (const r of refs) {
    const quote = r.sourceSelection?.text;
    if (!quote && !r.verification) continue;
    const page = selectionPage(r.sourceSelection);
    out.push({
      type: "",
      ...(quote ? { quote: page ? `${quote} (p. ${page})` : quote } : {}),
      ...(r.verification ? { verification: r.verification as Verification } : {}),
    });
    if (out.length >= limit) break;
  }
  return out;
}
