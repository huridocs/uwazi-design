import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import {
  referencesAtom,
  overlayEntityIdAtom,
  activeRefIdAtom,
} from "../../atoms/references";
import {
  searchQueryAtom,
  activeClusterRefIdsAtom,
  relTypeFiltersAtom,
  entityTypeFiltersAtom,
  groupByAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { Direction } from "../../data/references";
import { currentDocument } from "../../data/document";
import { buildMatcher } from "../../utils/searchQuery";
import { deriveRelationships, Relationship } from "../../utils/relationships";
import {
  getGroupColor,
  getGroupLabel,
  getRelGroupKey,
} from "../../utils/connectionGrouping";

interface GraphNode {
  id: string;
  title: string;
  color: string;
  typeName: string;
  evidenceCount: number;
  direction: Direction;
  x: number;
  y: number;
  r: number;
  selected: boolean;
}

interface Spoke {
  key: string;
  label: string;
  color?: string;
  targets: Relationship[];
  /** Inner anchor — origin of the fan to this group's nodes. */
  anchorX: number;
  anchorY: number;
  /** Visible label position (same as anchor in this layout). */
  labelX: number;
  labelY: number;
  /** Truncated visible label text; empty if the group is too tall to label. */
  display: string;
  rectW: number;
}

const VIEW_W = 1280;
const VIEW_H_MIN = 720;
const SOURCE_X = 110;
const ANCHOR_X = 360;
const NODE_X_BASE = 560;
const NODE_COL_W = 56;
const NODE_ROW_H = 22;
const MAX_NODES_PER_COL = 18;
const GROUP_GAP = 18;
const MIN_GROUP_H = 44;
const TOP_PAD = 60;
const SOURCE_R = 26;
const CHAR_PX = 6.5;
const MAX_LABEL_CHARS = 28;

function fitLabel(text: string, maxChars: number): string {
  if (maxChars <= 1) return "";
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(1, maxChars - 1)) + "…";
}

