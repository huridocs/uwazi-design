import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowLeft, ArrowRight, Route } from "lucide-react";
import { entitiesAtom } from "../../atoms/entities";
import { entityCorpusPool } from "../../atoms/dataSource";
import { relConnectPathAtom, relViewAtom } from "../../atoms/filters";
import { useEntityScopeId, useSetRelAtom } from "../../hooks/useEntityScope";
import { entityCorpusOf, getEntity, type Entity } from "../../data/entities";
import { chainGraphFor, pathSkipFor } from "../../data/chainFacets";
import type { ChainGraph, GraphEdge } from "../../utils/chainTraversal";
import { commonNeighbours, edgesBetween, shortestPaths } from "../../utils/pathFinding";
import { Modal } from "../shared/Modal";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../shared/ModalParts";
import { EntityPill } from "../shared/EntityPill";
import { SegmentedControl } from "../shared/SegmentedControl";
import { Checkbox } from "../shared/Checkbox";
import { BAR_GHOST } from "../shared/warmButton";

/** Candidates listed in the picker before a search narrows them. */
const LIMIT = 40;
const MAX_HOPS = 4;

/** The toolbar's "Connect to…" button. Rendered only for a collection whose
 *  relationships are searchable as a graph (`chainGraphFor`). */
export function ConnectButton({ size = "md" }: { size?: "sm" | "md" }) {
  const scopeId = useEntityScopeId();
  const [open, setOpen] = useState(false);
  if (!chainGraphFor(entityCorpusOf(scopeId))) return null;
  const box = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  return (
    <>
      <button
        type="button"
        data-component="ConnectButton"
        onClick={() => setOpen(true)}
        aria-label="Connect to…"
        title="Connect to…"
        aria-haspopup="dialog"
        className={`inline-flex items-center justify-center ${box} rounded-md transition-colors cursor-pointer bg-warm text-ink-secondary hover:bg-parchment hover:text-ink shrink-0`}
      >
        <Route size={size === "sm" ? 12 : 14} aria-hidden />
      </button>
      {open && <ConnectToModal onClose={() => setOpen(false)} />}
    </>
  );
}

/** "Connect to…": how the panel's entity reaches another one. Step 1 picks the
 *  other entity; step 2 lists the shortest paths (up to four hops) or the
 *  neighbours the two share. Each hop names its relationship, the link's
 *  status and the source's quote where the collection has them. "Show in
 *  graph" draws a path in the graph view. Intermediate nodes skip the
 *  collection's pass-through templates (Nepal's sources) unless asked. */
