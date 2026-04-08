import { useAtom, useSetAtom } from "jotai";
import { referencesAtom, scrollToHighlightAtom, scrollToRefAtom, activeRefIdAtom, activeDrawerTabAtom, expandGroupForRefAtom } from "../../atoms/references";
import { collapseAllSignalAtom, searchQueryAtom, activeClusterRefIdsAtom } from "../../atoms/filters";
import { currentPageAtom } from "../../atoms/selection";
import { getEntity, getEntityType } from "../../data/entities";
import { useEffect, useMemo, useState } from "react";
import { Reference } from "../../data/references";
import { FileText, Layers } from "lucide-react";

interface RefMinimapProps {
  numPages: number;
}

interface DotInfo {
  ref: Reference;
  color: string;
  entityName: string;
}

interface ClusterInfo {
  yPercent: number;
  dots: DotInfo[];
}

const BASE_DOT = 6;
const MAX_DOT = 14;

export function RefMinimap({ numPages }: RefMinimapProps) {
  const [references] = useAtom(referencesAtom);
  const [activeRefId, setActiveRefId] = useAtom(activeRefIdAtom);
  const setScrollToHighlight = useSetAtom(scrollToHighlightAtom);
  const setScrollToRef = useSetAtom(scrollToRefAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setExpandGroupForRef = useSetAtom(expandGroupForRefAtom);
  const setCollapseSignal = useSetAtom(collapseAllSignalAtom);
  const [expandedCluster, setExpandedCluster] = useState<number | null>(null);
  const [hoveredDot, setHoveredDot] = useState<string | null>(null);
  const [mode, setMode] = useState<"global" | "page">("global");
  const [currentPage] = useAtom(currentPageAtom);
  const [searchQuery] = useAtom(searchQueryAtom);
  const setActiveClusterRefIds = useSetAtom(activeClusterRefIdsAtom);

  // Dot size scales with total ref count: 6px at 1 ref → 14px at 200+
  const dotSize = Math.min(MAX_DOT, BASE_DOT + Math.floor(references.length / 25));
  const clusterSize = dotSize + 8;

  const clusters = useMemo<ClusterInfo[]>(() => {
    if (numPages === 0) return [];

    const thresholdPercent = 1.2;

    // Apply same search filter as the drawer
    let baseRefs = references;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      baseRefs = baseRefs.filter((ref) => {
        const entity = getEntity(ref.targetEntityId);
        return (
          ref.sourceSelection.text.toLowerCase().includes(q) ||
          entity?.title.toLowerCase().includes(q) ||
          ref.relationType.toLowerCase().includes(q)
        );
      });
    }

    const filteredRefs = mode === "page"
      ? baseRefs.filter((r) => r.sourceSelection.page === currentPage)
      : baseRefs;

    const items = filteredRefs.map((ref) => {
      const sel = ref.sourceSelection;
      const entity = getEntity(ref.targetEntityId);
      const entityType = entity ? getEntityType(entity.typeId) : undefined;
      const yFraction = mode === "page"
        ? sel.top
        : (sel.page - 1 + sel.top) / numPages;
      return {
        yPercent: 8 + yFraction * 88,
        dot: {
          ref,
          color: entityType?.color ?? "#D97706",
          entityName: entity?.title ?? "",
        },
      };
    });

    items.sort((a, b) => a.yPercent - b.yPercent);

    const result: ClusterInfo[] = [];
    let i = 0;
    while (i < items.length) {
      let j = i + 1;
      let sumY = items[i].yPercent;
      const dots: DotInfo[] = [items[i].dot];
      while (j < items.length && items[j].yPercent - items[i].yPercent < thresholdPercent) {
        dots.push(items[j].dot);
        sumY += items[j].yPercent;
        j++;
      }
      result.push({ yPercent: sumY / dots.length, dots });
      i = j;
    }

    return result;
  }, [references, numPages, mode, currentPage, searchQuery]);

  // Collapse cluster when clicking outside (activeRefId becomes null)
  useEffect(() => {
    if (activeRefId === null) {
      setExpandedCluster(null);
      setActiveClusterRefIds(null);
    }
  }, [activeRefId, setActiveClusterRefIds]);

  if (numPages === 0 || references.length === 0) return null;

  const handleDotClick = (refId: string, fromCluster?: number) => {
    // Close cluster only if clicking a dot outside the open cluster
    if (expandedCluster !== null && fromCluster !== expandedCluster) {
      setExpandedCluster(null);
      setActiveClusterRefIds(null);
    }
    setActiveRefId(refId);
    setActiveDrawerTab("references");
    setCollapseSignal((s) => s + 1);
    setExpandGroupForRef(refId);
    setScrollToRef(refId);
    setScrollToHighlight(refId);
  };

  const handleClusterClick = (ci: number) => {
    if (expandedCluster === ci) {
      setExpandedCluster(null);
      setActiveClusterRefIds(null);
    } else {
      setExpandedCluster(ci);
      setActiveClusterRefIds(clusters[ci].dots.map((d) => d.ref.id));
    }
  };

  return (
    <div
      className="absolute pointer-events-none"
      style={{ top: 8, bottom: 8, right: 40, width: clusterSize, zIndex: 5 }}
    >
      {/* Mode toggle */}
      <div
        className="absolute pointer-events-auto flex flex-col items-center"
        style={{ top: 0, left: "50%", transform: "translateX(-50%)" }}
      >
        <button
          onClick={() => setMode(mode === "global" ? "page" : "global")}
          className="flex items-center justify-center rounded-md transition-colors hover:bg-warm"
          style={{
            width: 22,
            height: 22,
            color: "var(--text-tertiary)",
          }}
          title={mode === "global" ? "Whole document" : `Page ${currentPage}`}
        >
          {mode === "global" ? <Layers size={12} /> : <FileText size={12} />}
        </button>
      </div>

      {/* Track line */}
      <div
        className="absolute rounded-full"
        style={{
          top: 28,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 2,
          backgroundColor: "var(--border-soft)",
          opacity: 0.5,
        }}
      />

      {clusters.map((cluster, ci) => {
        const isExpanded = expandedCluster === ci;
        const isSingle = cluster.dots.length === 1;
        const hasActiveRef = cluster.dots.some((d) => d.ref.id === activeRefId);

        // Single dot — centered on track
        if (isSingle) {
          const { ref, color, entityName } = cluster.dots[0];
          const isActive = activeRefId === ref.id;
          const isHov = hoveredDot === ref.id;
          const size = isActive ? 14 : isHov ? 12 : dotSize;

          return (
            <div
              key={ref.id}
              className="absolute pointer-events-auto cursor-pointer"
              style={{ top: `${cluster.yPercent}%`, left: "50%", transform: "translate(-50%, -50%)", padding: 3 }}
              onClick={() => handleDotClick(ref.id)}
              onMouseEnter={() => setHoveredDot(ref.id)}
              onMouseLeave={() => setHoveredDot(null)}
              title={entityName}
            >
              <div
                className="rounded-full transition-all duration-150"
                style={{
                  width: size, height: size,
                  backgroundColor: color,
                  opacity: isActive || isHov ? 1 : 0.7,
                  boxShadow: isActive ? `0 0 0 2px ${color}44` : "none",
                }}
              />
            </div>
          );
        }

        // Cluster — subtle size scaling, capped
        const count = cluster.dots.length;
        const scale = Math.min(count / 10, 1);
        const outerSize = clusterSize + scale * 4;

        return (
          <div
            key={`c-${ci}`}
            className="absolute pointer-events-auto"
            style={{
              top: `${cluster.yPercent}%`,
              left: "50%",
              transform: "translateY(-50%)",
            }}
          >
            {/* Cluster square with count — always visible */}
            <div
              className="cursor-pointer relative flex items-center justify-center"
              style={{
                width: outerSize,
                height: outerSize,
                marginLeft: -outerSize / 2,
              }}
              onClick={() => handleClusterClick(ci)}
            >
              <div
                className="rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  width: outerSize,
                  height: outerSize,
                  border: `1.5px solid ${isExpanded || hasActiveRef ? "var(--text-secondary)" : "var(--border-soft)"}`,
                  backgroundColor: isExpanded || hasActiveRef ? "var(--bg-muted)" : "var(--bg-surface, #fff)",
                }}
              >
                <span
                  className="text-[9px] font-bold leading-none"
                  style={{ color: isExpanded || hasActiveRef ? "var(--text-primary)" : "var(--text-tertiary)" }}
                >
                  {count}
                </span>
              </div>
            </div>

            {/* Expanded: SVG tree branching left from cluster dot */}
            {isExpanded && (() => {
              const rowH = 22;
              const n = cluster.dots.length;
              const dotS = dotSize;
              const pad = 2; // padding around each dot for hit area
              const stemLen = 12;
              const branchLen = 16;
              const trunkX = dotS + pad + branchLen;
              const svgW = trunkX + stemLen;
              const totalH = (n - 1) * rowH + dotS;
              const midY = totalH / 2;

              return (
                <svg
                  className="absolute pointer-events-auto"
                  style={{
                    top: -(totalH / 2) + outerSize / 2,
                    right: "50%",
                    marginRight: outerSize / 2 + 4,
                    width: svgW,
                    height: totalH,
                    overflow: "visible",
                  }}
                >
                  {/* Stem: from right edge to trunk */}
                  <line
                    x1={trunkX} y1={midY}
                    x2={svgW} y2={midY}
                    stroke="var(--text-tertiary)" strokeWidth={1} opacity={0.4}
                  />
                  {/* Trunk: vertical */}
                  <line
                    x1={trunkX} y1={dotS / 2}
                    x2={trunkX} y2={totalH - dotS / 2}
                    stroke="var(--text-tertiary)" strokeWidth={1} opacity={0.4}
                  />
                  {/* Branches + dots */}
                  {cluster.dots.map(({ ref, color, entityName }, i) => {
                    const cy = i * rowH + dotS / 2;
                    const isActive = activeRefId === ref.id;
                    const isHov = hoveredDot === ref.id;
                    const s = isActive ? 14 : isHov ? 12 : dotS;

                    return (
                      <g key={ref.id}>
                        {/* Branch line */}
                        <line
                          x1={dotS + pad} y1={cy}
                          x2={trunkX} y2={cy}
                          stroke="var(--text-tertiary)" strokeWidth={1} opacity={0.4}
                        />
                        {/* Dot square */}
                        <rect
                          x={pad / 2 + (dotS - s) / 2}
                          y={cy - s / 2}
                          width={s} height={s}
                          rx={99}
                          fill={color}
                          opacity={isActive || isHov ? 1 : 0.8}
                          className="cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); handleDotClick(ref.id, ci); }}
                          onMouseEnter={() => setHoveredDot(ref.id)}
                          onMouseLeave={() => setHoveredDot(null)}
                        >
                          <title>{entityName}</title>
                        </rect>
                        {/* Active ring */}
                        {isActive && (
                          <rect
                            x={pad / 2 + (dotS - s) / 2 - 2}
                            y={cy - s / 2 - 2}
                            width={s + 4} height={s + 4}
                            rx={99}
                            fill="none"
                            stroke={color}
                            strokeWidth={1.5}
                            opacity={0.3}
                          />
                        )}
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        );
      })}
    </div>
  );
}