export function RelationshipsGraphView() {
  const [references] = useAtom(referencesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const [activeRefId] = useAtom(activeRefIdAtom);
  const setOverlay = setOverlayEntityId;

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<
    { node: GraphNode; x: number; y: number } | null
  >(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initTx: number;
    initTy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, initTx: 0, initTy: 0, moved: false });

  const filteredRefs = useMemo(() => {
    let result = references;
    if (activeClusterRefIds) {
      const cluster = new Set(activeClusterRefIds);
      result = result.filter((r) => cluster.has(r.id));
    }
    const activeRelTypes = Object.entries(relTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }
    const activeEntityTypes = Object.entries(entityTypeFilters)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (activeEntityTypes.length > 0) {
      const set = new Set(activeEntityTypes);
      result = result.filter((r) => {
        const entity = getEntity(r.targetEntityId);
        return entity ? set.has(entity.typeId) : false;
      });
    }
    const matcher = buildMatcher(searchQuery);
    if (matcher) {
      result = result.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        const haystack = `${ref.sourceSelection.text} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    return result;
  }, [
    references,
    searchQuery,
    activeClusterRefIds,
    relTypeFilters,
    entityTypeFilters,
  ]);

  const { spokes, nodes, totalH, sourceY } = useMemo(() => {
    const rels = deriveRelationships(filteredRefs);
    const byKey = new Map<string, Relationship[]>();
    for (const r of rels) {
      const key = getRelGroupKey(r, groupBy);
      const list = byKey.get(key) ?? [];
      list.push(r);
      byKey.set(key, list);
    }
    const sorted = Array.from(byKey.entries()).sort(([a], [b]) => {
      const la = getGroupLabel(a, groupBy);
      const lb = getGroupLabel(b, groupBy);
      return la.localeCompare(lb);
    });

    const out: GraphNode[] = [];
    const spokesArr: Spoke[] = [];
    let yCursor = TOP_PAD;

    sorted.forEach(([key, targets]) => {
      const isCollapsed = !!collapsed[key];
      const sortedTargets = [...targets].sort(
        (a, b) => b.evidenceCount - a.evidenceCount,
      );
      const shown = isCollapsed ? sortedTargets.slice(0, 1) : sortedTargets;

      const nodeCount = shown.length;
      const colCount = Math.max(1, Math.ceil(nodeCount / MAX_NODES_PER_COL));
      const nodesInLongestCol = Math.min(nodeCount, MAX_NODES_PER_COL);
      const groupHeight = Math.max(
        MIN_GROUP_H,
        nodesInLongestCol * NODE_ROW_H,
      );
      const groupTop = yCursor;
      const groupCenter = groupTop + groupHeight / 2;

      shown.forEach((rel, idx) => {
        const col = Math.floor(idx / MAX_NODES_PER_COL);
        const rowInCol = idx % MAX_NODES_PER_COL;
        const colSize =
          col < colCount - 1
            ? MAX_NODES_PER_COL
            : nodeCount - col * MAX_NODES_PER_COL;
        const yWithin = (rowInCol + 0.5) * (groupHeight / colSize);
        const entity = getEntity(rel.targetEntityId);
        const type = entity ? getEntityType(entity.typeId) : undefined;
        const selected =
          (activeRefId !== null && rel.refIds.includes(activeRefId)) ||
          (overlayEntityId !== null &&
            rel.targetEntityId === overlayEntityId);
        out.push({
          id: rel.id,
          title: entity?.title ?? "Unknown",
          color: type?.color ?? "#9ca3af",
          typeName: type?.name ?? "Unknown",
          evidenceCount: rel.evidenceCount,
          direction: rel.direction,
          x: NODE_X_BASE + col * NODE_COL_W,
          y: groupTop + yWithin,
          r: Math.min(7, 4 + Math.sqrt(rel.evidenceCount) * 1.1),
          selected,
        });
      });

      // Allowed text width is the horizontal gap between source and node
      // columns minus padding. Plenty of room compared with the radial layout.
      const allowed = NODE_X_BASE - ANCHOR_X - 36;
      const charCap = Math.max(4, Math.floor(allowed / CHAR_PX));
      const fullLabel =
        groupBy === "none" ? "Connections" : getGroupLabel(key, groupBy);
      const display = fitLabel(fullLabel, Math.min(charCap, MAX_LABEL_CHARS));
      const rectW = display ? Math.max(56, display.length * CHAR_PX + 16) : 0;

      spokesArr.push({
        key,
        label: fullLabel,
        color: getGroupColor(key, groupBy),
        targets: sortedTargets,
        anchorX: ANCHOR_X,
        anchorY: groupCenter,
        labelX: ANCHOR_X,
        labelY: groupCenter,
        display,
        rectW,
      });

      yCursor += groupHeight + GROUP_GAP;
    });

    const totalH = Math.max(VIEW_H_MIN, yCursor + 40);
    const sourceY = totalH / 2;
    return { spokes: spokesArr, nodes: out, totalH, sourceY };
  }, [filteredRefs, collapsed, groupBy, activeRefId, overlayEntityId]);

  const sourceType = getEntityType(currentDocument.entityTypeId);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
      setTransform((t) => ({
        ...t,
        scale: Math.max(0.4, Math.min(2.5, t.scale * factor)),
      }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if ((e.target as SVGElement).dataset.node) return;
    (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initTx: transform.tx,
      initTy: transform.ty,
      moved: false,
    };
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 3)
      dragRef.current.moved = true;
    setTransform((t) => ({
      ...t,
      tx: dragRef.current.initTx + dx,
      ty: dragRef.current.initTy + dy,
    }));
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
    dragRef.current.active = false;
  };

  const resetView = () => setTransform({ tx: 0, ty: 0, scale: 1 });

  if (nodes.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-warm">
        <Link2 size={36} className="text-ink-tertiary/40 mb-3" />
        <p className="text-sm text-ink-tertiary">No relationships to graph</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex-1 overflow-hidden bg-warm">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{
          width: "100%",
          height: "100%",
          cursor: dragRef.current.active ? "grabbing" : "grab",
          touchAction: "none",
        }}
      >
        <defs>
          <marker
            id="rel-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" fill="var(--border-primary)" />
          </marker>
        </defs>
        <g
          transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`}
          style={{ transformOrigin: `${SOURCE_X}px ${sourceY}px` }}
        >
          {/* Edges: source → spoke anchor → fan to each node. Lines are bezier
              curves so the fan reads as a tree. */}
          {spokes.map((s) => {
            const branchNodes = nodes.filter((n) =>
              s.targets.some((t) => t.id === n.id),
            );
            const sx = SOURCE_X + SOURCE_R;
            const sy = sourceY;
            const midX = (sx + s.anchorX) / 2;
            const trunkD = `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${s.anchorY}, ${s.anchorX} ${s.anchorY}`;
            return (
              <g key={s.key}>
                <path
                  d={trunkD}
                  fill="none"
                  stroke="var(--border-primary)"
                  strokeWidth={1}
                  opacity={0.75}
                />
                {branchNodes.map((n) => {
                  const out = n.direction === "outgoing";
                  const startX = s.anchorX + 6;
                  const startY = s.anchorY;
                  const endX = n.x - (n.r + 3);
                  const endY = n.y;
                  const cMid = (startX + endX) / 2;
                  const d = `M ${startX} ${startY} C ${cMid} ${startY}, ${cMid} ${endY}, ${endX} ${endY}`;
                  // For incoming, draw end → start so the marker points at the label.
                  const reverseD = `M ${endX} ${endY} C ${cMid} ${endY}, ${cMid} ${startY}, ${startX} ${startY}`;
                  return (
                    <path
                      key={`${s.key}-${n.id}`}
                      d={out ? d : reverseD}
                      fill="none"
                      stroke="var(--border-primary)"
                      strokeWidth={1}
                      opacity={0.55}
                      markerEnd="url(#rel-arrow)"
                    />
                  );
                })}
              </g>
            );
          })}

          {/* Spoke labels in the middle column. */}
          {spokes.map((s) => {
            if (!s.display) return null;
            const isCollapsed = !!collapsed[s.key];
            const text = isCollapsed
              ? `${s.display} (${s.targets.length})`
              : s.display;
            const w = Math.max(s.rectW, text.length * CHAR_PX + 16);
            return (
              <g
                key={`label-${s.key}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }));
                }}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={s.labelX - w + 6}
                  y={s.labelY - 11}
                  width={w}
                  height={22}
                  rx={4}
                  fill="var(--bg-surface)"
                  stroke={s.color ?? "var(--border-primary)"}
                  strokeWidth={1}
                />
                <text
                  x={s.labelX - w + 6 + w / 2}
                  y={s.labelY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill="var(--text-secondary)"
                >
                  {text}
                </text>
              </g>
            );
          })}

          {/* Source node — left side, vertically centered with the tree. */}
          <g>
            <circle
              cx={SOURCE_X}
              cy={sourceY}
              r={SOURCE_R}
              fill={sourceType?.color ?? "#8b5cf6"}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
            />
            <text
              x={SOURCE_X}
              y={sourceY + SOURCE_R + 14}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--text-primary)"
            >
              {sourceType?.name ?? "Source"}
            </text>
          </g>

          {/* Target nodes */}
          {nodes.map((n) => (
            <g key={n.id}>
              {n.selected && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 5}
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth={1.5}
                  opacity={0.55}
                />
              )}
              <circle
                data-node="1"
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.color}
                stroke={
                  n.selected ? "var(--text-primary)" : "var(--bg-surface)"
                }
                strokeWidth={n.selected ? 2.5 : 1.5}
                onPointerEnter={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHover({
                    node: n,
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                  });
                }}
                onPointerMove={(e) => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  setHover((h) =>
                    h && h.node.id === n.id
                      ? { ...h, x: e.clientX - rect.left, y: e.clientY - rect.top }
                      : h,
                  );
                }}
                onPointerLeave={() => setHover(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setOverlay(n.id.split("::")[0]);
                }}
                style={{ cursor: "pointer" }}
              />
            </g>
          ))}
        </g>
      </svg>

      {hover && containerRef.current && (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const estWidth = Math.min(
          260,
          Math.max(160, hover.node.title.length * 7 + 24),
        );
        const estHeight = 44;
        const pad = 8;
        const left = Math.min(
          rect.width - estWidth - pad,
          Math.max(pad, hover.x + 12),
        );
        const top = Math.min(
          rect.height - estHeight - pad,
          Math.max(pad, hover.y - estHeight - 10),
        );
        return (
          <div
            className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-md bg-ink text-paper shadow-md max-w-[260px]"
            style={{ left, top, opacity: 0.94 }}
          >
            <div className="text-[11px] font-semibold truncate">{hover.node.title}</div>
            <div className="text-[10px] opacity-80 truncate">
              {hover.node.typeName} · {hover.node.evidenceCount} evidence
            </div>
          </div>
        );
      })()}

      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-paper border border-border rounded-md shadow-sm px-1 py-0.5">
        <button
          onClick={() =>
            setTransform((t) => ({ ...t, scale: Math.max(0.4, t.scale / 1.2) }))
          }
          className="h-6 w-6 text-sm text-ink-secondary hover:text-ink cursor-pointer"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-[10px] tabular-nums text-ink-tertiary w-9 text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <button
          onClick={() =>
            setTransform((t) => ({ ...t, scale: Math.min(2.5, t.scale * 1.2) }))
          }
          className="h-6 w-6 text-sm text-ink-secondary hover:text-ink cursor-pointer"
          aria-label="Zoom in"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="h-6 px-2 text-[11px] text-ink-secondary hover:text-ink cursor-pointer"
          aria-label="Reset view"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
