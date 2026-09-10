import { ReactNode, useState, useCallback, useRef } from "react";
import { DrawerWidthProvider, useDrawerWidth } from "../../hooks/useDrawerWidth";

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
  // The drawer's width is remembered ONCE for every host (`drawerWidthAtom`), so
  // it holds across views; `useDrawerWidth` clamps it into this host's minimum
  // and half this container.
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, clamp, setStoredWidth, measured } = useDrawerWidth(containerRef, {
    defaultWidth: defaultRightWidth,
    minWidth: minRightWidth,
  });
  // The live width while a drag is in progress — kept local so a drag doesn't
  // write to storage on every mousemove. `null` when not dragging.
  const [dragWidth, setDragWidth] = useState<number | null>(null);

  const rightWidth = dragWidth === null ? width : clamp(dragWidth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = rightWidth;
      let latest = startWidth;
      setDragWidth(startWidth);

      const handleMouseMove = (e: MouseEvent) => {
        latest = clamp(startWidth + (startX - e.clientX));
        setDragWidth(latest);
      };

      const handleMouseUp = () => {
        setDragWidth(null);
        // A press without movement is not a choice of width — writing it would
        // turn this host's default into every host's width.
        if (latest !== startWidth) setStoredWidth(latest);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [rightWidth, clamp, setStoredWidth]
  );

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Both panes wait for the container's first measure — see `measured`. */}
      <div className="flex-1 overflow-hidden">{measured && left}</div>
      <div
        className={`w-1 cursor-col-resize hover:bg-carbon/30 transition-colors shrink-0 ${
          dragWidth !== null ? "bg-carbon/30" : "bg-transparent"
        }`}
        onMouseDown={handleMouseDown}
      />
      <div
        className="shrink-0 overflow-hidden bg-paper border-l border-border"
        style={{ width: rightWidth }}
      >
        {/* Panels stacked INSIDE the drawer (the connected-entity overlay) read
            this resolved width rather than the box they happen to be mounted in. */}
        <DrawerWidthProvider value={rightWidth}>{measured && right}</DrawerWidthProvider>
      </div>
    </div>
  );
}
