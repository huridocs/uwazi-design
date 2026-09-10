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
  const { width, clamp, maxWidth, setStoredWidth, measured } = useDrawerWidth(containerRef, {
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

  /* THE DIVIDER IS A CONTROL, not only a gesture.
     A keyboard user could not move it at all, and it announced nothing. Arrows
     step it; shift takes a bigger stride, the way a slider does. Left widens
     the drawer because the drawer is on the right — the key moves the DIVIDER,
     and the pane follows it. */
  const nudge = useCallback(
    (delta: number) => {
      const next = clamp(rightWidth + delta);
      if (next !== rightWidth) setStoredWidth(next);
    },
    [rightWidth, clamp, setStoredWidth],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 64 : 16;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(step);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(-step);
      } else if (e.key === "Home") {
        e.preventDefault();
        setStoredWidth(clamp(minRightWidth));
      } else if (e.key === "End") {
        e.preventDefault();
        setStoredWidth(clamp(Number.MAX_SAFE_INTEGER));
      }
    },
    [nudge, clamp, setStoredWidth, minRightWidth],
  );

  const dragging = dragWidth !== null;

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden">
      {/* Both panes wait for the container's first measure — see `measured`. */}
      <div className="flex-1 overflow-hidden">{measured && left}</div>
      {/* ONE EDGE, not two. The drawer used to carry `border-l` and the divider
          sat beside it as a 4px transparent strip, so the line you could see and
          the thing you could drag were different objects a few pixels apart —
          which is why this reads as "the drag is gone". The border moves HERE,
          painted at the divider's inline end so the rule stays at exactly the x
          it was at, and the pane keeps its geometry: 4px + 1px border becomes a
          5px divider that paints its own last pixel. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        aria-valuenow={Math.round(rightWidth)}
        aria-valuemin={Math.round(minRightWidth)}
        aria-valuemax={Math.round(Number.isFinite(maxWidth) ? maxWidth : rightWidth)}
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onKeyDown={handleKeyDown}
        className="group relative w-[5px] shrink-0 cursor-col-resize focus:outline-none"
      >
        {/* THE HIT AREA, wider than the line and costing no layout. 5px is
            under every pointer-target guideline; this takes 6px from each
            neighbour without moving either of them. */}
        <span aria-hidden className="absolute inset-y-0 -start-1.5 -end-1.5" />
        {/* The edge. `bg-border` at rest — the same hairline the pane drew. */}
        <span
          aria-hidden
          className={`absolute inset-y-0 end-0 w-px transition-colors ${
            dragging ? "bg-carbon" : "bg-border group-hover:bg-carbon/60"
          } group-focus-visible:bg-carbon`}
        />
        {/* THE GRIP, and it is present AT REST — a hover-only cue is invisible
            until you are already on the four pixels you were looking for, which
            is the whole defect. A short centred segment, a shade stronger than
            the hairline it interrupts: enough for the eye to land on, not enough
            to be furniture. It thickens and takes the accent on hover, focus or
            drag.

            `bg-ink/25` rather than a border token for the same reason the tab
            count uses an ink tint: it has to sit a shade above `--border-primary`
            on both themes, and a fixed neutral that does in light does not in
            dark. */}
        <span
          aria-hidden
          className={`absolute top-1/2 -translate-y-1/2 end-0 rounded-full transition-all ${
            dragging
              ? "h-10 w-[3px] -me-px bg-carbon"
              : "h-8 w-px bg-ink/25 group-hover:h-10 group-hover:w-[3px] group-hover:-me-px group-hover:bg-carbon/70 group-focus-visible:h-10 group-focus-visible:w-[3px] group-focus-visible:-me-px group-focus-visible:bg-carbon"
          }`}
        />
      </div>
      <div
        className="shrink-0 overflow-hidden bg-paper"
        style={{ width: rightWidth }}
      >
        {/* Panels stacked INSIDE the drawer (the connected-entity overlay) read
            this resolved width rather than the box they happen to be mounted in. */}
        <DrawerWidthProvider value={rightWidth}>{measured && right}</DrawerWidthProvider>
      </div>
    </div>
  );
}
