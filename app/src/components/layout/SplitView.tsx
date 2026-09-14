import { ReactNode, useState, useCallback, useRef, useEffect } from "react";
import { SplitWidthProvider } from "../../hooks/useSplitWidth";

/** THE MINIMUM, for every host with a drawer.
 *
 *  It was 360 in the Library and 460 in the entity, Metadata, Relationships and
 *  Files views, so only the Library could be dragged into the range where its
 *  tab strips fold and it alone appeared to respond. 460 was roughly what kept
 *  the entity drawer's five-tab strip from overflowing; that strip folds now
 *  (`DrawerTabs`), which is what makes 360 safe. Connection tables stack below
 *  28.5rem and the metadata masonry is single-column below 44rem — a 460 drawer
 *  was already below both. */
export const DRAWER_MIN_WIDTH = 360;

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultRightWidth?: number;
  minRightWidth?: number;
}

export function SplitView({
  left,
  right,
  defaultRightWidth = 400,
  minRightWidth = 320,
}: SplitViewProps) {
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // The drawer grows to at most HALF the split container's width — no fixed
  // pixel cap. Read live so it tracks the container, not the viewport.
  const maxRightWidth = useCallback(
    () => (containerRef.current?.clientWidth ?? Infinity) / 2,
    [],
  );

  /* The drawer sits at the inline END: on the right in LTR, on the left in RTL,
     where the flex row mirrors. Moving the divider toward the drawer's side
     narrows it, so the sign of a leftward move flips with the direction. Read
     from the computed style at the moment of the gesture, because the language
     (and with it `dir`) can change while this view stays mounted. */
  const leftwardGrows = useCallback(
    () => !containerRef.current || getComputedStyle(containerRef.current).direction !== "rtl",
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = rightWidth;
      const sign = leftwardGrows() ? 1 : -1;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = sign * (startX - e.clientX);
        const newWidth = Math.max(
          minRightWidth,
          Math.min(maxRightWidth(), startWidth + delta)
        );
        setRightWidth(newWidth);
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightWidth, minRightWidth, maxRightWidth, leftwardGrows]
  );

  // Shrinking the window must pull the drawer back so it never exceeds half.
  useEffect(() => {
    const onResize = () =>
      setRightWidth((w) => Math.max(minRightWidth, Math.min(maxRightWidth(), w)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minRightWidth, maxRightWidth]);

  return (
    // Both panes read the drawer width, so a component that measures itself
    // (the tab strips' fold) re-renders and measures again when it changes.
    <SplitWidthProvider value={rightWidth}>
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">{left}</div>
      <div
        className={`w-1 cursor-col-resize hover:bg-carbon/30 transition-colors shrink-0 ${
          isDragging ? "bg-carbon/30" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
      {/* The rule sits on the drawer's inline start, the side facing the
          content: left in LTR, right in RTL where the row runs the other way. */}
      <div
        className="shrink-0 overflow-hidden bg-paper border-s border-border"
        style={{ width: rightWidth }}
      >
        {right}
      </div>
    </div>
    </SplitWidthProvider>
  );
}
