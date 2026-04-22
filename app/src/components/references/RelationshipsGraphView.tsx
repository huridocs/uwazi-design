import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { referencesAtom, overlayEntityIdAtom } from "../../atoms/references";
import {
  searchQueryAtom,
  activeClusterRefIdsAtom,
  relationshipTypeFiltersAtom,
  relationshipEntityTypeFiltersAtom,
} from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { relationTypes, RelationType } from "../../data/references";
import { currentDocument } from "../../data/document";
import { buildMatcher } from "../../utils/searchQuery";
import { deriveRelationships, Relationship } from "../../utils/relationships";

interface GraphNode {
  id: string;
  title: string;
  color: string;
  typeName: string;
  evidenceCount: number;
  x: number;
  y: number;
  r: number;
}

interface Spoke {
  relationType: RelationType;
  label: string;
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
  const [relTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);

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
        const haystack = `${ref.sourceSelection.text} ${entity?.title ?? ""} ${ref.relationType}`;
        return matcher(haystack);
      });
    }
    return result;
  }, [references, searchQuery, activeClusterRefIds, relTypeFilters, entityTypeFilters]);

  const { spokes, nodes } = useMemo(() => {
    const rels = deriveRelationships(filteredRefs);
    const byRelType = new Map<RelationType, Relationship[]>();
    for (const r of rels) {
      const list = byRelType.get(r.relationType) ?? [];
      list.push(r);
      byRelType.set(r.relationType, list);
    }
    const sorted = Array.from(byRelType.entries()).sort(([a], [b]) => {
      const la = relationTypes.find((t) => t.id === a)?.label ?? a;
      const lb = relationTypes.find((t) => t.id === b)?.label ?? b;
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

    sorted.forEach(([relationType, targets], i) => {
      const angle = spokeCount === 1 ? -Math.PI / 2 : (i / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const isCollapsed = !!collapsed[relationType];
      const sortedTargets = [...targets].sort((a, b) => b.evidenceCount - a.evidenceCount);
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
          const t =
            toPlace === 1 ? 0.5 : j / (toPlace - 1);
          const offset = (t - 0.5) * sectorSpan;
          const nodeAngle = angle + offset;
          const rel = shown[placed + j];
          const entity = getEntity(rel.targetEntityId);
          const type = entity ? getEntityType(entity.typeId) : undefined;
          nodes.push({
            id: rel.id,
            title: entity?.title ?? "Unknown",
            color: type?.color ?? "#9ca3af",
            typeName: type?.name ?? "Unknown",
            evidenceCount: rel.evidenceCount,
            x: CX + Math.cos(nodeAngle) * R,
            y: CY + Math.sin(nodeAngle) * R,
            r: Math.min(7, 4 + Math.sqrt(rel.evidenceCount) * 1.1),
          });
        }
        placed += toPlace;
        ring++;
      }

      spokesArr.push({
        relationType,
        label: relationTypes.find((t) => t.id === relationType)?.label ?? relationType,
        angle,
        targets: sortedTargets,
        labelX: CX + dirX * LABEL_DIST,
        labelY: CY + dirY * LABEL_DIST,
      });
    });

    return { spokes: spokesArr, nodes };
  }, [filteredRefs, collapsed]);

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
        <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {/* Edges: source → label, then fan from label → each node */}
          {spokes.map((s) => {
            const branchNodes = nodes.filter((n) => s.targets.some((t) => t.id === n.id));
            return (
              <g key={s.relationType}>
                <line
                  x1={CX}
                  y1={CY}
                  x2={s.labelX}
                  y2={s.labelY}
                  stroke="var(--border-primary)"
                  strokeWidth={1}
                  opacity={0.75}
                />
                {branchNodes.map((n) => (
                  <line
                    key={`${s.relationType}-${n.id}`}
                    x1={s.labelX}
                    y1={s.labelY}
                    x2={n.x}
                    y2={n.y}
                    stroke="var(--border-primary)"
                    strokeWidth={1}
                    opacity={0.45}
                  />
                ))}
              </g>
            );
          })}

          {/* Relation-type labels (midway) */}
          {spokes.map((s) => {
            const isCollapsed = !!collapsed[s.relationType];
            return (
              <g
                key={`label-${s.relationType}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setCollapsed((c) => ({ ...c, [s.relationType]: !c[s.relationType] }));
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
                  stroke="var(--border-primary)"
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
              <circle
                data-node="1"
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.color}
                stroke="var(--bg-surface)"
                strokeWidth={1.5}
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
