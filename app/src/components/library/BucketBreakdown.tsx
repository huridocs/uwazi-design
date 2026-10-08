import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TypeSlice } from "../../utils/timeline";

/** What a period is made of — the tooltip body shared by the timeline's density
 *  rail (whose stacked bars need a key) and the brush strip (whose silhouette
 *  carries no colour at all, so this is the ONLY place its composition shows). */
export function BucketBreakdown({
  label,
  total,
  slices,
  max = 5,
}: {
  label: string;
  total: number;
  slices: TypeSlice[];
  max?: number;
}) {
  // Sorted by count HERE, not by the chart's global stack order. The stack has to
  // keep one order across every bar to stay comparable, but a readout that lists
  // "Causa 8" above "Informe 29" just looks broken.
  const ranked = [...slices].sort((a, b) => b.n - a.n);
  const top = ranked.slice(0, max);
  const rest = ranked.length - top.length;
  return (
    <span data-component="BucketBreakdown" className="block text-start">
      <span data-part="total" className="block font-semibold tabular-nums pb-0.5">
        {label} · {total.toLocaleString()}
      </span>
      {top.map((s) => (
        <span key={s.typeId} data-part="slice" data-type-id={s.typeId} className="flex items-center gap-1.5 leading-[14px]">
          <span data-part="dot" aria-hidden className="w-1.5 h-1.5 rounded-[2px] shrink-0" style={{ backgroundColor: s.color }} />
          <span className="opacity-80">{s.name}</span>
          <span className="ms-auto ps-3 tabular-nums">{s.n.toLocaleString()}</span>
        </span>
      ))}
      {rest > 0 && <span data-part="more" className="block opacity-60 leading-[14px]">+{rest} more</span>}
    </span>
  );
}

/** The dark floating label both charts use. `anchor` picks which side it grows
 *  toward — HTML overlay, never an SVG <text> inside a scaled viewBox. */
export function ChartTip({
  children,
  anchor = "start",
}: {
  children: React.ReactNode;
  anchor?: "start" | "above";
}) {
  // The tip is portalled and fixed, so no clipping ancestor (a scrolling
  // chart, the Overview's sheet) can cut it. A hidden marker stays where the
  // tip is mounted; its parent is the hovered mark, measured once on mount.
  // "above": over the mark, below it where there is no room; "start": beside
  // it on the start side, the end side where there is no room. Never over
  // the mark, always inside the viewport.
  const markerRef = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useLayoutEffect(() => {
    const host = markerRef.current?.parentElement;
    const tip = tipRef.current;
    if (!host || !tip) return;
    const r = host.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 6;
    const EDGE = 8;
    let left: number;
    let top: number;
    if (anchor === "above") {
      left = r.left + r.width / 2 - w / 2;
      top = r.top - GAP - h;
      if (top < EDGE) top = r.bottom + GAP;
    } else {
      top = r.top + r.height / 2 - h / 2;
      left = r.left - GAP - w;
      if (left < EDGE) left = r.right + GAP;
    }
    left = Math.max(EDGE, Math.min(vw - w - EDGE, left));
    top = Math.max(EDGE, Math.min(vh - h - EDGE, top));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
    tip.style.visibility = "visible";
  });
  return (
    <>
      <span ref={markerRef} aria-hidden className="hidden" />
      {mounted &&
        createPortal(
          <span
            ref={tipRef}
            data-component="ChartTip"
            data-anchor={anchor}
            role="tooltip"
            className="fixed z-[60] pointer-events-none text-meta font-medium whitespace-nowrap rounded-md"
            style={{
              left: 0,
              top: 0,
              visibility: "hidden",
              padding: "4px 7px",
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-surface)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {children}
          </span>,
          document.body,
        )}
    </>
  );
}
