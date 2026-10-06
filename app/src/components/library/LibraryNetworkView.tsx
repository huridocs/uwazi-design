import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import type { Entity } from "../../data/entities";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../atoms/dataSource";
import { libraryNetworkDisplayAtom } from "../../atoms/library";
import { networkGraphAtom } from "../../atoms/network";
import { HUB_DEGREE, NETWORK_EVIDENCE_TEMPLATES, NETWORK_TYPES_OFF } from "../../data/network/graph";
import { loadNetworkLayout, placeNetwork, type StoredLayout } from "../../data/network/layout";
import { NetworkCanvas } from "./NetworkCanvas";

type Select = (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;

/** Community marks open into nodes only past this many records; below it the
 *  whole collection reads as nodes at the first fit. */
const OVERVIEW_FROM = 500;

/** The Library's Network view: the whole collection, with the Library's
 *  filters, facets, date brush and search dimming it in place.
 *
 *  `matches` is the list every other view draws (`filtered` in LibraryView, the
 *  same `matchesAll` set), and `filtering` says whether anything narrows it.
 *  Matches draw at full strength, their neighbours at half, the rest faint;
 *  an edge needs a matching end. No filter, toggle or type change moves a node:
 *  positions come from the collection's stored layout. */
export const LibraryNetworkView = memo(function LibraryNetworkView({
  matches,
  filtering,
  selectedId,
  onSelect,
}: {
  matches: Entity[];
  filtering: boolean;
  selectedId: string | null;
  onSelect: Select;
}) {
  const source = useAtomValue(dataSourceAtom);
  const entities = useAtomValue(libraryEntitiesAtom);
  const graph = useAtomValue(networkGraphAtom);
  const display = useAtomValue(libraryNetworkDisplayAtom);
  const types = useAtomValue(libraryTypesAtom);

  const [stored, setStored] = useState<{ source: string; layout: StoredLayout | null } | null>(null);
  useEffect(() => {
    let alive = true;
    loadNetworkLayout(source).then((layout) => alive && setStored({ source, layout }));
    return () => {
      alive = false;
    };
  }, [source]);
  const ready = stored?.source === source;
  const placement = useMemo(
    () => (ready ? placeNetwork(graph, stored!.layout) : null),
    [ready, graph, stored],
  );

  const typeById = useMemo(() => new Map(types.map((t) => [t.id, t])), [types]);
  const colorOf = useCallback((id: string) => typeById.get(id)?.color ?? "#6B7280", [typeById]);
  const typeNameOf = useCallback((id: string) => typeById.get(id)?.name ?? id, [typeById]);
  const titleOf = useCallback((i: number) => entities[i]?.title ?? "", [entities]);

  /* What is drawn: the Evidence layer and the relationship types. */
  const evidenceOn = display.evidence !== false;
  const offDefault = NETWORK_TYPES_OFF[source] ?? [];
  const typeOnKey = graph.types
    .map((t) => {
      const v = display[`type:${t}`];
      return v === undefined ? !offDefault.includes(t) : v !== false;
    })
    .map((on) => (on ? 1 : 0))
    .join("");
  const nodeOn = useMemo(() => {
    const hide = evidenceOn ? null : new Set(NETWORK_EVIDENCE_TEMPLATES[source] ?? []);
    const out = new Uint8Array(graph.ids.length);
    for (let i = 0; i < out.length; i++) out[i] = hide?.has(graph.typeIds[i]) ? 0 : 1;
    return out;
  }, [graph, evidenceOn, source]);
  const edgeOn = useMemo(() => {
    let mask = 0;
    for (let t = 0; t < typeOnKey.length; t++) if (typeOnKey[t] === "1") mask |= 1 << Math.min(t, 31);
    const m = graph.a.length;
    const out = new Uint8Array(m);
    for (let e = 0; e < m; e++) out[e] = graph.mask[e] & mask && nodeOn[graph.a[e]] && nodeOn[graph.b[e]] ? 1 : 0;
    return out;
  }, [graph, typeOnKey, nodeOn]);

  /* Dim in place: 2 match, 1 neighbour of a match (over a drawn edge), 0 rest. */
  const strength = useMemo(() => {
    if (!filtering) return null;
    const out = new Uint8Array(graph.ids.length);
    for (const e of matches) {
      const i = graph.index.get(e.id);
      if (i !== undefined) out[i] = 2;
    }
    const m = graph.a.length;
    for (let e = 0; e < m; e++) {
      if (!edgeOn[e]) continue;
      const a = graph.a[e];
      const b = graph.b[e];
      if (out[a] === 2 && out[b] === 0) out[b] = 1;
      else if (out[b] === 2 && out[a] === 0) out[a] = 1;
    }
    return out;
  }, [filtering, matches, graph, edgeOn]);

  const selected = selectedId ? graph.index.get(selectedId) ?? -1 : -1;
  const select = useCallback(
    (i: number, e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => onSelect(graph.ids[i], e),
    [graph, onSelect],
  );

  if (!placement) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">Loading the network…</div>
    );
  }
  const n = graph.ids.length;
  return (
    <div data-component="LibraryNetworkView" className="flex-1 min-h-0 h-full">
      <NetworkCanvas
        graph={graph}
        placement={placement}
        colorOf={colorOf}
        typeNameOf={typeNameOf}
        titleOf={titleOf}
        nodeOn={nodeOn}
        edgeOn={edgeOn}
        strength={strength}
        hubDegree={HUB_DEGREE[source]}
        hubEdges={(display.hubEdges as "faint" | "full" | "off" | undefined) ?? "faint"}
        overview={n >= OVERVIEW_FROM}
        selected={selected}
        onSelect={select}
        label={filtering ? "Network of the collection, matches highlighted" : "Network of the collection"}
      />
    </div>
  );
});
