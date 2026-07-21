import { ReactNode, useState, useCallback, useRef, useEffect } from "react";

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = rightWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startX - e.clientX;
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
    [rightWidth, minRightWidth, maxRightWidth]
  );

  // Shrinking the window must pull the drawer back so it never exceeds half.
  useEffect(() => {
    const onResize = () =>
      setRightWidth((w) => Math.max(minRightWidth, Math.min(maxRightWidth(), w)));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [minRightWidth, maxRightWidth]);

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">{left}</div>
      <div
        className={`w-1 cursor-col-resize hover:bg-carbon/30 transition-colors shrink-0 ${
          isDragging ? "bg-carbon/30" : "bg-transparent"
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
