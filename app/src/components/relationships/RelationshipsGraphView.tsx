import { useEffect, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import {
  overlayEntityIdAtom,
  activeRefIdAtom,
} from "../../atoms/references";
import { groupByAtom } from "../../atoms/filters";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { useFilteredReferences } from "./useFilteredReferences";
import { getEntity, getEntityType } from "../../data/entities";
import { Direction } from "../../data/references";
import { currentDocument } from "../../data/document";
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
/** Max relationships plotted — beyond this the radial graph is slow + unreadable. */
const GRAPH_CAP = 150;

export function RelationshipsGraphView() {
  const [groupBy] = useAtom(groupByAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const [overlayEntityId, setOverlayEntityId] = useAtom(overlayEntityIdAtom);
  const activeRefId = useAtomValue(activeRefIdAtom);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ tx: 0, ty: 0, scale: 1 });
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [hover, setHover] = useState<{ node: GraphNode; x: number; y: number } | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);
  // WHICH node you clicked. Selection is stored per ENTITY (overlayEntityIdAtom),
  // but a node is a relationship AGGREGATE — target × type × direction — so one
  // entity can own several nodes ("Cites", "Refers To", "Relates To"… all to the
  // same case). Keying the highlight off the entity alone lit every one of them
  // and there was no way to tell which you'd picked. They ARE all that entity, so
  // dimming them would be a lie: the clicked node goes primary, its siblings keep
  // a quiet ring that says "same entity, different relation".
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initTx: number;
    initTy: number;
    moved: boolean;
  }>({ active: false, startX: 0, startY: 0, initTx: 0, initTy: 0, moved: false });

  // Shared pipeline — applies every facet the list view applies (country,
  // descriptor, inherited included). Sort is irrelevant to the radial layout.
  const filteredRefs = useFilteredReferences({ sort: false });

  const { spokes, nodes, truncated } = useMemo(() => {
    // Graph has no "hub container" node — every entity that participates
    // shows up as its own node, so let hub members through deriveRelationships.
    const allRels = deriveRelationships(filteredRefs, { includeHubMembers: true });
    // A radial graph of thousands of nodes is both unreadable and slow — keep
    // the most-evidenced relationships and surface how many were dropped.
    const rels =
      allRels.length > GRAPH_CAP
        ? [...allRels].sort((a, b) => b.evidenceCount - a.evidenceCount).slice(0, GRAPH_CAP)
        : allRels;
    const truncated = allRels.length - rels.length;

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
    // Clamped: past ~52 spokes the gap subtraction would go negative and
    // collapse every fan into a straight radial line.
    const sectorSpan =
      spokeCount === 1
        ? Math.PI * 1.4
        : Math.max(0.05, (Math.PI * 2) / spokeCount - 0.12);

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

    return { spokes: spokesArr, nodes, truncated };
  }, [filteredRefs, collapsed, groupBy, activeRefId, overlayEntityId]);

  // The root is THIS entity — the one whose relationships these are. It was
  // `currentDocument`, the hardcoded sample document, so every graph claimed a
  // "Court Case" at its centre no matter whose page you were on: a Sentencia's
  // own connections radiated from someone else's node.
  const sourceEntity = getEntity(focusedId);
  const sourceType = getEntityType(sourceEntity?.typeId ?? currentDocument.entityTypeId);
  const sourceTitle = sourceEntity?.title ?? currentDocument.title;

  // Did the open entity get opened FROM the graph? If it was selected elsewhere
  // (a list row, the overlay), no single node owns the click — so every node of
  // that entity reads as primary, the old behaviour, rather than all of them
  // going faint with nothing to anchor them.
  const pickedInGraph = nodes.some((n) => n.selected && n.id === clickedNodeId);

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

  // FIT the drawing to the pane instead of opening at a flat 100%. The layout is
  // laid out in a fixed 1200×900 viewBox sized for a big fan, so an entity with
  // five connections drew a speck in the middle of the canvas while a País with
  // a hundred overflowed it. The scale that matters is the one that makes the
  // content fill the space it has.
  //
  // The group is `translate(tx ty) scale(s)` about the origin (CX,CY), so a point
  // p lands at O + t + s·(p − O). Putting the content's centre c at the viewport
  // centre gives t = s·(O − c).
  const fitTransform = useMemo(() => {
    if (nodes.length === 0) return { tx: 0, ty: 0, scale: 1 };

    // Start from the source node — it's always drawn, and its label hangs below.
    // The source's own label is wider than its circle and hangs below it — bound
    // the LABEL, or a fit crops the name of the entity the graph is about.
    let minX = CX - 120;
    let maxX = CX + 120;
    let minY = CY - SOURCE_R;
    let maxY = CY + SOURCE_R + 34;

    for (const n of nodes) {
      minX = Math.min(minX, n.x - n.r);
      maxX = Math.max(maxX, n.x + n.r);
      minY = Math.min(minY, n.y - n.r);
      maxY = Math.max(maxY, n.y + n.r);
    }
    // Spoke labels are pills around their anchor — bound them generously, since a
    // clipped label is exactly the thing a "fit" is supposed to prevent.
    for (const s of spokes) {
      minX = Math.min(minX, s.labelX - 60);
      maxX = Math.max(maxX, s.labelX + 60);
      minY = Math.min(minY, s.labelY - 14);
      maxY = Math.max(maxY, s.labelY + 14);
    }

    const PAD = 40;
    const scale = Math.max(
      0.4,
      Math.min(
        2.5,
        Math.min((VIEW_W - PAD * 2) / (maxX - minX), (VIEW_H - PAD * 2) / (maxY - minY)),
      ),
    );
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return { scale, tx: scale * (CX - cx), ty: scale * (CY - cy) };
  }, [nodes, spokes]);

  // Re-fit when the DRAWING changes (filters, grouping, collapse) — not on every
  // render, or panning and zooming would snap back under your cursor.
  const fitKey = `${nodes.map((n) => n.id).join("|")}::${spokes.map((s) => s.key).join("|")}`;
  const lastFitKey = useRef<string | null>(null);
  useEffect(() => {
    if (lastFitKey.current === fitKey) return;
    lastFitKey.current = fitKey;
    setTransform(fitTransform);
  }, [fitKey, fitTransform]);

  const resetView = () => setTransform(fitTransform);

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
      {truncated > 0 && (
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-md bg-paper/90 text-[11px] text-ink-tertiary shadow-sm"
          style={{ border: "1px solid var(--border-soft)" }}
        >
          Showing the top {GRAPH_CAP} of {(GRAPH_CAP + truncated).toLocaleString()} relationships
        </div>
      )}
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
                tabIndex={0}
                role="button"
                aria-expanded={!isCollapsed}
                aria-label={`${s.label} branch — ${s.targets.length} relationships, ${
                  isCollapsed ? "collapsed" : "expanded"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }));
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setCollapsed((c) => ({ ...c, [s.key]: !c[s.key] }));
                  }
                }}
                onFocus={() => setFocusedNodeId(`label-${s.key}`)}
                onBlur={() => setFocusedNodeId(null)}
                style={{ cursor: "pointer", outline: "none" }}
              >
                <rect
                  x={s.labelX - 55}
                  y={s.labelY - 11}
                  width={110}
                  height={22}
                  rx={4}
                  fill="var(--bg-surface)"
                  stroke={
                    focusedNodeId === `label-${s.key}`
                      ? "var(--accent-blue)"
                      : s.color ?? "var(--border-primary)"
                  }
                  strokeWidth={focusedNodeId === `label-${s.key}` ? 1.5 : 1}
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
            {/* Its NAME first — the entity is the subject of the page, not an
                example of its template — with the template underneath, quieter. */}
            <title>{sourceTitle}</title>
            <text
              x={CX}
              y={CY + SOURCE_R + 15}
              textAnchor="middle"
              fontSize={12}
              fontWeight={600}
              fill="var(--text-primary)"
            >
              {truncate(sourceTitle, 34)}
            </text>
            <text
              x={CX}
              y={CY + SOURCE_R + 29}
              textAnchor="middle"
              fontSize={10}
              fill="var(--text-tertiary)"
            >
              {sourceType?.name ?? "Entity"}
            </text>
          </g>

          {/* Target nodes — keyboard-operable: each circle is a focusable
              button (Enter/Space opens the entity overlay, same as click).
              Focus shows a carbon halo + the tooltip, so keyboard users get
              the same identification hover users do. */}
          {nodes.map((n) => {
            // `n.selected` = this node's entity is the one open. `primary` = this
            // is the node you actually clicked. When one entity owns several
            // nodes (one per relation type), the siblings stay marked — they ARE
            // that entity — but only the clicked one gets the solid ring.
            const primary = n.selected && (pickedInGraph ? clickedNodeId === n.id : true);
            const sibling = n.selected && !primary;
            return (
            <g key={n.id}>
              {n.selected && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 5}
                  fill="none"
                  stroke="var(--text-primary)"
                  strokeWidth={primary ? 1.5 : 1}
                  strokeDasharray={sibling ? "2 2" : undefined}
                  opacity={primary ? 0.55 : 0.3}
                />
              )}
              {focusedNodeId === n.id && !n.selected && (
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={n.r + 5}
                  fill="none"
                  stroke="var(--accent-blue)"
                  strokeWidth={1.5}
                />
              )}
              <circle
                data-node="1"
                cx={n.x}
                cy={n.y}
                r={n.r}
                fill={n.color}
                stroke={
                  primary ? "var(--text-primary)" : "var(--bg-surface)"
                }
                strokeWidth={primary ? 2.5 : 1.5}
                tabIndex={0}
                role="button"
                aria-label={`${n.title} — ${n.typeName}, ${n.evidenceCount} evidence`}
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
                onFocus={(e) => {
                  setFocusedNodeId(n.id);
                  const rect = containerRef.current?.getBoundingClientRect();
                  const c = (e.currentTarget as SVGCircleElement).getBoundingClientRect();
                  if (!rect) return;
                  setHover({
                    node: n,
                    x: c.left + c.width / 2 - rect.left,
                    y: c.top - rect.top,
                  });
                }}
                onBlur={() => {
                  setFocusedNodeId(null);
                  setHover(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setClickedNodeId(n.id);
                    setOverlayEntityId(n.id.split("::")[0]);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.moved) return;
                  setClickedNodeId(n.id);
                  setOverlayEntityId(n.id.split("::")[0]);
                }}
                style={{ cursor: "pointer", outline: "none" }}
              />
            </g>
            );
          })}

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
            className="absolute z-10 pointer-events-none px-2.5 py-1.5 rounded-md bg-ink text-paper shadow-md max-w-60"
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

/** Node labels are drawn, not laid out — SVG text doesn't wrap or ellipsize, so a
 *  long entity name would run straight across the canvas. */
function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}
