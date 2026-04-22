import { useMemo, useRef, useState } from "react";
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

const VIEW_W = 1000;
const VIEW_H = 800;
const CX = VIEW_W / 2;
const CY = VIEW_H / 2;
const SOURCE_R = 26;

export function RelationshipsGraphView() {
  const [references] = useAtom(referencesAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const [activeClusterRefIds] = useAtom(activeClusterRefIdsAtom);
  const [relTypeFilters] = useAtom(relationshipTypeFiltersAtom);
  const [entityTypeFilters] = useAtom(relationshipEntityTypeFiltersAtom);
  const setOverlayEntityId = useSetAtom(overlayEntityIdAtom);

  const svgRef = useRef<SVGSVGElement>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{ node: GraphNode; cx: number; cy: number } | null>(null);
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
    const outerRadius = Math.min(VIEW_W, VIEW_H) * 0.42;
    const nodes: GraphNode[] = [];
    const spokesArr: Spoke[] = [];

    sorted.forEach(([relationType, targets], i) => {
      const angle = spokeCount === 1 ? -Math.PI / 2 : (i / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const isCollapsed = !!collapsed[relationType];
      const sortedTargets = [...targets].sort((a, b) => b.evidenceCount - a.evidenceCount);
      const shown = isCollapsed ? sortedTargets.slice(0, 1) : sortedTargets;
      const dirX = Math.cos(angle);
      const dirY = Math.sin(angle);

      shown.forEach((rel, idx) => {
        const t = (shown.length === 1 ? 0.75 : 0.35 + (idx / Math.max(1, shown.length - 1)) * 0.65);
        const dist = SOURCE_R + 40 + t * (outerRadius - SOURCE_R - 40);
        const entity = getEntity(rel.targetEntityId);
        const type = entity ? getEntityType(entity.typeId) : undefined;
        nodes.push({
          id: rel.id,
          title: entity?.title ?? "Unknown",
          color: type?.color ?? "#9ca3af",
          typeName: type?.name ?? "Unknown",
          evidenceCount: rel.evidenceCount,
          x: CX + dirX * dist,
          y: CY + dirY * dist,
          r: Math.min(14, 5 + Math.sqrt(rel.evidenceCount) * 2),
        });
      });

      const labelT = 0.18;
      const labelDist = SOURCE_R + 40 + labelT * (outerRadius - SOURCE_R - 40);
      spokesArr.push({
        relationType,
        label: relationTypes.find((t) => t.id === relationType)?.label ?? relationType,
        angle,
        targets: sortedTargets,
        labelX: CX + dirX * labelDist,
        labelY: CY + dirY * labelDist,
      });
    });

    return { spokes: spokesArr, nodes };
  }, [filteredRefs, collapsed]);

  const sourceType = getEntityType(currentDocument.entityTypeId);

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setTransform((t) => ({
      ...t,
      scale: Math.max(0.4, Math.min(2.5, t.scale * factor)),
    }));
  };

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
    <div className="relative flex-1 overflow-hidden bg-warm">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        style={{ width: "100%", height: "100%", cursor: dragRef.current.active ? "grabbing" : "grab", touchAction: "none" }}
      >
        <g transform={`translate(${transform.tx} ${transform.ty}) scale(${transform.scale})`} style={{ transformOrigin: `${CX}px ${CY}px` }}>
          {/* Edges */}
          {spokes.map((s) => {
            const targets = nodes.filter((n) => s.targets.some((t) => t.id === n.id));
            return (
              <g key={s.relationType}>
                {targets.map((n) => (
                  <line
                    key={`${s.relationType}-${n.id}`}
                    x1={CX}
                    y1={CY}
                    x2={n.x}
                    y2={n.y}
                    stroke="var(--border-primary)"
                    strokeWidth={1}
                    opacity={0.7}
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
                  fill="var(--bg-paper, #fff)"
                  stroke="var(--border-primary)"
                  strokeWidth={1}
                />
                <text
                  x={s.labelX}
                  y={s.labelY + 4}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={500}
                  fill="var(--ink-secondary, #4b4237)"
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
              stroke="var(--ink, #1c1712)"
              strokeWidth={1.5}
            />
            <text
              x={CX}
              y={CY + SOURCE_R + 14}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="var(--ink, #1c1712)"
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
                stroke="var(--paper, #fff)"
                strokeWidth={1.5}
                onPointerEnter={() => setHover({ node: n, cx: n.x, cy: n.y })}
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

          {/* Hover tooltip */}
          {hover && (
            <g transform={`translate(${hover.cx + 12} ${hover.cy - 20})`} pointerEvents="none">
              <rect
                x={0}
                y={0}
                width={Math.max(120, hover.node.title.length * 6.2)}
                height={40}
                rx={4}
                fill="var(--ink, #1c1712)"
                opacity={0.92}
              />
              <text x={8} y={16} fontSize={11} fontWeight={600} fill="var(--paper, #fff)">
                {hover.node.title.length > 26
                  ? hover.node.title.slice(0, 24) + "…"
                  : hover.node.title}
              </text>
              <text x={8} y={30} fontSize={10} fill="var(--paper, #fff)" opacity={0.8}>
                {hover.node.typeName} · {hover.node.evidenceCount} evidence
              </text>
            </g>
          )}
        </g>
      </svg>

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
