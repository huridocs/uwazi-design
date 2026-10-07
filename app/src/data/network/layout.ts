// Positions and communities for the Network view, read from the file
// `scripts/build-network-layout.mjs` writes per collection. Nothing here lays
// anything out: a record the file does not know (created this session) sits at
// the centre of its placed neighbours, or on a ring outside the drawing.
import type { DataSource } from "../../atoms/dataSource";
import { asset } from "../../utils/asset";
import { canNameCommunity, otherEnd, type NetworkGraph } from "./graph";

const FILES: Partial<Record<DataSource, string>> = {
  cejil: "/cejil-data/network.json",
  nepal: "/nepal-data/network.json",
  travesia: "/travesia-data/network.json",
  vegas: "/vegas-data/network.json",
  mock: "/sample-data/network.json",
};

interface LayoutFile {
  v: number;
  n: number;
  sizes: number[];
  ids: string;
  xy: string;
}

export interface StoredLayout {
  pos: Map<string, [number, number, number]>;
}

const pending = new Map<DataSource, Promise<StoredLayout | null>>();

/** The collection's stored layout, fetched once. Null for a collection with no
 *  file (the artworks): every node is then "unplaced". A failed fetch (an error
 *  status included) rejects and is forgotten, so the view can say so and try
 *  again. */
export function loadNetworkLayout(source: DataSource): Promise<StoredLayout | null> {
  const hit = pending.get(source);
  if (hit) return hit;
  const file = FILES[source];
  const p: Promise<StoredLayout | null> = !file
    ? Promise.resolve(null)
    : fetch(asset(file))
        .then((r) => {
          if (!r.ok) throw new Error(`network layout: HTTP ${r.status}`);
          return r.json() as Promise<LayoutFile>;
        })
        .then(decode);
  p.catch(() => pending.delete(source));
  pending.set(source, p);
  return p;
}

function decode(f: LayoutFile): StoredLayout {
  const ids = f.ids.split("\n");
  const bin = atob(f.xy);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const xy = new Int16Array(bytes.buffer);
  const pos = new Map<string, [number, number, number]>();
  let k = 0;
  f.sizes.forEach((size, c) => {
    for (let j = 0; j < size; j++, k++) pos.set(ids[k], [xy[k * 2], xy[k * 2 + 1], c]);
  });
  return { pos };
}

export interface Community {
  id: number;
  members: number[];
  x: number;
  y: number;
  /** Root-mean-square distance of the members from the centre. */
  spread: number;
  /** The template most members share. */
  typeId: string;
  /** The member with most neighbours that may name it (`canNameCommunity`);
   *  the member with most neighbours where none may. */
  top: number;
}

export interface NetworkPlacement {
  /** x, y per node, in layout units (about ±16,000). */
  pos: Float32Array;
  /** Community per node; -1 for a record with no edge (drawn as nodes, counted
   *  in the overview's chip rather than as a mark each). */
  community: Int32Array;
  communities: Community[];
  /** Nodes with no edge at all. */
  isolated: number;
  /** Half-extent of the drawing, for the first fit. */
  extent: { minX: number; maxX: number; minY: number; maxY: number };
}

const placed = new WeakMap<NetworkGraph, { stored: StoredLayout | null; placement: NetworkPlacement }>();

/** `placeNetwork`, kept per graph, so opening the view again draws at once. */
export function placeNetworkCached(g: NetworkGraph, stored: StoredLayout | null): NetworkPlacement {
  const hit = placed.get(g);
  if (hit && hit.stored === stored) return hit.placement;
  const placement = placeNetwork(g, stored);
  placed.set(g, { stored, placement });
  return placement;
}