export function ConnectToModal({ onClose }: { onClose: () => void }) {
  const fromId = useEntityScopeId();
  const mock = useAtomValue(entitiesAtom);
  const setPath = useSetRelAtom(relConnectPathAtom);
  const setView = useSetRelAtom(relViewAtom);
  const corpus = entityCorpusOf(fromId);
  const graph = chainGraphFor(corpus);
  const skipDef = pathSkipFor(corpus);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Entity | null>(null);
  const [mode, setMode] = useState<"paths" | "common">("paths");
  const [throughSkipped, setThroughSkipped] = useState(false);

  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [target]);

  const { entities } = useMemo(() => entityCorpusPool(fromId, mock), [fromId, mock]);
  const { candidates, total } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = entities.filter((e) => e.id !== fromId && (q ? e.title.toLowerCase().includes(q) : true));
    return { candidates: pool.slice(0, LIMIT), total: pool.length };
  }, [entities, fromId, query]);

  const skip = useMemo(
    () => (skipDef && !throughSkipped ? new Set(skipDef.typeIds) : undefined),
    [skipDef, throughSkipped],
  );
  const result = useMemo(() => {
    if (!graph || !target) return null;
    const paths = shortestPaths(graph, fromId, target.id, { maxHops: MAX_HOPS, skipTypeIds: skip });
    // Whether a path exists once the skipped templates are allowed, so an empty
    // result can say so rather than imply there is none at all.
    const withSkipped =
      skip && paths.hops === null ? shortestPaths(graph, fromId, target.id, { maxHops: MAX_HOPS, maxPaths: 1 }).hops : null;
    const common = commonNeighbours(graph, fromId, target.id, { skipTypeIds: skip });
    return { paths, withSkipped, common };
  }, [graph, target, fromId, skip]);

  const showInGraph = (nodeIds: string[]) => {
    setPath(nodeIds);
    setView("graph");
    onClose();
  };

  const from = getEntity(fromId);
  return (
    <Modal
      component="ConnectToModal"
      size="lg"
      height="md:h-[min(40rem,100%)]"
      onClose={onClose}
      titleRef={headingRef}
      title={target ? "Connections" : "Connect to…"}
      subtitle={target ? undefined : `from ${from?.title ?? "this entity"}`}
      flush
    >
      {!target ? (
        <>
          <ModalSearchRow
            value={query}
            onChange={setQuery}
            placeholder="Search by title"
            ariaLabel="Search entities"
            autoFocus
          />
          <ModalList data-part="candidates">
            {candidates.length === 0 && <ModalStatus as="li">No entity matches that title.</ModalStatus>}
            {candidates.map((e) => (
              <ModalListRow
                key={e.id}
                part="candidate"
                onClick={() => setTarget(e)}
                title={e.title}
                chip={<EntityPill typeId={e.typeId} />}
              />
            ))}
          </ModalList>
          <footer data-part="footer" className="bleed shrink-0 h-12 flex items-center border-t border-border text-meta text-ink-tertiary">
            {total > LIMIT ? `Showing the first ${LIMIT} of ${total.toLocaleString()}; search by title to reach the rest.` : ""}
          </footer>
        </>
      ) : (
        <>
          <div data-part="ends" className="bleed shrink-0 flex flex-wrap items-center gap-2 py-2 border-b border-border">
            <button
              type="button"
              data-part="back"
              onClick={() => setTarget(null)}
              aria-label="Choose another entity"
              className={`${BAR_GHOST} inline-flex items-center justify-center h-7 w-7 rounded-md cursor-pointer`}
            >
              <ArrowLeft size={14} aria-hidden />
            </button>
            <EntityPill typeId={from?.typeId ?? ""} label={from?.title} />
            <ArrowRight size={12} aria-hidden className="text-ink-muted shrink-0" />
            <EntityPill typeId={target.typeId} label={target.title} />
          </div>
          <div data-part="controls" className="bleed shrink-0 flex flex-wrap items-center justify-between gap-2 py-2">
            <SegmentedControl
              size="sm"
              ariaLabel="What to list"
              value={mode}
              onChange={(v) => setMode(v as "paths" | "common")}
              options={[
                { id: "paths", label: "Shortest paths" },
                { id: "common", label: "Shared neighbours" },
              ]}
            />
            {skipDef && (
              <label className="inline-flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer">
                <Checkbox checked={throughSkipped} onChange={() => setThroughSkipped((v) => !v)} />
                Through {skipDef.label}
              </label>
            )}
          </div>
          {result && graph && (
            <div data-part="results" className="flex-1 min-h-0 overflow-auto flex flex-col">
              {mode === "paths" ? (
                <PathList
                  graph={graph}
                  paths={result.paths.paths}
                  hops={result.paths.hops}
                  truncated={result.paths.truncated}
                  withSkipped={result.withSkipped}
                  skipLabel={skipDef?.label}
                  onIncludeSkipped={() => setThroughSkipped(true)}
                  onShow={showInGraph}
                />
              ) : (
                <CommonList graph={graph} rows={result.common} onShow={(id) => showInGraph([fromId, id, target.id])} />
              )}
            </div>
          )}
          <div data-part="footer" role="status" className="bleed shrink-0 h-12 flex items-center border-t border-border text-meta text-ink-tertiary">
            {result
              ? mode === "paths"
                ? result.paths.hops === null
                  ? ""
                  : `${result.paths.truncated ? "The first " : ""}${result.paths.paths.length} shortest ${
                      result.paths.paths.length === 1 ? "path" : "paths"
                    }, ${result.paths.hops} ${result.paths.hops === 1 ? "hop" : "hops"}`
                : `${result.common.length} shared ${result.common.length === 1 ? "neighbour" : "neighbours"}`
              : ""}
          </div>
        </>
      )}
    </Modal>
  );
}

