import { useAtom, useSetAtom } from "jotai";
import {
  referencesAtom,
  scrollToRefAtom,
  scrollToHighlightAtom,
  activeRefIdAtom,
  activeDrawerTabAtom,
  expandGroupForRefAtom,
} from "../../atoms/references";
import { collapseAllSignalAtom } from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { TextSelection } from "../../data/references";
import { useEffect, useState } from "react";

interface PageHighlightsProps {
  page: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Split a bounding-box selection into per-line rects based on text length */
function splitIntoLineRects(sel: TextSelection) {
  const lineHeight = 0.02;
  const charsPerLine = 90;
  const textLen = sel.text.length;
  const totalLines = Math.ceil(textLen / charsPerLine);

  if (totalLines <= 1) {
    // Single line — width proportional to text length
    const fraction = Math.min(textLen / charsPerLine, 1);
    return [{ top: sel.top, left: sel.left, width: sel.width * fraction, height: lineHeight }];
  }

  const rects: { top: number; left: number; width: number; height: number }[] = [];
  let y = sel.top;
  const fullLines = totalLines - 1;
  const remainderFraction = (textLen % charsPerLine) / charsPerLine || 1;

  for (let i = 0; i < fullLines; i++) {
    rects.push({ top: y, left: sel.left, width: sel.width, height: lineHeight });
    y += lineHeight;
  }

  // Last line — shorter width
  rects.push({ top: y, left: sel.left, width: sel.width * remainderFraction, height: lineHeight });

  return rects;
}

export function PageHighlights({ page }: PageHighlightsProps) {
  const [references] = useAtom(referencesAtom);
  const [activeRefId] = useAtom(activeRefIdAtom);
  const setScrollToRef = useSetAtom(scrollToRefAtom);
  const setActiveDrawerTab = useSetAtom(activeDrawerTabAtom);
  const setExpandGroupForRef = useSetAtom(expandGroupForRefAtom);
  const setCollapseSignal = useSetAtom(collapseAllSignalAtom);
  const [scrollToHighlight, setScrollToHighlight] = useAtom(scrollToHighlightAtom);
  const [flashId, setFlashId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const pageRefs = references.filter((r) => r.sourceSelection.page === page);

  useEffect(() => {
    if (scrollToHighlight && pageRefs.some((r) => r.id === scrollToHighlight)) {
      setFlashId(scrollToHighlight);
      setScrollToHighlight(null);
      const timer = setTimeout(() => setFlashId(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [scrollToHighlight, pageRefs, setScrollToHighlight]);

  if (pageRefs.length === 0) return null;

  const handleHighlightClick = (refId: string) => {
    setActiveDrawerTab("references");
    setCollapseSignal((s) => s + 1);
    setExpandGroupForRef(refId);
    setScrollToRef(refId);
  };

  return (
    <>
      {pageRefs.map((ref) => {
        const sel = ref.sourceSelection;
        const entity = getEntity(ref.targetEntityId);
        const entityType = entity ? getEntityType(entity.typeId) : undefined;
        const color = entityType?.color ?? "#D97706";
        const isFlashing = flashId === ref.id;
        const isActive = activeRefId === ref.id;
        const isHovered = hoveredId === ref.id;
        const showTag = isActive || isHovered;
        const lineRects = splitIntoLineRects(sel);

        let bgAlpha: number;
        if (isFlashing) bgAlpha = 0.22;
        else if (isActive) bgAlpha = 0.16;
        else if (isHovered) bgAlpha = 0.12;
        else bgAlpha = 0.08;

        return lineRects.map((rect, i) => {
          const isFirst = i === 0;
          const tagAbove = rect.top >= 0.05;

          return (
            <div
              key={`${ref.id}-${i}`}
              role={isFirst ? "button" : undefined}
              tabIndex={isFirst ? 0 : undefined}
              aria-label={isFirst ? `Reference: ${sel.text.slice(0, 60)}` : undefined}
              onKeyDown={isFirst ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleHighlightClick(ref.id);
                }
              } : undefined}
              className={`absolute cursor-pointer rounded-[2px] transition-colors duration-150
                ${isFlashing ? "flash-highlight" : ""}`}
              style={{
                top: `${rect.top * 100}%`,
                left: `${rect.left * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
                backgroundColor: hexToRgba(color, bgAlpha),
                zIndex: isActive || isHovered ? 10 : 5,
              }}
              onClick={() => handleHighlightClick(ref.id)}
              onMouseEnter={() => setHoveredId(ref.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Entity name tag on first line rect */}
              {isFirst && showTag && entity && (
                <span
                  className="absolute whitespace-nowrap px-1.5 py-[3px] rounded text-[10px] font-medium leading-none pointer-events-none"
                  style={{
                    left: 0,
                    ...(tagAbove
                      ? { bottom: "100%", marginBottom: 4 }
                      : { top: "100%", marginTop: 4 }),
                    backgroundColor: color,
                    color: "#fff",
                    zIndex: 20,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }}
                >
                  {entity.title}
                </span>
              )}
            </div>
          );
        });
      })}
    </>
  );
}