/** Place every node of `g`: stored positions first, then the rest. */
export function placeNetwork(g: NetworkGraph, stored: StoredLayout | null): NetworkPlacement {
  const n = g.ids.length;
  const pos = new Float32Array(n * 2);
  const comm = new Int32Array(n).fill(-1);
  const placed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const s = stored?.pos.get(g.ids[i]);
    if (!s) continue;
    pos[i * 2] = s[0];
    pos[i * 2 + 1] = s[1];
    comm[i] = s[2];
    placed[i] = 1;
  }

  // Unplaced nodes with placed neighbours: their centre, nudged so two new
  // records joined to the same neighbour do not sit on one point. Two passes
  // reach records whose only neighbours are themselves new.
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      if (placed[i]) continue;
      let sx = 0, sy = 0, k = 0;
      const votes = new Map<number, number>();
      for (let j = g.adjStart[i]; j < g.adjStart[i + 1]; j++) {
        const o = otherEnd(g, g.adjEdge[j], i);
        if (!placed[o]) continue;
        sx += pos[o * 2];
        sy += pos[o * 2 + 1];
        k++;
        votes.set(comm[o], (votes.get(comm[o]) ?? 0) + 1);
      }
      if (!k) continue;
      const angle = (i * 2.399963) % (Math.PI * 2);
      pos[i * 2] = sx / k + Math.cos(angle) * 400;
      pos[i * 2 + 1] = sy / k + Math.sin(angle) * 400;
      comm[i] = [...votes.entries()].sort((x, y) => y[1] - x[1])[0][0];
      placed[i] = 2;
    }
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    if (!placed[i]) continue;
    minX = Math.min(minX, pos[i * 2]); maxX = Math.max(maxX, pos[i * 2]);
    minY = Math.min(minY, pos[i * 2 + 1]); maxY = Math.max(maxY, pos[i * 2 + 1]);
  }
  // The rest (no file, or no placed neighbour): a sunflower spiral, beside the
  // drawing when there is one, filling the canvas when there is not.
  const rest: number[] = [];
  for (let i = 0; i < n; i++) if (!placed[i]) rest.push(i);
  if (rest.length) {
    const hasDrawing = minX <= maxX;
    const r0 = hasDrawing ? Math.max(maxX - minX, maxY - minY) * 0.12 : 16000;
    const cx = hasDrawing ? maxX + r0 * 1.4 : 0;
    const cy = hasDrawing ? (minY + maxY) / 2 : 0;
    rest.forEach((i, k) => {
      const r = r0 * Math.sqrt((k + 0.5) / rest.length);
      const a = k * 2.399963;
      pos[i * 2] = cx + Math.cos(a) * r;
      pos[i * 2 + 1] = cy + Math.sin(a) * r;
      minX = Math.min(minX, pos[i * 2]); maxX = Math.max(maxX, pos[i * 2]);
      minY = Math.min(minY, pos[i * 2 + 1]); maxY = Math.max(maxY, pos[i * 2 + 1]);
    });
  }
  if (minX > maxX) minX = maxX = minY = maxY = 0;

  // The first fit frames the 1st to 99th percentile on each axis: a few
  // records far out (ForceAtlas2 pushes weakly tied ones away) would otherwise
  // shrink the whole drawing to a corner of the canvas.
  if (n >= 50) {
    const xs = new Float32Array(n);
    const ys = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = pos[i * 2];
      ys[i] = pos[i * 2 + 1];
    }
    xs.sort();
    ys.sort();
    const lo = Math.floor(n * 0.01);
    const hi = Math.ceil(n * 0.99) - 1;
    minX = xs[lo]; maxX = xs[hi]; minY = ys[lo]; maxY = ys[hi];
  }

  // A record with no edge belongs to no community; the rest are grouped by the
  // stored community, or one community for a collection with no file.
  let isolated = 0;
  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    if (g.degree[i] === 0) {
      comm[i] = -1;
      isolated++;
      continue;
    }
    if (comm[i] < 0) comm[i] = 0;
    const list = groups.get(comm[i]);
    if (list) list.push(i);
    else groups.set(comm[i], [i]);
  }
  const communities: Community[] = [];
  for (const [id, members] of groups) {
    let sx = 0, sy = 0;
    const types = new Map<string, number>();
    let top = members[0];
    let namer = -1;
    for (const i of members) {
      sx += pos[i * 2];
      sy += pos[i * 2 + 1];
      types.set(g.typeIds[i], (types.get(g.typeIds[i]) ?? 0) + 1);
      if (g.degree[i] > g.degree[top]) top = i;
      if (canNameCommunity(g, i) && (namer < 0 || g.degree[i] > g.degree[namer])) namer = i;
    }
    if (namer >= 0) top = namer;
    const x = sx / members.length;
    const y = sy / members.length;
    let ss = 0;
    for (const i of members) ss += (pos[i * 2] - x) ** 2 + (pos[i * 2 + 1] - y) ** 2;
    const typeId = [...types.entries()].sort((p, q) => q[1] - p[1])[0][0];
    communities.push({ id, members, x, y, spread: Math.sqrt(ss / members.length), typeId, top });
  }
  communities.sort((p, q) => q.members.length - p.members.length);

  return { pos, community: comm, communities, isolated, extent: { minX, maxX, minY, maxY } };
}
