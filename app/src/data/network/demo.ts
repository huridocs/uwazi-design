// A small made-up network for the NetworkCanvas story and catalog entry:
// clusters of records around a few cases, joined through two shared hubs.
// Deterministic, so the story renders the same picture every time.
import { entityTypes } from "../entities";
import { graphFromLinks, type NetworkGraph, type RawLink } from "./graph";
import { placeNetwork, type NetworkPlacement, type StoredLayout } from "./layout";

export interface DemoNetwork {
  graph: NetworkGraph;
  placement: NetworkPlacement;
  titles: string[];
}

export function demoNetwork(clusters = 8, perCluster = 24): DemoNetwork {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const ids: string[] = [];
  const typeIds: string[] = [];
  const titles: string[] = [];
  const links: RawLink[] = [];
  const pos = new Map<string, [number, number, number]>();
  const add = (id: string, typeId: string, title: string, x: number, y: number, c: number) => {
    ids.push(id);
    typeIds.push(typeId);
    titles.push(title);
    pos.set(id, [x, y, c]);
  };
  // Two hubs every case links to, as CEJIL's court and commission do.
  add("hub-court", "organization", "Inter-American Court", -1500, 0, 0);
  add("hub-commission", "organization", "Inter-American Commission", 1500, 0, 0);
  const kinds = ["judgment", "person", "document", "violation"];
  for (let c = 0; c < clusters; c++) {
    const angle = (c / clusters) * Math.PI * 2;
    const cx = Math.cos(angle) * 9000;
    const cy = Math.sin(angle) * 9000;
    const caseId = `case-${c}`;
    add(caseId, "court_case", `Case ${12000 + c * 37}`, cx, cy, c + 1);
    links.push({ from: caseId, to: c % 2 ? "hub-court" : "hub-commission", type: "heard by" });
    for (let k = 0; k < perCluster; k++) {
      const id = `${caseId}-${k}`;
      const r = 900 + rand() * 2600;
      const a = rand() * Math.PI * 2;
      const kind = kinds[k % kinds.length];
      add(id, kind, `${kind[0].toUpperCase()}${kind.slice(1)} ${c + 1}.${k + 1}`, cx + Math.cos(a) * r, cy + Math.sin(a) * r, c + 1);
      links.push({ from: id, to: caseId, type: kind === "person" ? "victim" : "part of" });
      if (k > 2 && rand() < 0.3) links.push({ from: id, to: `${caseId}-${Math.floor(rand() * k)}`, type: "cites" });
    }
  }
  // A few cross-case links, so the overview has links between communities.
  for (let c = 0; c < clusters; c++) links.push({ from: `case-${c}-1`, to: `case-${(c + 1) % clusters}-2`, type: "cites" });
  const graph = graphFromLinks("mock", ids, typeIds, links);
  const stored: StoredLayout = { pos };
  return { graph, placement: placeNetwork(graph, stored), titles };
}

export const demoColorOf = (typeId: string) => entityTypes.find((t) => t.id === typeId)?.color ?? "#6B7280";
export const demoTypeNameOf = (typeId: string) => entityTypes.find((t) => t.id === typeId)?.name ?? typeId;

/** An edge's tooltip content for a demo graph: its types and reference count. */
export const demoEdgeInfo = (graph: NetworkGraph) => (e: number) => ({
  types: graph.types.filter((_, t) => graph.mask[e] & (1 << Math.min(t, 31))),
  refs: graph.refs[e],
  evidence: [],
});
