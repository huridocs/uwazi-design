import { ReactNode, useState, useCallback, useRef, useLayoutEffect } from "react";
import { useAtom } from "jotai";
import { drawerWidthAtom } from "../../atoms/session";

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
  // it holds across views. Hosts differ only in their default and minimum, which
  // is why the stored value is clamped here on read rather than stored per host.
  const [storedWidth, setStoredWidth] = useAtom(drawerWidthAtom);
  // The live width while a drag is in progress — kept local so a drag doesn't
  // write to storage on every mousemove. `null` when not dragging.
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(Infinity);
  const containerRef = useRef<HTMLDivElement>(null);

  // The drawer grows to at most HALF the split container's width — no fixed
  // pixel cap. Measured from the container, not the viewport, and before paint so
  // a remembered width wider than this host allows never flashes.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      // A hidden container reports 0; keep the last real width.
      if (el.clientWidth > 0) setContainerWidth(el.clientWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = useCallback(
    (w: number) => Math.max(minRightWidth, Math.min(containerWidth / 2, w)),
    [minRightWidth, containerWidth],
  );

  // Shrinking the window pulls the drawer back to half without overwriting what
  // was remembered, so growing it again restores the dragged width.
  const rightWidth = clamp(dragWidth ?? storedWidth ?? defaultRightWidth);

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
      <div className="flex-1 overflow-hidden">{left}</div>
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
        {right}
      </div>
    </div>
  );
}
