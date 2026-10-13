import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { X } from "lucide-react";
import { activeAggregateIdAtom, activeRefIdAtom } from "../../atoms/references";
import { relConnectPathAtom, relGroupByAtom, relSearchQueryAtom } from "../../atoms/filters";
import { dataSourceAtom } from "../../atoms/dataSource";
import { networkGraphAtom } from "../../atoms/network";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { useEntityScopeId, useRelAtom, useRelAtomValue } from "../../hooks/useEntityScope";
import { fold, highlightTerms, termIn } from "../../utils/queryTokens";
import { useFilteredReferences } from "./useFilteredReferences";
import { entityCorpusOf, getEntity, getEntityType } from "../../data/entities";
import { chainGraphFor } from "../../data/chainFacets";
import { edgesBetween } from "../../utils/pathFinding";
import { deriveRelationships } from "../../utils/relationships";
import { relationDisplayLabel } from "../../utils/inheritance";
import { getGroupLabel, getRelGroupKey } from "../../utils/connectionGrouping";
import { loadNetworkLayout, placeNetwork, type NetworkPlacement, type StoredLayout } from "../../data/network/layout";
import { runFocus } from "../../data/network/focus";
import { graphId, type NetworkGraph } from "../../data/network/graph";
import { buildNeighbourhood, hoodEvidence, type HoodGroup } from "../../data/network/neighbourhood";
import { NetworkCanvas, type EdgeInfo } from "../library/NetworkCanvas";
import { CANVAS_OVERLAY, CANVAS_OVERLAY_BUTTON } from "../shared/canvasOverlay";
import type { Reference } from "../../data/references";

/** The smallest drawing the camera fits, in layout units, and in median
 *  link lengths: a record with a few links would otherwise be framed edge to
 *  edge, two dots a pane apart. */
const MIN_EXTENT = 1200;
const MIN_LINKS = 3.2;

/** `pl` with its fit extent grown about its centre to at least `MIN_EXTENT`
 *  and `MIN_LINKS` median links. */
function withMinExtent(pl: NetworkPlacement, g: NetworkGraph): NetworkPlacement {
  const d: number[] = [];
  for (let e = 0; e < g.a.length; e++)
    d.push(Math.hypot(pl.pos[g.a[e] * 2] - pl.pos[g.b[e] * 2], pl.pos[g.a[e] * 2 + 1] - pl.pos[g.b[e] * 2 + 1]));
  d.sort((x, y) => x - y);
  const min = Math.max(MIN_EXTENT, (d[d.length >> 1] ?? 0) * MIN_LINKS);
  const { minX, maxX, minY, maxY } = pl.extent;
  const grow = (lo: number, hi: number): [number, number] => {
    if (hi - lo >= min) return [lo, hi];
    const mid = (lo + hi) / 2;
    return [mid - min / 2, mid + min / 2];
  };
  const [x0, x1] = grow(minX, maxX);
  const [y0, y1] = grow(minY, maxY);
  if (x0 === minX && x1 === maxX && y0 === minY && y1 === maxY) return pl;
  return { ...pl, extent: { minX: x0, maxX: x1, minY: y0, maxY: y1 } };
}

/** The Relationships panel's Graph view: the panel's entity and the records
 *  its references reach, on the Library's Network canvas.
 *
 *  - What is drawn is `useFilteredReferences`: search, facets, Contested,
 *    Reported by and the rest narrow it here as in the list.
 *  - One edge per record, carrying the types of its references and their
 *    direction (arrowheads; "cites →" / "← cited by" in the tooltip). The
 *    links among the neighbours are the collection's (its default type
 *    switches applied), so a hover shows the neighbourhood's own structure.
 *  - Layout: seeded from the collection's stored positions (or, with Group
 *    by, one sector per group, its name as a caption), then Focus's
 *    ForceAtlas2 in the worker with the centre fixed. Cached by entity and
 *    reference set, so a view opened again draws at once.
 *  - A "Connect to…" path is drawn in carbon, its hops past the first added
 *    as nodes. A record's dot opens it in the preview slide-over; the open
 *    preview, the active reference or aggregate is the selection. */
