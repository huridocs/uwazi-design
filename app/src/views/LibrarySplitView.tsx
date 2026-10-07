import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { useAtomValue, useStore } from "jotai";
import { ScopeProvider } from "jotai-scope";
import { dataSourceAtom } from "../atoms/dataSource";
import { rightPaneStore } from "../atoms/librarySplit";
import {
  LibraryPaneProvider,
  MastheadFoldProvider,
  notePointerPane,
  type LibraryPaneSide,
  type MastheadFoldValue,
} from "../components/library/libraryPane";
import { SelectionOrderHost, type SelectionOrderHolder } from "../components/library/EntitySelectBox";
import { LibraryView } from "./LibraryView";

/** Each pane's narrowest width. */
const PANE_MIN_REM = 28;
/** The divider's own width; it paints the left pane's edge. */
const DIVIDER_PX = 5;

/* Split (navbar Settings › Library layout, ≥1024px): two Library panes side by
   side, each a full Full width Library with its own masthead, body, brush and
   rail. The left pane is the root store; the right pane is a scope that lives
   for the session (`atoms/librarySplit.ts`). The language, the collection and
   the Notebook are shared. The divider sets the left pane's share while Split
   is on screen; Split opens at 50/50 every time (choosing it, a reload, Back
   from the entity view, a collection switch). RTL mirrors the row, so the
   left pane is then on the right. */
export function LibrarySplitView() {
  const root = useStore();
  const right = useMemo(() => rightPaneStore(root), [root]);
  const leftId = useId();

  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // The left pane's share, kept in this component so every mount starts at
  // 50/50; a collection switch starts it again too.
  const source = useAtomValue(dataSourceAtom);
  const [ratio, setRatio] = useState({ source, share: 0.5 });
  const stored = ratio.source === source ? ratio.share : 0.5;
  const setStored = (share: number) => setRatio({ source, share });
  // The live share during a drag, kept on release.
  const [drag, setDrag] = useState<number | null>(null);
  const dragStart = useRef(0);
  const span = Math.max(1, width - DIVIDER_PX);
  const remPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  // Unmeasured, no clamp; narrower than two minimums, an even split.
  const minShare = width === 0 ? 0 : Math.min(0.5, (PANE_MIN_REM * remPx) / span);
  const clamp = useCallback((r: number) => Math.min(1 - minShare, Math.max(minShare, r)), [minShare]);
  const share = clamp(drag ?? stored);

  /* The divider moves with the pointer: the share is the pointer's distance
     from the left pane's outer edge, which is the container's right edge in
     RTL. Read at the gesture, since the language can flip while this stays. */
  const isRtl = () => !!containerRef.current && getComputedStyle(containerRef.current).direction === "rtl";
  const shareAt = (clientX: number) => {
    const box = containerRef.current!.getBoundingClientRect();
    const fromStart = isRtl() ? box.right - clientX : clientX - box.left;
    return clamp((fromStart - DIVIDER_PX / 2) / span);
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = share;
    setDrag(share);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag !== null) setDrag(shareAt(e.clientX));
  };
  const onPointerUp = () => {
    // A press without movement is not a choice of width.
    if (drag !== null && drag !== dragStart.current) setStored(drag);
    setDrag(null);
  };

  /* Arrows move the divider, so ArrowRight widens the left pane in LTR and
     narrows it in RTL; Shift takes a bigger stride. Home and End take a pane
     to its minimum: Home the left pane, End the right. */
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    const toward = isRtl() ? -1 : 1;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = share + toward * step;
    else if (e.key === "ArrowLeft") next = share - toward * step;
    else if (e.key === "Home") next = minShare;
    else if (e.key === "End") next = 1 - minShare;
    if (next === null) return;
    e.preventDefault();
    setStored(clamp(next));
  };

  // Each pane's masthead tier; both draw the more folded one.
  const [tiers, setTiers] = useState<Record<LibraryPaneSide, number>>({ left: 0, right: 0 });
  const report = useCallback(
    (side: LibraryPaneSide, tier: number) => setTiers((t) => (t[side] === tier ? t : { ...t, [side]: tier })),
    [],
  );
  const fold = useMemo<MastheadFoldValue>(() => ({ tier: Math.max(tiers.left, tiers.right), report }), [tiers, report]);

  const dragging = drag !== null;
  const percent = (r: number) => Math.round(r * 100);

  return (
    <MastheadFoldProvider value={fold}>
    <div
      ref={containerRef}
      data-component="LibrarySplit"
      className={`flex flex-1 min-h-0 overflow-hidden ${dragging ? "select-none cursor-col-resize" : ""}`}
    >
      <LibraryPane
        side="left"
        id={leftId}
        style={{ flex: `0 0 calc((100% - ${DIVIDER_PX}px) * ${share})` }}
      />
      <div
        role="separator"
        data-part="divider"
        aria-orientation="vertical"
        aria-label="Resize panes"
        aria-controls={leftId}
        aria-valuenow={percent(share)}
        aria-valuemin={percent(minShare)}
        aria-valuemax={percent(1 - minShare)}
        aria-valuetext={`Left pane ${percent(share)}%`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        onDoubleClick={() => setStored(0.5)}
        onKeyDown={onKeyDown}
        className="group relative z-40 shrink-0 cursor-col-resize touch-none focus:outline-none"
        style={{ width: DIVIDER_PX }}
      >
        {/* The hit area, wider than the line and costing no layout. */}
        <span aria-hidden className="absolute inset-y-0 -start-1.5 -end-1.5" />
        {/* The edge, the hairline both panes would draw. */}
        <span
          aria-hidden
          className={`absolute inset-y-0 start-[2px] w-px transition-colors ${
            dragging ? "bg-carbon" : "bg-border group-hover:bg-carbon/60"
          } group-focus-visible:bg-carbon`}
        />
        {/* The grip, present at rest, as on the drawer's divider (`SplitView`). */}
        <span
          aria-hidden
          className={`absolute top-1/2 -translate-y-1/2 rounded-full transition-all ${
            dragging
              ? "h-10 w-[3px] start-px bg-carbon"
              : "h-8 w-px start-[2px] bg-ink/25 group-hover:h-10 group-hover:w-[3px] group-hover:start-px group-hover:bg-carbon/70 group-focus-visible:h-10 group-focus-visible:w-[3px] group-focus-visible:start-px group-focus-visible:bg-carbon"
          }`}
        />
      </div>
      <ScopeProvider scope={right}>
        <LibraryPane side="right" style={{ flex: "1 1 0" }} />
      </ScopeProvider>
    </div>
    </MastheadFoldProvider>
  );
}

/** One pane: a landmark with its own name, the pane context its keys and
 *  touches check, and its own Shift-range order. */
function LibraryPane({ side, id, style }: { side: LibraryPaneSide; id?: string; style: CSSProperties }) {
  const root = useRef<HTMLElement | null>(null);
  const pane = useMemo(() => ({ side, root }), [side]);
  const order = useMemo<SelectionOrderHolder>(() => ({ current: [] }), []);
  return (
    <section
      ref={root}
      id={id}
      data-library-pane={side}
      data-trap-scope
      aria-label={side === "left" ? "Library, left pane" : "Library, right pane"}
      onPointerEnter={() => notePointerPane(side)}
      className="min-w-0 flex flex-col overflow-hidden"
      style={style}
    >
      <LibraryPaneProvider value={pane}>
        <SelectionOrderHost value={order}>
          <LibraryView />
        </SelectionOrderHost>
      </LibraryPaneProvider>
    </section>
  );
}
