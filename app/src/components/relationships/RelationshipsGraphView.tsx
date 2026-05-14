import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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
  /** Optional accent for the spoke label pill (e.g. entity-type colour). */
  color?: string;
  angle: number;
  targets: Relationship[];
  labelX: number;
  labelY: number;
}

const VIEW_W = 1200;
const VIEW_H = 900;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const SOURCE_R = 26;
const LABEL_DIST = 88;
const FIRST_RING_R = 170;
const RING_GAP = 40;
const ARC_GAP = 30;

export function RelationshipsGraphView() {
  const [references] = useAtom(referencesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(entityTypeFiltersAtom);
  const [groupBy] = useAtom(groupByAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const activeRefId = useAtomValue(activeRefIdAtom);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
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
    const activeRelTypes = Object.entries(relTypeFilters).filter(([, v]) => v).map(([k]) => k);
    if (activeRelTypes.length > 0) {
      const set = new Set(activeRelTypes);
      result = result.filter((r) => set.has(r.relationType));
    }
    const activeEntityTypes = Object.entries(entityTypeFilters).filter(([, v]) => v).map(([k]) => k);
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
        const haystack = `${ref.sourceSelection?.text ?? ""} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    return result;
  }, [references, searchQuery, activeClusterRefIds, relTypeFilters, entityTypeFilters]);

  const { spokes, nodes } = useMemo(() => {
    // Graph has no "hub container" node — every entity that participates
    // shows up as its own node, so let hub members through deriveRelationships.
    const rels = deriveRelationships(filteredRefs, { includeHubMembers: true });

    // Bucket each relationship by the active primary grouping axis. When
    // groupBy === "none" everything lands in one big sector around the source.
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

    const spokeCount = sorted.length;
    const nodes: GraphNode[] = [];
    const spokesArr: Spoke[] = [];

    // Angular width each branch may use (leave a gap between sectors).
    const sectorSpan =
      spokeCount === 1
        ? Math.PI * 1.4
        : (Math.PI * 2) / spokeCount - 0.12;

    sorted.forEach(([key, targets], i) => {
      const angle =
        spokeCount === 1
          ? -Math.PI / 2
          : (i / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const isCollapsed = !!collapsed[key];
      const sortedTargets = [...targets].sort(
        (a, b) => b.evidenceCount - a.evidenceCount,
      );
      const shown = isCollapsed ? sortedTargets.slice(0, 1) : sortedTargets;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      // Distribute nodes across this sector in concentric rings, snaked so
      // adjacent rings interleave and the fan looks balanced. Each ring's
      // capacity is driven by its arc length.
      let placed = 0;
      let ring = 0;
      while (placed < shown.length) {
        const R = FIRST_RING_R + ring * RING_GAP;
        const arcLen = sectorSpan * R;
        const capacity = Math.max(1, Math.floor(arcLen / ARC_GAP));
        const toPlace = Math.min(capacity, shown.length - placed);
        // Distribute evenly across the sector for this ring.
        for (let j = 0; j < toPlace; j++) {
          const t = toPlace === 1 ? 0.5 : j / (toPlace - 1);
          const offset = (t - 0.5) * sectorSpan;
          const nodeAngle = angle + offset;
          const rel = shown[placed + j];
          const entity = getEntity(rel.targetEntityId);
          const type = entity ? getEntityType(entity.typeId) : undefined;
          const selected =
            (activeRefId !== null && rel.refIds.includes(activeRefId)) ||
            (overlayEntityId !== null &&
              rel.targetEntityId === overlayEntityId);
          nodes.push({
            id: rel.id,
            title: entity?.title ?? "Unknown",
            color: type?.color ?? "#9ca3af",
            typeName: type?.name ?? "Unknown",
            evidenceCount: rel.evidenceCount,
            direction: rel.direction,
            x: CX + Math.cos(nodeAngle) * R,
            y: CY + Math.sin(nodeAngle) * R,
            r: Math.min(7, 4 + Math.sqrt(rel.evidenceCount) * 1.1),
            selected,
          });
        }
        placed += toPlace;
        ring++;
      }

      spokesArr.push({
        key,
        label: groupBy === "none" ? "Relationships" : getGroupLabel(key, groupBy),
        color: getGroupColor(key, groupBy),
        angle,
        targets: sortedTargets,
        labelX: CX + dirX * LABEL_DIST,
        labelY: CY + dirY * LABEL_DIST,
      });
    });

    return { spokes: spokesArr, nodes };
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
    if (!dragRef.current.moved && Math.hypot(dx, dy) > 3) dragRef.current.moved = true;
    setTransform((t) => ({ ...t, tx: dragRef.current.initTx + dx, ty: dragRef.current.initTy + dy }));
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
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ width: "100%", height: "100%", cursor: dragRef.current.active ? "grabbing" : "grab", touchAction: "none" }}
      >
        <defs>
          {/* Arrowhead: tip at refX, points along the line direction. We draw
              outgoing edges label→node (tip at target) and incoming edges
              node→label (tip near source) so a single marker-end suffices. */}
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
        <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {/* Edges: when grouped, source → label → fan to nodes. When
              groupBy === "none" there's nothing useful to label, so lines
              fan directly from the source circle's edge. */}
          {spokes.map((s) => {
            const branchNodes = nodes.filter((n) => s.targets.some((t) => t.id === n.id));
            const direct = groupBy === "none";
            return (
              <g key={s.key}>
                {!direct && (
                  <line
                    x1={CX}
                    y1={CY}
                    x2={s.labelX}
                    y2={s.labelY}
                    stroke="var(--border-primary)"
                    strokeWidth={1}
                    opacity={0.75}
                  />
                )}
                {branchNodes.map((n) => {
                  const out = n.direction === "outgoing";
                  // Anchor at the spoke's label position when grouped, or at
                  // the source circle's centre when ungrouped.
                  const ax = direct ? CX : s.labelX;
                  const ay = direct ? CY : s.labelY;
                  const dx = n.x - ax;
                  const dy = n.y - ay;
                  const len = Math.hypot(dx, dy) || 1;
                  const ux = dx / len;
                  const uy = dy / len;
                  const nodePad = n.r + 3;
                  const anchorPad = direct ? SOURCE_R + 2 : 14;
                  const startX = ax + ux * anchorPad;
                  const startY = ay + uy * anchorPad;
                  const endX = n.x - ux * nodePad;
                  const endY = n.y - uy * nodePad;
                  return (
                    <line
                      key={`${s.key}-${n.id}`}
                      x1={out ? startX : endX}
                      y1={out ? startY : endY}
                      x2={out ? endX : startX}
                      y2={out ? endY : startY}
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

          {/* Relation-type labels (midway). Skipped when ungrouped — no
              meaningful label to apply. */}
          {groupBy !== "none" && spokes.map((s) => {
            const isCollapsed = !!collapsed[s.key];
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
                  x={s.labelX - 55}
                  y={s.labelY - 11}
                  width={110}
                  height={22}
                  rx={4}
                  fill="var(--bg-surface)"
                  stroke={s.color ?? "var(--border-primary)"}
                  strokeWidth={1}
                />
                <text
                  x={s.labelX}
                  y={s.labelY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill="var(--text-secondary)"
                >
                  {isCollapsed ? `${s.label} (${s.targets.length})` : s.label}
                </text>
              </g>
            );
          })}

          {/* Source node */}
          <g>
            <circle
              cx={CX}
              cy={CY}
              r={SOURCE_R}
              fill={sourceType?.color ?? "#8b5cf6"}
              stroke="var(--text-primary)"
              strokeWidth={1.5}
            />
            <text
              x={CX}
              y={CY + SOURCE_R + 14}
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
                  setHover({ node: n, x: e.clientX - rect.left, y: e.clientY - rect.top });
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
                  setOverlayEntityId(n.id.split("::")[0]);
                }}
                style={{ cursor: "pointer" }}
              />
            </g>
          ))}

        </g>
      </svg>

      {hover && containerRef.current && (() => {
        const rect = containerRef.current.getBoundingClientRect();
        const estWidth = Math.min(240, Math.max(140, hover.node.title.length * 7 + 24));
        const estHeight = 44;
        const pad = 8;
        const left = Math.min(rect.width - estWidth - pad, Math.max(pad, hover.x + 12));
        const top = Math.min(rect.height - estHeight - pad, Math.max(pad, hover.y - estHeight - 10));
        return (
          <div
            className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-md bg-ink text-paper shadow-md max-w-[240px]"
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
          onClick={() => setTransform((t) => ({ ...t, scale: Math.max(0.4, t.scale / 1.2) }))}
          className="h-6 w-6 text-sm text-ink-secondary hover:text-ink cursor-pointer"
          aria-label="Zoom out"
        >
          −
        </button>
        <span className="text-[10px] tabular-nums text-ink-tertiary w-9 text-center">
          {Math.round(transform.scale * 100)}%
        </span>
        <button
          onClick={() => setTransform((t) => ({ ...t, scale: Math.min(2.5, t.scale * 1.2) }))}
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