export function RelationshipsGraphView() {
  const source = useAtomValue(dataSourceAtom);
  const focusedId = useEntityScopeId();
  const filteredRefs = useFilteredReferences();
  const [groupBy] = useRelAtom(relGroupByAtom);
  const query = useRelAtomValue(relSearchQueryAtom);
  const [previewEntityId, setPreviewEntityId] = useAtom(previewEntityIdAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const activeAggregateId = useAtomValue(activeAggregateIdAtom);
  const setActiveAggregateId = useSetAtom(activeAggregateIdAtom);
  const [connectPath, setConnectPath] = useRelAtom(relConnectPathAtom);
  const collection = useAtomValue(networkGraphAtom);

  // The collection's stored layout seeds the positions; without one (or if
  // it fails to load) the seeds are a spiral, and nothing else changes.
  const [stored, setStored] = useState<{ source: string; layout: StoredLayout | null } | null>(null);
  useEffect(() => {
    let alive = true;
    loadNetworkLayout(source).then(
      (layout) => alive && setStored({ source, layout }),
      () => alive && setStored({ source, layout: null }),
    );
    return () => {
      alive = false;
    };
  }, [source]);
  const layout = stored?.source === source ? stored.layout : undefined;

  const chain = useMemo(() => chainGraphFor(entityCorpusOf(focusedId)), [focusedId]);
  const titleOfId = useCallback((id: string) => getEntity(id)?.title ?? chain?.titleOf(id) ?? id, [chain]);

  // A path chosen in "Connect to…" (ConnectToModal), drawn when it starts
  // here and its first step is among the filtered references.
  const pathIds = connectPath && connectPath.length >= 2 && connectPath[0] === focusedId ? connectPath : null;
  const pathShown = !!pathIds && filteredRefs.some((r) => r.targetEntityId === pathIds[1]);

  const hood = useMemo(() => {
    if (layout === undefined) return null;
    let groupOf: ((r: Reference) => HoodGroup) | null = null;
    if (groupBy !== "none") {
      const rels = deriveRelationships(filteredRefs, { includeHubMembers: true });
      const keyOfRef = new Map<string, string>();
      for (const rel of rels) {
        const key = getRelGroupKey(rel, groupBy);
        for (const id of rel.refIds) keyOfRef.set(id, key);
      }
      groupOf = (r) => {
        const key = keyOfRef.get(r.id) ?? "";
        return { key, label: key ? getGroupLabel(key, groupBy) : "Other" };
      };
    }
    return buildNeighbourhood({
      source,
      centreId: focusedId,
      refs: filteredRefs,
      templateOf: (id) => getEntity(id)?.typeId ?? chain?.templateOf(id) ?? "",
      typeLabel: (r) => relationDisplayLabel(r.relationType),
      groupOf,
      path: pathShown ? pathIds : null,
      hopTypes: (a, b) =>
        chain ? [...new Set(edgesBetween(chain, a, b).map((e) => e.label ?? e.relationType ?? "related"))] : [],
      collection,
      stored: layout,
    });
  }, [layout, groupBy, filteredRefs, source, focusedId, chain, pathShown, pathIds, collection]);

  const seedPlacement = useMemo(() => (hood ? placeNetwork(hood.graph, hood.seeds) : null), [hood]);
  // The layout's cache key: the entity, the drawn references, the grouping
  // and the path. The same set draws the same layout.
  const layoutKey = useMemo(() => {
    if (!hood) return null;
    let h = 2166136261;
    for (const r of filteredRefs) for (let k = 0; k < r.id.length; k++) h = Math.imul(h ^ r.id.charCodeAt(k), 16777619);
    return `rel|${source}|${focusedId}|${groupBy}|${pathShown ? pathIds!.join(">") : ""}|${filteredRefs.length}:${(h >>> 0).toString(36)}`;
  }, [hood, filteredRefs, source, focusedId, groupBy, pathShown, pathIds]);

  const [laidOut, setLaidOut] = useState<{ key: string; placement: ReturnType<typeof placeNetwork> } | null>(null);
  useEffect(() => {
    if (!hood || !seedPlacement || !layoutKey) return;
    let alive = true;
    const nodes = hood.graph.ids.map((_, i) => i);
    const t0 = performance.now();
    runFocus(layoutKey, seedPlacement, { nodes, req: hood.request }).then((focus) => {
      if (!alive || !focus) return;
      if (import.meta.env.DEV) {
        (window as unknown as { __relGraph?: object }).__relGraph = {
          nodes: nodes.length,
          edges: hood.graph.a.length,
          workerMs: Math.round(focus.ms),
          ms: Math.round(performance.now() - t0),
        };
      }
      // Communities (the groups) at their laid-out centres, for the captions.
      const pos = new Map<string, [number, number, number]>();
      hood.graph.ids.forEach((id, i) => pos.set(id, [focus.pos[i * 2], focus.pos[i * 2 + 1], hood.seeds.pos.get(id)![2]]));
      setLaidOut({ key: layoutKey, placement: placeNetwork(hood.graph, { pos }) });
    });
    return () => {
      alive = false;
    };
  }, [hood, seedPlacement, layoutKey]);
  const ready = !!laidOut && laidOut.key === layoutKey;
  const placement = useMemo(() => {
    const pl = ready ? laidOut!.placement : seedPlacement;
    return pl && hood && withMinExtent(pl, hood.graph);
  }, [ready, laidOut, seedPlacement, hood]);

  const graph = hood?.graph ?? null;
  const n = graph?.ids.length ?? 0;
  const nodeOn = useMemo(() => new Uint8Array(n).fill(1), [n, graph]);
  const edgeOn = useMemo(() => new Uint8Array(graph?.a.length ?? 0).fill(1), [graph]);
  const colorOf = useCallback((typeId: string) => getEntityType(typeId)?.color ?? "#6B7280", []);
  const typeNameOf = useCallback((typeId: string) => getEntityType(typeId)?.name ?? typeId, []);
  const titleOf = useCallback((i: number) => (graph && i < graph.ids.length ? titleOfId(graph.ids[i]) : ""), [graph, titleOfId]);
  const edgeInfo = useCallback(
    (e: number): EdgeInfo => ({
      types: hood!.edgeTypes[e],
      refs: hood!.edgeRefs[e].length || graph!.refs[e],
      evidence: hoodEvidence(hood!, e),
    }),
    [hood, graph],
  );

  // The selection: the open preview, else the active reference's or
  // aggregate's record.
  const selected = useMemo(() => {
    if (!graph) return -1;
    const at = (id: string | null | undefined) => (id ? graph.index.get(id) ?? -1 : -1);
    const p = at(previewEntityId);
    if (p > 0) return p;
    const ref = activeRefId ? filteredRefs.find((r) => r.id === activeRefId) : undefined;
    if (ref) return at(ref.targetEntityId);
    if (activeAggregateId) {
      const rel = deriveRelationships(filteredRefs, { includeHubMembers: true }).find((x) => x.id === activeAggregateId);
      if (rel) return at(rel.targetEntityId);
    }
    return -1;
  }, [graph, previewEntityId, activeRefId, activeAggregateId, filteredRefs]);
  const onSelect = useCallback(
    (i: number) => {
      // The centre is the view's own entity: nothing to open.
      if (!graph || i === 0) return;
      setPreviewEntityId(graph.ids[i]);
    },
    [graph, setPreviewEntityId],
  );
  const onClear = useCallback(() => {
    setPreviewEntityId(null);
    setActiveRefId(null);
    setActiveAggregateId(null);
  }, [setPreviewEntityId, setActiveRefId, setActiveAggregateId]);

  // Search marks: the records whose title holds a term, best-connected
  // first, stepped through with the canvas's stepper.
  const terms = useMemo(() => highlightTerms(query), [query]);
  const findOrder = useMemo(() => {
    if (!graph || !terms.length) return null;
    const out: number[] = [];
    for (let i = 1; i < n; i++) {
      const folded = fold(titleOfId(graph.ids[i]));
      if (terms.some((t) => termIn(folded, t))) out.push(i);
    }
    out.sort((a, b) => graph.degree[b] - graph.degree[a]);
    return out.length ? out : null;
  }, [graph, n, terms, titleOfId]);
  const findKey = findOrder ? `${query}|${layoutKey}` : null;
  const [cursor, setCursor] = useState<{ key: string | null; at: number }>({ key: null, at: 0 });
  const at = cursor.key === findKey ? cursor.at : 0;
  const find = useMemo(
    () =>
      findOrder
        ? {
            node: findOrder[at],
            key: `${findKey}|${at}|${ready ? 1 : 0}`,
            index: at,
            count: findOrder.length,
            onStep: (dir: 1 | -1) => setCursor({ key: findKey, at: (at + dir + findOrder.length) % findOrder.length }),
          }
        : null,
    [findOrder, at, findKey, ready],
  );

  const always = useMemo(() => [0], []);

  if (!graph || !placement) {
    return <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">Loading the graph…</div>;
  }
  if (n <= 1) {
    return (
      <div className="flex items-center justify-center h-40 text-sm font-medium text-ink-secondary">
        No relationships to draw.
      </div>
    );
  }
  const centre = titleOfId(focusedId);
  return (
    <div data-component="RelationshipsGraphView" className="relative flex-1 min-h-0 h-full">
      <NetworkCanvas
        // A new neighbourhood (a filter, a search, another entity) is a new
        // canvas: its hover, keyboard list and focus ring hold node indexes
        // of the graph they were taken on.
        key={graphId(graph)}
        graph={graph}
        placement={placement}
        colorOf={colorOf}
        typeNameOf={typeNameOf}
        titleOf={titleOf}
        nodeOn={nodeOn}
        edgeOn={edgeOn}
        strength={null}
        // Every edge here is the centre's or its neighbours': none is faint.
        hubDegree={Number.POSITIVE_INFINITY}
        hubEdges="full"
        overview={false}
        // Positions move from the seeds to the laid-out graph once it lands.
        fitKey={ready ? `${layoutKey}|laid` : `${layoutKey}|seed`}
        selected={selected}
        onSelect={onSelect}
        onClear={onClear}
        find={find}
        edgeInfo={edgeInfo}
        label={`Relationships of ${centre}`}
        path={hood!.path}
        arrows={hood!.arrows}
        captions={hood!.groupLabels.size ? hood!.groupLabels : null}
        always={always}
        noun="graph"
      />
      {pathIds && (
        <div
          data-part="path-bar"
          data-overlay
          role="status"
          className={`absolute bottom-3 start-3 z-10 flex items-center gap-1 max-w-[calc(100%-14rem)] ps-2.5 pe-0.5 ${CANVAS_OVERLAY} text-meta text-ink-secondary`}
        >
          <span className="truncate">
            {pathShown
              ? `Path to ${titleOfId(pathIds[pathIds.length - 1])} · ${pathIds.length - 1} ${pathIds.length === 2 ? "hop" : "hops"}`
              : "The path's first step is hidden by the filters"}
          </span>
          <button
            type="button"
            onClick={() => setConnectPath(null)}
            aria-label="Clear path"
            className={`${CANVAS_OVERLAY_BUTTON} inline-flex items-center justify-center`}
          >
            <X size={12} aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