function PathList({
  graph,
  paths,
  hops,
  truncated,
  withSkipped,
  skipLabel,
  onIncludeSkipped,
  onShow,
}: {
  graph: ChainGraph;
  paths: string[][];
  hops: number | null;
  truncated: boolean;
  withSkipped: number | null;
  skipLabel?: string;
  onIncludeSkipped: () => void;
  onShow: (nodeIds: string[]) => void;
}) {
  if (hops === null)
    return (
      <div data-part="empty" className="py-8 text-center space-y-2">
        <p className="text-xs text-ink-tertiary">
          {withSkipped !== null
            ? `No path without going through ${skipLabel}. Through ${skipLabel}, the shortest is ${withSkipped} ${withSkipped === 1 ? "hop" : "hops"}.`
            : `No path within ${MAX_HOPS} hops.`}
        </p>
        {withSkipped !== null && (
          <button type="button" onClick={onIncludeSkipped} className={`${BAR_GHOST} px-2.5 h-7 rounded-md text-xs font-medium cursor-pointer`}>
            Include {skipLabel}
          </button>
        )}
      </div>
    );
  return (
    <ol data-part="paths" className="divide-y divide-border-soft">
      {paths.map((nodeIds, i) => (
        <li key={nodeIds.join(">")} data-part="path" className="py-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-meta font-semibold uppercase tracking-wider text-ink-tertiary">Path {i + 1}</span>
            <button
              type="button"
              data-part="show-in-graph"
              onClick={() => onShow(nodeIds)}
              className={`${BAR_GHOST} px-2 h-7 rounded-md text-xs font-medium cursor-pointer`}
            >
              Show in graph
            </button>
          </div>
          <ol className="space-y-1.5">
            {nodeIds.slice(1).map((id, k) => (
              <li key={id} className="space-y-1">
                <HopEdges edges={edgesBetween(graph, nodeIds[k], id)} />
                <EntityPill typeId={getEntity(id)?.typeId ?? graph.templateOf(id) ?? ""} label={getEntity(id)?.title ?? graph.titleOf(id)} />
              </li>
            ))}
          </ol>
        </li>
      ))}
      {truncated && (
        <li className="py-3 text-xs text-ink-tertiary">More shortest paths exist; the first {paths.length} are listed.</li>
      )}
    </ol>
  );
}

/** The links of one hop: relationship (with its direction), status and quote. */
function HopEdges({ edges }: { edges: GraphEdge[] }) {
  return (
    <ul className="space-y-0.5 ps-3 border-s border-border-soft">
      {edges.map((e) => (
        <li key={`${e.relationType}|${e.direction}`} className="text-xs text-ink-secondary">
          <span className="font-medium text-ink">
            {e.direction === "incoming" ? "← " : "→ "}
            {e.label ?? e.relationType ?? "related"}
          </span>
          {e.status && <span className="text-ink-tertiary"> · {e.status}</span>}
          {e.quote && <q className="block text-ink-tertiary line-clamp-2">{e.quote}</q>}
        </li>
      ))}
    </ul>
  );
}

/** The shared neighbours; choosing one draws the two-hop path through it. */
function CommonList({
  graph,
  rows,
  onShow,
}: {
  graph: ChainGraph;
  rows: ReturnType<typeof commonNeighbours>;
  onShow: (id: string) => void;
}) {
  if (rows.length === 0) return <ModalStatus>The two share no neighbour.</ModalStatus>;
  const label = (edges: GraphEdge[]) =>
    [...new Set(edges.map((e) => `${e.direction === "incoming" ? "←" : "→"} ${e.label ?? e.relationType ?? "related"}`))].join(", ");
  return (
    <ModalList data-part="common">
      {rows.map((r) => (
        <Fragment key={r.id}>
          <ModalListRow
            part="neighbour"
            onClick={() => onShow(r.id)}
            title={getEntity(r.id)?.title ?? graph.titleOf(r.id)}
            chip={<EntityPill typeId={getEntity(r.id)?.typeId ?? graph.templateOf(r.id) ?? ""} />}
            meta={<span className="truncate max-w-[16rem]">{label(r.fromA)} · {label(r.fromB)}</span>}
          />
        </Fragment>
      ))}
    </ModalList>
  );
}
