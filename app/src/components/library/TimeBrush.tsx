import { useCallback, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryActiveFilterCountAtom,
  clearLibraryFiltersAtom,
} from "../../atoms/library";
import {
  bucketSeries,
  entityTime,
  formatDay,
  pickUnit,
  stackByType,
  timeExtent,
  toISODate,
  typeOrder,
  type TimeBucket,
} from "../../utils/timeline";
import { breakpointAtom } from "../../atoms/viewport";
import { BucketBreakdown, ChartTip } from "./BucketBreakdown";
import type { Entity } from "../../data/entities";

interface DragState {
  mode: "start" | "end" | "pan" | "new";
  grabMs: number;
  from: number;
  to: number;
  /** Where the pointer went down. A gesture that ends near here is a TAP, not a
   *  drag — whatever mode it started in. (When the range is full the window
   *  overlay covers the whole strip, so a plain click arrives as a "pan".) */
  origin: number;
  moved: boolean;
}

/** The Bellingcat-style time strip: a density histogram of the (date-unfiltered)
 *  results with a draggable range window over it. It writes the SAME
 *  `libraryDateFrom/To` atoms the Filters panel uses, so brushing narrows every
 *  view — cards, list, map, timeline — and shows up as the usual filter chip.
 *
 *  `entities` must be the results filtered by everything EXCEPT the date facet
 *  (`matchesAll(e, state, "date")`), so the bars keep showing what you'd get
 *  back by widening the window. */
