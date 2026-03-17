import { ReactNode, useState, useCallback } from "react";

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
}

export function SplitView({
  left,
  right,
  defaultRightWidth = 400,
  minRightWidth = 320,
  maxRightWidth = 600,
}: SplitViewProps) {
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isDragging, setIsDragging] = useState(false);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);

      const startX = e.clientX;
      const startWidth = rightWidth;

      const handleMouseMove = (e: MouseEvent) => {
        const delta = startX - e.clientX;
        const newWidth = Math.min(
          maxRightWidth,
          Math.max(minRightWidth, startWidth + delta)
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

  return (
    <div className="flex flex-1 overflow-hidden">
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
