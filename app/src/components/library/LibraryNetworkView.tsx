import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import type { Entity } from "../../data/entities";
import { dataSourceAtom, libraryEntitiesAtom, libraryTypesAtom } from "../../atoms/dataSource";
import { libraryNetworkDisplayAtom, libraryRailInsetAtom, networkCentreCommunityAtom } from "../../atoms/library";
import { networkFindStepAtom, networkGraphAtom } from "../../atoms/network";
import { graphId, HUB_DEGREE, NETWORK_EVIDENCE_TEMPLATES, NETWORK_TYPES_OFF, pairEvidence } from "../../data/network/graph";
import { loadNetworkLayout, placeNetworkCached, type StoredLayout } from "../../data/network/layout";
import { cachedFocus, FOCUS_MAX, focusMembers, runFocus, type FocusLayout } from "../../data/network/focus";
import { NetworkCanvas } from "./NetworkCanvas";

type Select = (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;

/** From this many records the canvas draws with less detail when zoomed out
 *  (smaller dots, hairline edges, community captions); below it every zoom
 *  draws the same. */
const OVERVIEW_FROM = 500;

/** The Library's Network view: the whole collection, narrowed by the
 *  Library's filters, facets, date brush and search (Adv. Search's modifiers
 *  included).
 *
 *  `matches` is the list every other view draws (`filtered` in LibraryView, the
 *  same `matchesAll` set), and `filtering` says whether anything narrows it.
 *  With no filter, nodes sit at the collection's stored layout. With one:
 *  - matches draw full and the rest faded, at every zoom, and the camera
 *    fits the matches;
 *  - up to `FOCUS_MAX` matches, Focus (on by default) lays out the matches and
 *    their neighbours on their own in a worker, hubs pinned at the edge, and
 *    the nodes move there from their global positions;
 *  - "Whole collection" keeps the global positions. The choice holds while
 *    filters change and resets when they are cleared.
 *  Nothing is laid out again while the match set and the drawn edges stay
 *  the same. */
export const LibraryNetworkView = memo(function LibraryNetworkView({
  matches,
  filtering,
  selectedId,
  onSelect,
  onClear,
  query,
  relevanceOf,
}: {
  matches: Entity[];
  filtering: boolean;
  selectedId: string | null;
  onSelect: Select;
  /** Ends the selection (Escape, a click on empty canvas). */
  onClear: () => void;
  /** The committed search. While there is one, the view finds its matches
   *  one at a time, best first by `relevanceOf`. */
  query: string;
  relevanceOf: (e: Entity) => { score: number };
}) {
  const source = useAtomValue(dataSourceAtom);
  // Start of the first-paint measure (`network-first-paint`, NetworkCanvas).
  useState(() => performance.mark("network-open"));
  const entities = useAtomValue(libraryEntitiesAtom);
  const graph = useAtomValue(networkGraphAtom);
  const display = useAtomValue(libraryNetworkDisplayAtom);
  // Full width: the open rail panel's covered width, for the camera.
  const railInset = useAtomValue(libraryRailInsetAtom);
  const types = useAtomValue(libraryTypesAtom);
  const [centreOn, setCentreOn] = useAtom(networkCentreCommunityAtom);

  const [stored, setStored] = useState<{ source: string; layout: StoredLayout | null; failed?: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    loadNetworkLayout(source).then(
      (layout) => alive && setStored({ source, layout }),
      () => alive && setStored({ source, layout: null, failed: true }),
    );
    return () => {
      alive = false;
    };
  }, [source, attempt]);
  const ready = stored?.source === source && !stored.failed;
  const placement = useMemo(
    () => (ready ? placeNetworkCached(graph, stored!.layout) : null),
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

  /* The match set as a mask, and a key that changes only when the set does
     (a re-sort hands a new list with the same records). */
  const { match, matchCount, matchKey } = useMemo(() => {
    if (!filtering) return { match: null, matchCount: 0, matchKey: "all" };
    const out = new Uint8Array(graph.ids.length);
    let count = 0;
    for (const e of matches) {
      const i = graph.index.get(e.id);
      if (i !== undefined && !out[i]) {
        out[i] = 1;
        count++;
      }
    }
    let h = 2166136261;
    for (let i = 0; i < out.length; i++) if (out[i]) h = Math.imul(h ^ i, 16777619);
    return { match: out, matchCount: count, matchKey: `${count}:${(h >>> 0).toString(36)}` };
  }, [filtering, matches, graph]);
  /* Matches a Display switch hides (Nepal's Evidence layer): they are not
     drawn, offered to Focus or counted on the canvas, which says so. */
  const hiddenMatches = useMemo(() => {
    if (!match) return 0;
    let k = 0;
    for (let i = 0; i < match.length; i++) if (match[i] && !nodeOn[i]) k++;
    return k;
  }, [match, nodeOn]);
  const shownMatches = matchCount - hiddenMatches;

  /* 2 match, 1 neighbour of a match (over a drawn edge), 0 rest. */
  const strength = useMemo(() => {
    if (!match) return null;
    const out = new Uint8Array(graph.ids.length);
    for (let i = 0; i < out.length; i++) if (match[i] && nodeOn[i]) out[i] = 2;
    const m = graph.a.length;
    for (let e = 0; e < m; e++) {
      if (!edgeOn[e]) continue;
      const a = graph.a[e];
      const b = graph.b[e];
      if (out[a] === 2 && out[b] === 0) out[b] = 1;
      else if (out[b] === 2 && out[a] === 0) out[a] = 1;
    }
    return out;
  }, [match, nodeOn, graph, edgeOn]);

  /* Focus: on by default, off once the reader picks Whole collection, back on
     when the filters are cleared. */
  const [whole, setWhole] = useState(false);
  useEffect(() => {
    if (!filtering) setWhole(false);
  }, [filtering]);
  const hubDegree = HUB_DEGREE[source];
  const focusAvailable = filtering && shownMatches > 0 && shownMatches <= FOCUS_MAX;
  const wantFocus = focusAvailable && !whole && !!placement;
  const focusKey = `${source}|${graphId(graph)}|${matchKey}|${typeOnKey}|${evidenceOn ? 1 : 0}`;
  const [focus, setFocus] = useState<{ key: string; layout: FocusLayout | null } | null>(null);
  useEffect(() => {
    if (!wantFocus || !placement || !match) return;
    const hit = cachedFocus(focusKey);
    if (hit) {
      setFocus({ key: focusKey, layout: hit });
      return;
    }
    let alive = true;
    const t0 = performance.now();
    const members = focusMembers(graph, placement, match, edgeOn, nodeOn, hubDegree);
    runFocus(focusKey, placement, members).then((layout) => {
      if (!alive) return;
      setFocus({ key: focusKey, layout });
      if (import.meta.env.DEV && layout) {
        (window as unknown as { __networkFocus?: object }).__networkFocus = {
          matches: matchCount,
          members: members.nodes.length,
          workerMs: Math.round(layout.ms),
          ms: Math.round(performance.now() - t0),
        };
      }
    });
    return () => {
      alive = false;
    };
    // `focusKey` stands for the match set, the drawn edges and the collection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantFocus, focusKey, placement]);
  const focusReady = wantFocus && focus?.key === focusKey;
  const pending = wantFocus && !focusReady;
  // While the next focus layout is on its way the last one stays: what is
  // drawn and what answers a click are the same positions until it lands.
  const focusLayout = focusReady || pending ? focus?.layout ?? null : null;
  // Held while the focus layout is on its way, so the camera moves once.
  const fitKey = pending ? null : `${matchKey}|${focusLayout ? focusKey : "global"}`;

  /* An edge's tooltip: its types (the bits of its mask), how many references
     back it, and Nepal's quotes with their status. */
  const edgeInfo = useCallback(
    (e: number) => ({
      types: graph.types.filter((_, t) => graph.mask[e] & (1 << Math.min(t, 31))),
      refs: graph.refs[e],
      evidence: pairEvidence(source, graph.ids[graph.a[e]], graph.ids[graph.b[e]]),
    }),
    [graph, source],
  );

  /* Find: the search's matches, most relevant first. The cursor starts on the
     best one whenever the query or the match set changes, and Enter /
     Shift+Enter in the masthead search (or the stepper) move it. */
  const findOrder = useMemo(() => {
    if (!filtering || !query.trim()) return null;
    const scored: { i: number; s: number }[] = [];
    for (const e of matches) {
      const i = graph.index.get(e.id);
      if (i !== undefined && nodeOn[i]) scored.push({ i, s: relevanceOf(e).score });
    }
    scored.sort((x, y) => y.s - x.s);
    return scored.map((x) => x.i);
    // `matchKey` stands for the match set; a re-sort of the same set changes nothing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtering, query, matchKey, relevanceOf, graph, nodeOn]);
  const findKey = findOrder ? `${query}|${matchKey}` : null;
  const [cursor, setCursor] = useState<{ key: string | null; at: number }>({ key: null, at: 0 });
  const at = cursor.key === findKey ? cursor.at : 0;
  const findCount = findOrder?.length ?? 0;
  const stepFind = useCallback(
    (dir: 1 | -1) => {
      if (!findCount) return;
      setCursor({ key: findKey, at: (at + dir + findCount) % findCount });
    },
    [findKey, at, findCount],
  );
  const step = useAtomValue(networkFindStepAtom);
  const lastStep = useRef(step.n);
  useEffect(() => {
    if (step.n === lastStep.current) return;
    lastStep.current = step.n;
    stepFind(step.dir);
    // Only a new press steps; `stepFind` changes with the cursor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);
  const find = useMemo(
    () =>
      findOrder && findCount
        ? { node: findOrder[at], key: `${findKey}|${at}`, index: at, count: findCount, onStep: stepFind }
        : null,
    [findOrder, findCount, at, findKey, stepFind],
  );

  const selected = selectedId ? graph.index.get(selectedId) ?? -1 : -1;
  const select = useCallback(
    (i: number, e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => onSelect(graph.ids[i], e),
    [graph, onSelect],
  );

  if (stored?.source === source && stored.failed) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-2 h-40">
        <p className="text-sm font-medium text-ink-secondary">The network layout could not be loaded.</p>
        <button type="button" className="h-8 px-3 rounded-md text-xs font-medium text-ink hover:bg-parchment cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40" onClick={() => setAttempt((a) => a + 1)}>
          Try again
        </button>
      </div>
    );
  }
  if (!placement) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">Loading the network…</div>
    );
  }
  const n = graph.ids.length;
  return (
    <div data-component="LibraryNetworkView" className="flex-1 min-h-0 h-full">
      <NetworkCanvas
        inset={railInset}
        graph={graph}
        placement={placement}
        colorOf={colorOf}
        typeNameOf={typeNameOf}
        titleOf={titleOf}
        nodeOn={nodeOn}
        edgeOn={edgeOn}
        strength={strength}
        hubDegree={hubDegree}
        hubEdges={(display.hubEdges as "faint" | "full" | "off" | undefined) ?? "faint"}
        overview={n >= OVERVIEW_FROM}
        focus={focusLayout}
        fitKey={fitKey}
        layoutSwitch={
          filtering && shownMatches > 0
            ? {
                focus: wantFocus,
                available: focusAvailable,
                reason: `Focus lays out up to ${FOCUS_MAX.toLocaleString()} matches; there are ${shownMatches.toLocaleString()}`,
                pending,
                onChange: (on) => setWhole(!on),
              }
            : null
        }
        selected={selected}
        onSelect={select}
        onClear={onClear}
        find={find}
        hiddenMatches={hiddenMatches}
        edgeInfo={edgeInfo}
        centreOn={centreOn}
        onCentred={() => setCentreOn(null)}
        label={
          !filtering
            ? "Network of the collection"
            : focusLayout
              ? "Network of the matches and their links"
              : "Network of the collection, matches highlighted"
        }
      />
    </div>
  );
});