export function TimeBrush({ entities }: { entities: Entity[] }) {
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const activeFilterCount = useAtomValue(libraryActiveFilterCountAtom);
  const isMobile = useAtomValue(breakpointAtom) === "mobile";
  const clearFilters = useSetAtom(clearLibraryFiltersAtom);
  const trackRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<TimeBucket | null>(null);
  // The live window during a drag. Held in a ref as well as state: the ref is
  // written synchronously in pointerdown, so a fast flick whose pointermove
  // lands before React has re-rendered still resolves.
  const dragRef = useRef<DragState | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const extent = useMemo(() => timeExtent(entities), [entities]);
  const unit = useMemo(() => (extent ? pickUnit(extent.max - extent.min) : "year"), [extent]);
  const buckets = useMemo(
    () => (extent ? bucketSeries(entities, unit, extent) : []),
    [entities, unit, extent],
  );
  // The shape carries no colour, so the ONLY place a period's composition shows
  // is the hover tooltip — hence the stable order still matters here.
  const order = useMemo(() => typeOrder(entities), [entities]);
  // Read by the pointer-driven hover handler, which is defined before `buckets`.
  const bucketsRef = useRef<TimeBucket[]>([]);
  bucketsRef.current = buckets;

  // The strip's own axis spans whole buckets, so the first and last bar aren't
  // clipped by an extent that lands mid-bucket.
  const axis = useMemo(() => {
    if (!buckets.length) return null;
    return { min: buckets[0].start, max: buckets[buckets.length - 1].end };
  }, [buckets]);

  const fromMs = dateFrom ? Date.parse(dateFrom) : null;
  const toMs = dateTo ? Date.parse(dateTo) : null;
  const winFrom = drag ? drag.from : fromMs ?? axis?.min ?? 0;
  const winTo = drag ? drag.to : toMs ?? axis?.max ?? 0;

  const inRange = useMemo(
    () =>
      entities.filter((e) => {
        const t = entityTime(e);
        return t !== null && t >= winFrom && t <= winTo;
      }).length,
    [entities, winFrom, winTo],
  );

  const commit = useCallback(
    (from: number, to: number, full: boolean) => {
      if (full) {
        setDateFrom("");
        setDateTo("");
      } else {
        setDateFrom(toISODate(from));
        setDateTo(toISODate(to));
      }
    },
    [setDateFrom, setDateTo],
  );

  const msAt = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || !axis) return 0;
      const r = el.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
      return axis.min + f * (axis.max - axis.min);
    },
    [axis],
  );

  /** Hover is derived from the pointer's x, NOT from per-bucket pointerenter:
   *  the draggable window overlay covers the track, so it would swallow every
   *  enter event on the columns beneath it. */
  const onHover = (ev: React.PointerEvent) => {
    if (!axis || !bucketsRef.current.length) return;
    const at = msAt(ev.clientX);
    const hit = bucketsRef.current.find((b) => at >= b.start && at < b.end) ?? null;
    setHovered((prev) => (prev?.key === hit?.key ? prev : hit));
  };

  const onMove = (ev: React.PointerEvent) => {
    onHover(ev);
    const d = dragRef.current;
    if (!d || !axis) return;
    const span = axis.max - axis.min;
    const MIN_WIN = span / 200;
    const at = msAt(ev.clientX);
    if (Math.abs(at - d.origin) > span / 300) d.moved = true;
    let next: DragState;
    if (d.mode === "start") next = { ...d, from: Math.min(at, d.to - MIN_WIN) };
    else if (d.mode === "end") next = { ...d, to: Math.max(at, d.from + MIN_WIN) };
    else if (d.mode === "new")
      next = { ...d, from: Math.min(d.grabMs, at), to: Math.max(d.grabMs, at) };
    else {
      // pan — keep the window width, clamp to the axis
      const w = d.to - d.from;
      const from = Math.max(axis.min, Math.min(d.from + (at - d.grabMs), axis.max - w));
      next = { ...d, from, to: from + w, grabMs: at };
    }
    dragRef.current = next;
    setDrag(next);
  };

  const onUp = (ev: React.PointerEvent) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!d || !axis) return;
    trackRef.current?.releasePointerCapture?.(ev.pointerId);

    // Tap (no real movement) → select the PERIOD under the pointer, exactly like
    // clicking a bar on the Density track. Tap the selected period again to clear.
    if (!d.moved) {
      const hit = bucketsRef.current.find((b) => d.origin >= b.start && d.origin < b.end);
      if (!hit) return;
      const alreadyOn =
        fromMs !== null && toMs !== null && hit.start >= fromMs && hit.end - 1 <= toMs + 86_399_999;
      if (alreadyOn) commit(axis.min, axis.max, true);
      else commit(hit.start, hit.end - 86_400_000, false);
      return;
    }
    commit(d.from, d.to, d.from <= axis.min && d.to >= axis.max);
  };

  // Nothing dated to chart. Hold the strip's place and SAY so, rather than
  // vanishing: an empty result set is a state worth reading, and a strip that
  // unmounts drops the results pane down by its own height at the exact moment
  // the user is trying to work out why they got nothing.
  if (!axis || !buckets.length) {
    return (
      <div
        dir="ltr"
        className="shrink-0 bg-paper px-3 pt-1.5 pb-2 select-none"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="flex items-center gap-2 h-6">
          <span className="text-[11px] text-ink-tertiary">
            {entities.length
              ? `None of these ${entities.length.toLocaleString()} results carry a date`
              : "No results to plot"}
          </span>
          <div className="flex-1" />
          {activeFilterCount > 0 && (
            <button
              onClick={() => clearFilters()}
              className="px-2 h-5 text-[11px] font-medium rounded-md bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="relative h-11">
          <div
            className="absolute left-0 right-0 bottom-0"
            style={{ height: 1, backgroundColor: "var(--border-primary)" }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-[11px] text-ink-muted">
            {entities.length ? "Nothing to plot on the timeline" : "Widen your filters to see the timeline"}
          </span>
        </div>
        <div className="h-3.5" />
      </div>
    );
  }

  const span = axis.max - axis.min;
  const pct = (ms: number) => ((ms - axis.min) / span) * 100;
  const maxCount = Math.max(1, ...buckets.map((b) => b.entities.length));
  const isFull = !dateFrom && !dateTo;

  // The silhouette, in a 0..100 × 0..100 space (y is inverted: 100 = baseline).
  const shape = (() => {
    if (!buckets.length) return "";
    let d = `M 0 100`;
    for (const b of buckets) {
      const n = b.entities.length;
      const y = 100 - (n ? 8 + Math.sqrt(n / maxCount) * 92 : 0);
      d += ` L ${pct(b.start)} ${y} L ${pct(b.end)} ${y}`;
    }
    d += ` L 100 100 Z`;
    return d;
  })();

  // Zoom presets — the last N of the axis, sized to the corpus span.
  const YEAR = 365.2425 * 86_400_000;
  const presets: { label: string; ms: number }[] = (
    span / YEAR > 8
      ? [
          { label: "20y", ms: 20 * YEAR },
          { label: "10y", ms: 10 * YEAR },
          { label: "5y", ms: 5 * YEAR },
          { label: "1y", ms: YEAR },
        ]
      : [
          { label: "12m", ms: YEAR },
          { label: "6m", ms: YEAR / 2 },
          { label: "3m", ms: YEAR / 4 },
        ]
  ).filter((p) => p.ms < span);

  // Axis ticks — every Nth bucket boundary, thinned to fit.
  const tickEvery = Math.max(1, Math.ceil(buckets.length / 12));
  const ticks = buckets.filter((_, i) => i % tickEvery === 0);

  const startDrag = (mode: DragState["mode"]) => (ev: React.PointerEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    const at = msAt(ev.clientX);
    const d: DragState =
      mode === "new"
        ? { mode, grabMs: at, from: at, to: at, origin: at, moved: false }
        : { mode, grabMs: at, from: winFrom, to: winTo, origin: at, moved: false };
    dragRef.current = d;
    setDrag(d);
    // Capture on the track, so moves that leave the strip still land here.
    trackRef.current?.setPointerCapture?.(ev.pointerId);
  };

  const nudge = (which: "start" | "end", dir: 1 | -1) => {
    const step = buckets[0].end - buckets[0].start;
    const next =
      which === "start"
        ? { from: Math.max(axis.min, Math.min(winFrom + dir * step, winTo - step)), to: winTo }
        : { from: winFrom, to: Math.min(axis.max, Math.max(winTo + dir * step, winFrom + step)) };
    commit(next.from, next.to, false);
  };

  return (
    <div
      dir="ltr"
      className="shrink-0 bg-paper px-3 pt-1.5 pb-2 select-none"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      {/* Caption + presets. On a phone the range reads as YEARS, not full dates,
          and the zoom presets step aside — five of them plus "All" ran straight
          off a 414px screen. "All" stays: it's the way back. */}
      <div className="flex items-center gap-2 h-6">
        <span className="text-[11px] text-ink-tertiary tabular-nums whitespace-nowrap">
          <span className="font-semibold text-ink-secondary">{inRange.toLocaleString()}</span>
          {" dated · "}
          <span className="text-ink-secondary">
            {isMobile ? new Date(winFrom).getUTCFullYear() : formatDay(winFrom)}
          </span>
          {" → "}
          <span className="text-ink-secondary">
            {isMobile ? new Date(winTo).getUTCFullYear() : formatDay(winTo)}
          </span>
        </span>
        <div className="flex-1" />
        {hovered && !isMobile && (
          <span className="text-[11px] text-ink-tertiary tabular-nums whitespace-nowrap">
            {hovered.label} · {hovered.entities.length.toLocaleString()}
          </span>
        )}
        {!isMobile &&
          presets.map((p) => (
            <button
              key={p.label}
              onClick={() => commit(axis.max - p.ms, axis.max, false)}
              className="px-2 h-5 text-[11px] font-medium rounded-md bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink transition-colors cursor-pointer"
            >
              {p.label}
            </button>
          ))}
        <button
          onClick={() => commit(axis.min, axis.max, true)}
          disabled={isFull}
          className={`px-2 h-5 text-[11px] font-medium rounded-md transition-colors ${
            isFull
              ? "text-ink-muted"
              : "bg-warm text-ink-tertiary hover:bg-parchment hover:text-ink cursor-pointer"
          }`}
        >
          All
        </button>
      </div>

      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-11 cursor-crosshair touch-none"
        onPointerDown={startDrag("new")}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onPointerLeave={() => setHovered(null)}
      >
        {/* The volume SHAPE — one stepped area off the baseline, not N stacked
            bars. Steps, not a spline: each bucket is a discrete count, and a
            smooth curve would draw values between periods nobody measured.
            (An SVG is a replaced element — with only top/bottom set it would
            take its intrinsic viewBox height and ignore `bottom`. State it.) */}
        <svg
          className="absolute inset-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <clipPath id="brush-window" clipPathUnits="userSpaceOnUse">
              <rect
                x={pct(winFrom)}
                y={0}
                width={Math.max(0, pct(winTo) - pct(winFrom))}
                height={100}
              />
            </clipPath>
          </defs>
          {/* Whole span, receded — what widening the window would give back. It
              has to stay legible: at 0.08 a narrow window made the rest of the
              corpus vanish, which is the failure this two-layer draw exists to
              prevent. */}
          <path d={shape} fill="var(--accent-blue)" opacity={isFull ? 0.18 : 0.14} />
          {/* Inside the window, lit */}
          <g clipPath="url(#brush-window)">
            <path d={shape} fill="var(--accent-blue)" opacity={0.26} />
            <path
              d={shape}
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth={1}
              strokeOpacity={0.85}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        </svg>

        {/* Hover readout — purely visual (the track owns the pointer). */}
        <div className="absolute inset-0 flex items-end pointer-events-none">
          {buckets.map((b) => {
            const n = b.entities.length;
            const h = n ? 8 + Math.sqrt(n / maxCount) * 92 : 0;
            const isHov = hovered?.key === b.key;
            return (
              <div
                key={b.key}
                className="relative flex-1 min-w-0 h-full flex items-end justify-center"
              >
                {isHov && (
                  <>
                    {/* Marker up to the shape's edge at this period */}
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"
                      style={{
                        width: 1,
                        height: `${h}%`,
                        backgroundColor: "var(--text-primary)",
                      }}
                    />
                    <span
                      className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                      style={{
                        bottom: `calc(${h}% - 2px)`,
                        width: 5,
                        height: 5,
                        backgroundColor: "var(--text-primary)",
                      }}
                    />
                    <span
                      className="absolute left-1/2 pointer-events-none"
                      style={{ bottom: `${h}%` }}
                    >
                      <ChartTip anchor="above">
                        <BucketBreakdown
                          label={b.label}
                          total={n}
                          slices={stackByType(b.entities, order)}
                        />
                      </ChartTip>
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Baseline */}
        <div
          className="absolute left-0 right-0 bottom-0"
          style={{ height: 1, backgroundColor: "var(--border-primary)" }}
        />

        {/* Out-of-range scrims */}
        {!isFull && (
          <>
            <div
              className="absolute top-0 bottom-0 left-0 pointer-events-none"
              style={{ width: `${pct(winFrom)}%`, backgroundColor: "var(--bg-warm)", opacity: 0.6 }}
            />
            <div
              className="absolute top-0 bottom-0 pointer-events-none"
              style={{
                left: `${pct(winTo)}%`,
                right: 0,
                backgroundColor: "var(--bg-warm)",
                opacity: 0.6,
              }}
            />
          </>
        )}

        {/* Window */}
        <div
          className="absolute top-0 bottom-0 cursor-grab active:cursor-grabbing"
          style={{
            left: `${pct(winFrom)}%`,
            width: `${pct(winTo) - pct(winFrom)}%`,
            borderInline: "1px solid var(--accent-blue)",
            backgroundColor: "color-mix(in srgb, var(--accent-blue) 7%, transparent)",
          }}
          onPointerDown={startDrag("pan")}
        />

        {/* Handles */}
        {(["start", "end"] as const).map((which) => (
          <div
            key={which}
            role="slider"
            tabIndex={0}
            aria-label={which === "start" ? "Range start" : "Range end"}
            aria-valuemin={axis.min}
            aria-valuemax={axis.max}
            aria-valuenow={which === "start" ? winFrom : winTo}
            aria-valuetext={formatDay(which === "start" ? winFrom : winTo)}
            onPointerDown={startDrag(which)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") (e.preventDefault(), nudge(which, -1));
              if (e.key === "ArrowRight") (e.preventDefault(), nudge(which, 1));
            }}
            className="absolute top-0 bottom-0 w-3 -ml-1.5 flex items-center justify-center cursor-ew-resize
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40 rounded-sm"
            style={{ left: `${pct(which === "start" ? winFrom : winTo)}%` }}
          >
            <span
              className="rounded-full"
              style={{
                width: 3,
                height: "72%",
                backgroundColor: "var(--accent-blue)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Axis */}
      <div className="relative h-3.5">
        {ticks.map((b) => {
          // Clamp the end ticks so they don't hang off the strip.
          const p = pct(b.start);
          const shift = p < 4 ? "none" : p > 96 ? "translateX(-100%)" : "translateX(-50%)";
          return (
            <span
              key={b.key}
              className="absolute top-0 text-[9px] tabular-nums whitespace-nowrap"
              style={{ left: `${p}%`, transform: shift, color: "var(--text-muted)" }}
            >
              {b.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
