import { useCallback, useMemo, useRef, useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { CalendarDays, Layers } from "lucide-react";
import {
  libraryTimelineLayoutAtom,
  libraryTimelineScopeAtom,
  libraryDateFromAtom,
  libraryDateToAtom,
  libraryTypeFiltersAtom,
  type TimelineLayout,
  type TimelineScope,
} from "../../atoms/library";
import { getEntityType, type Entity } from "../../data/entities";
import {
  bucketOf,
  colorSpread,
  elapsed,
  entityTime,
  formatDay,
  groupByBucket,
  pickUnit,
  stackByType,
  timeExtent,
  toISODate,
  typeOrder,
  type TimeBucket,
  dateBoundMs,
} from "../../utils/timeline";
import { breakpointAtom } from "../../atoms/viewport";
import { BucketBreakdown, ChartTip } from "./BucketBreakdown";
import {
  EntitySelectBox,
  FOCUS_RING_ON_SELECT,
  SELECTED_LOOK_INSET,
  PREVIEWED_RING_INSET,
  holdTextSelection,
  useDrawnIds,
  useSelectionOrder,
} from "./EntitySelectBox";
import { EntityCard } from "./EntityCard";
import { HighlightedText } from "../shared/HighlightedText";
import { MatchOrigin } from "./MatchOrigin";
import { TimeSpine, SpineDate, useTrackGeom } from "./TimeSpine";

/** How many entities the proportional spine plots before it stops — the corpus
 *  runs to thousands and a row each would be a 200k-pixel column. Narrow the
 *  range to see the rest. */
const SPINE_CAP = 400;
/** Entities revealed per period group in the rail body before "+N more". */
const GROUP_CAP = 20;

interface Props {
  /** The results — every facet applied, date included. The BODIES render this. */
  entities: Entity[];
  /** Results with every facet applied EXCEPT the date range. The TRACKS render
   *  this, so picking a period doesn't collapse the very chart you picked from:
   *  out-of-range volume stays visible, just dimmed. */
  chart: Entity[];
  /** As `chart`, minus the template facet too — the Lanes grid keeps all its
   *  lanes after a drill-in, instead of shrinking to the one you clicked. */
  laneChart: Entity[];
  /** The committed-and-DEFERRED search, for the rows' marks — the same value
   *  `LibraryView` filtered with, passed down rather than read from
   *  `libraryQueryAtom` per row (see `EntityCard`). */
  query: string;
  selectedId: string | null;
  /** A row's click, with its event — Cmd/Ctrl and Shift select (the host
   *  reads the modifiers); a plain click previews. */
  onSelect: (id: string, e?: React.MouseEvent) => void;
  onView: (id: string) => void;
  countByEntity: Map<string, number>;
}

export function LibraryTimelineView(props: Props) {
  const layout = useAtomValue(libraryTimelineLayoutAtom);
  const { entities } = props;

  const dated = useMemo(() => sortByTime(entities), [entities]);
  const undated = entities.length - dated.length;
  // A Shift range runs in the order this view draws: by date.
  const datedIds = useMemo(() => dated.map((e) => e.id), [dated]);
  useSelectionOrder(datedIds);
  // What this layout DRAWS, for "select all loaded": the spine plots the first
  // SPINE_CAP, the lanes grid draws no entity rows, the list draws them all.
  const drawnIds = useMemo(
    () => (layout === "lanes" ? [] : layout === "spine" ? datedIds.slice(0, SPINE_CAP) : datedIds),
    [layout, datedIds],
  );
  useDrawnIds(drawnIds);

  if (!dated.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-ink-tertiary">
        {entities.length
          ? `None of these ${entities.length.toLocaleString()} entities carry a date.`
          : "No entities match your filters."}
      </div>
    );
  }

  const body =
    layout === "spine" ? (
      <SpineLayout {...props} dated={dated} />
    ) : layout === "lanes" ? (
      <LanesLayout {...props} dated={dated} />
    ) : (
      <TrackedList {...props} dated={dated} track={layout === "density" ? "density" : "clusters"} />
    );

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0">{body}</div>
      {undated > 0 && (
        <div className="shrink-0 pt-2 text-meta text-ink-tertiary">
          {undated.toLocaleString()} undated {undated === 1 ? "entity" : "entities"} not plotted.
        </div>
      )}
    </div>
  );
}

const sortByTime = (list: Entity[]) =>
  list.filter((e) => entityTime(e) !== null).sort((a, b) => entityTime(a)! - entityTime(b)!);

interface LayoutProps extends Props {
  dated: Entity[];
}

/** The active date range as ms, or null on either side. */
function useRange() {
  const [dateFrom, setDateFrom] = useAtom(libraryDateFromAtom);
  const [dateTo, setDateTo] = useAtom(libraryDateToAtom);
  const from = dateBoundMs(dateFrom, "from");
  const to = dateBoundMs(dateTo, "to");
  const covers = (b: { start: number; end: number }) =>
    (from === null || b.start >= from) && (to === null || b.end - 1 <= to);
  const overlaps = (b: { start: number; end: number }) =>
    (from === null || b.end > from) && (to === null || b.start <= to);
  /** Click a period → the range IS that period. Click it again → back to all. */
  const toggle = (b: TimeBucket) => {
    if (covers(b) && (from !== null || to !== null)) {
      setDateFrom("");
      setDateTo("");
    } else {
      setDateFrom(toISODate(b.start));
      setDateTo(toISODate(b.end - 86_400_000));
    }
  };
  return { from, to, covers, overlaps, toggle, isAll: from === null && to === null };
}

/* ------------------------------------------------------------------ *
 * 1 & 2 — RAIL and DENSITY. Same shell: a period-grouped list with a
 *     vertical time track on the right, where the document's reference
 *     minimap sits. Two tracks swap into it:
 *       · rail     — one neutral mark per period on a density scale,
 *                    quiet periods as template-coloured dots.
 *       · density  — the same periods as bars stacked by template.
 *     Clicking a period on either FILTERS the Library to it.
 * ------------------------------------------------------------------ */

/** A period with this many records or fewer draws them as dots in their
 *  template colours, where its band has room; busier ones are a bar. */
const DOT_CAP = 3;
/** Pixels kept clear between two periods' marks on the rail. */
const PERIOD_GAP = 2;
/** The least distance between two labels on the track's label column. */
const LABEL_PITCH = 18;

/** A label on the track's label column. `rank` is the year, or the month
 *  index in the year scope: labels are thinned to every 2nd, 5th, 10th… rank
 *  so the ones kept fall on round values. */
interface TrackMark {
  label: string;
  yPct: number;
  rank: number;
}

interface TrackProps {
  buckets: TimeBucket[];
  extent: { min: number; max: number };
  /** ms → % down the plotting area. Owned by the shell, because the year scope
   *  insets the plot to make room for the ↑/↓ edge counts. */
  pos: (ms: number) => number;
  marks: TrackMark[];
  scope: TimelineScope;
  setScope: (s: TimelineScope) => void;
  focusYear: number;
  before: number;
  after: number;
  activeKey: string | null;
  /** When the period at the top of the rows starts (the first one before any
   *  scroll): the rail tints the period that holds it, in either scope. */
  activeAt: number;
  hovered: string | null;
  setHovered: (k: string | null) => void;
  scrollToTime: (t: number) => void;
}

function TrackedList({
  dated,
  chart,
  query,
  selectedId,
  onSelect,
  onView,
  countByEntity,
  track,
}: LayoutProps & { track: "clusters" | "density" }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupRefs = useRef(new Map<string, HTMLDivElement>());
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [scope, setScope] = useAtom(libraryTimelineScopeAtom);

  // BOTH tracks plot the date-unfiltered results. Picking a period on either one
  // filters the Library to it — if the track drew the filtered set, it would
  // collapse to the single node you just clicked and there'd be no way back.
  // Out-of-range periods stay on the track, dimmed.
  const source = useMemo(() => {
    const c = sortByTime(chart);
    return c.length ? c : dated;
  }, [chart, dated]);
  const fullExtent = useMemo(() => timeExtent(source) ?? timeExtent(dated)!, [source, dated]);
  const unit = useMemo(() => pickUnit(fullExtent.max - fullExtent.min), [fullExtent]);
  const groups = useMemo(() => groupByBucket(dated, unit), [dated, unit]);

  // The year the reader is in — the period at the top of the list, else the first.
  const focusYear = useMemo(() => {
    const g = groups.find((x) => x.key === activeKey) ?? groups[0];
    return new Date(g?.start ?? fullExtent.min).getUTCFullYear();
  }, [groups, activeKey, fullExtent]);

  // Scope: the whole span, or one year at month granularity — the document
  // minimap's whole-document / this-page toggle, on time.
  const { extent, trackBuckets, before, after, marks, pos } = useMemo(() => {
    const isYear = scope === "year";
    // Whole periods: the first and last are not cut to their first and last
    // record, so every period gets the same band on the track.
    const extent = isYear
      ? { min: Date.UTC(focusYear, 0, 1), max: Date.UTC(focusYear + 1, 0, 1) - 1 }
      : { min: bucketOf(fullExtent.min, unit).start, max: bucketOf(fullExtent.max, unit).end - 1 };
    const inRange = isYear
      ? source.filter((e) => {
          const t = entityTime(e)!;
          return t >= extent.min && t <= extent.max;
        })
      : source;
    const trackBuckets = groupByBucket(inRange.length ? inRange : [], isYear ? "month" : unit);

    let before = 0;
    let after = 0;
    if (isYear)
      for (const e of source) {
        const t = entityTime(e)!;
        if (t < extent.min) before++;
        else if (t > extent.max) after++;
      }

    // Year scope insets the plot so the ↑/↓ edge counts have room.
    const top = isYear ? 12 : 3;
    const height = isYear ? 76 : 94;
    const span = Math.max(1, extent.max - extent.min);
    const pos = (ms: number) =>
      top + ((Math.min(Math.max(ms, extent.min), extent.max) - extent.min) / span) * height;

    // Every month of the year, or every year of the span, at the middle of
    // its period so a label sits beside its mark. `TrackFrame` thins them to
    // the room the track has.
    const marks: TrackMark[] = [];
    const mid = (a: number, b: number) => pos((Math.max(a, extent.min) + Math.min(b, extent.max)) / 2);
    if (isYear) {
      for (let m = 0; m < 12; m++)
        marks.push({
          label: bucketOf(Date.UTC(focusYear, m, 1), "month").label.slice(0, 3),
          yPct: mid(Date.UTC(focusYear, m, 1), Date.UTC(focusYear, m + 1, 1)),
          rank: m,
        });
    } else {
      const y0 = new Date(extent.min).getUTCFullYear();
      const y1 = new Date(extent.max).getUTCFullYear();
      for (let y = y0; y <= y1; y++)
        marks.push({ label: String(y), yPct: mid(Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1)), rank: y });
    }
    return { extent, trackBuckets, before, after, marks, pos };
  }, [scope, focusYear, fullExtent, source, unit]);

  const scrollToTime = useCallback(
    (t: number) => {
      const el = groupRefs.current.get(bucketOf(t, unit).key);
      const pane = scrollRef.current;
      if (el && pane) pane.scrollTo({ top: el.offsetTop - 8, behavior: "smooth" });
    },
    [unit],
  );

  // Which period is at the top of the viewport — lights its node.
  const onScroll = () => {
    const pane = scrollRef.current;
    if (!pane) return;
    const y = pane.scrollTop + 16;
    let hit: string | null = null;
    for (const g of groups) {
      const el = groupRefs.current.get(g.key);
      if (el && el.offsetTop <= y) hit = g.key;
    }
    setActiveKey(hit);
  };

  const trackProps: TrackProps = {
    buckets: trackBuckets,
    extent,
    pos,
    marks,
    scope,
    setScope,
    focusYear,
    before,
    after,
    activeKey,
    activeAt: (groups.find((x) => x.key === activeKey) ?? groups[0])?.start ?? fullExtent.min,
    hovered,
    setHovered,
    scrollToTime,
  };

  return (
    <div className="flex h-full min-h-0 gap-3">
      {/* Period-grouped body */}
      {/* no-scrollbar: the OS scrollbar landed between the list and the track,
          reading as a second axis. The track is the scroll indicator here. */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-w-0 overflow-auto no-scrollbar pe-1">
        {groups.map((g) => {
          const open = openGroups[g.key];
          const shown = open ? g.entities : g.entities.slice(0, GROUP_CAP);
          return (
            <div
              key={g.key}
              ref={(el) => {
                if (el) groupRefs.current.set(g.key, el);
                else groupRefs.current.delete(g.key);
              }}
              className="pb-4"
            >
              <PeriodHeader bucket={g} active={activeKey === g.key} />
              <ul className="space-y-1.5 pt-1.5">
                {shown.map((e) => (
                  <EntityCard
                    key={e.id}
                    as="li"
                    entity={e}
                    layout="list"
                    query={query}
                    selected={selectedId === e.id}
                    connections={countByEntity.get(e.id) ?? 0}
                    onSelect={onSelect}
                    onView={onView}
                    selectable
                  />
                ))}
              </ul>
              {g.entities.length > GROUP_CAP && (
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                  className="mt-1.5 px-2 py-1 text-meta font-medium text-ink-tertiary hover:text-ink bg-warm hover:bg-parchment rounded-md transition-colors cursor-pointer"
                >
                  {open
                    ? "Show less"
                    : `+${(g.entities.length - GROUP_CAP).toLocaleString()} more in ${g.label}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {track === "density" ? <DensityTrack {...trackProps} /> : <RailTrack {...trackProps} />}
    </div>
  );
}

/** Shared chrome for both tracks: the scope toggle, the axis, the ↑/↓ counts for
 *  what the year scope leaves off, and the thinned marks. Straight off
 *  RefMinimap's whole-document / this-page rail. */
function TrackFrame({
  width,
  axisEnd,
  labelW,
  label,
  scope,
  setScope,
  focusYear,
  before,
  after,
  marks,
  children,
}: {
  width: number;
  /** Distance from the rail's outer edge to the axis line. The cluster track
   *  centres its nodes ON the axis, so it needs room on both sides; the density
   *  track only grows inward, so its axis can hug the year marks. */
  axisEnd: number;
  labelW: number;
  label: string;
  scope: TimelineScope;
  setScope: (s: TimelineScope) => void;
  focusYear: number;
  before: number;
  after: number;
  marks: TrackMark[];
  /** The marks; a function gets the plot's height in px. */
  children: React.ReactNode | ((plotH: number) => React.ReactNode);
}) {
  const isYear = scope === "year";
  const plotH = usePlotHeight();
  // Keep every k-th rank, k the smallest round step whose labels stand at
  // least LABEL_PITCH apart.
  const shownMarks = useMemo(() => {
    if (marks.length < 2 || !plotH.h) return marks;
    const pitch = (Math.abs(marks[1].yPct - marks[0].yPct) / 100) * plotH.h;
    const steps = isYear ? [1, 2, 3, 6, 12] : [1, 2, 5, 10, 20, 50, 100];
    const k = steps.find((st) => pitch * st >= LABEL_PITCH) ?? steps[steps.length - 1];
    return marks.filter((m) => m.rank % k === 0);
  }, [marks, plotH.h, isYear]);
  return (
    <div className="relative shrink-0 flex flex-col" style={{ width }} role="group" aria-label={label}>
      {/* Scope toggle — centred ON the axis, like the minimap's mode button.
          Anchor the inline-end edge to the axis, then push back by half the
          element's own width: `insetInlineEnd` + a NEGATIVE translate would
          double-count and land everything off-axis. */}
      <div className="relative h-6 shrink-0">
        <button
          onClick={() => setScope(isYear ? "all" : "year")}
          aria-pressed={isYear}
          title={isYear ? `${focusYear}` : "Whole timeline"}
          aria-label={
            isYear
              ? `Showing ${focusYear} — switch to the whole timeline`
              : "Showing the whole timeline — switch to this year"
          }
          // Bar-ladder ghost on the warm pane: no fill, edge or ring at rest;
          // parchment on hover; the focus ring only for the keyboard.
          className="absolute top-0 flex items-center justify-center rounded-md transition-colors cursor-pointer
            text-ink-secondary hover:bg-parchment hover:text-ink translate-x-1/2
            focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          style={{ width: 22, height: 22, insetInlineEnd: axisEnd }}
        >
          {isYear ? <CalendarDays size={12} /> : <Layers size={12} />}
        </button>
      </div>

      <div ref={plotH.ref} className="relative flex-1 min-h-0">
        <div
          className="absolute top-0 bottom-0"
          style={{ insetInlineEnd: axisEnd, width: 1, backgroundColor: "var(--border-primary)" }}
        />

        {/* What the year scope leaves off, above and below */}
        {isYear && before > 0 && <EdgeCount dir="up" n={before} axisEnd={axisEnd} />}
        {isYear && after > 0 && <EdgeCount dir="down" n={after} axisEnd={axisEnd} />}

        {typeof children === "function" ? children(plotH.h) : children}

        {/* One label column: fixed width so "1986" and "Jan" share a left edge
            instead of each hanging off its own text width. */}
        {shownMarks.map((m) => (
          <span
            key={`l-${m.label}`}
            // ink-TERTIARY: at 11px this is still small text, and muted misses AA on
            // both themes. Same step the spine's marks take — one label column.
            className="absolute text-meta leading-none tabular-nums text-ink-tertiary -translate-y-1/2 pointer-events-none text-start"
            style={{ top: `${m.yPct}%`, insetInlineEnd: 0, width: labelW }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** The plot area's height in px, for thinning labels and sizing marks. */
function usePlotHeight() {
  const [h, setH] = useState(0);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(([entry]) => setH(Math.round(entry.contentRect.height)));
    ro.current.observe(el);
  }, []);
  return { ref, h };
}

function EdgeCount({ dir, n, axisEnd }: { dir: "up" | "down"; n: number; axisEnd: number }) {
  return (
    <span
      className="absolute text-meta font-medium tabular-nums leading-none translate-x-1/2 rounded-[3px] px-1 py-0.5 pointer-events-none whitespace-nowrap"
      style={{
        insetInlineEnd: axisEnd,
        [dir === "up" ? "top" : "bottom"]: 0,
        color: "var(--text-tertiary)",
        backgroundColor: "var(--bg-warm)",
      }}
    >
      {dir === "up" ? "↑" : "↓"} {n.toLocaleString()}
    </span>
  );
}

/** The rail: one mark per period on a density scale. A period's bar grows
 *  inward from the axis, its length the square root of its count against the
 *  busiest period in view, so every period carries information and none is
 *  capped. A period of up to `DOT_CAP` records draws them as dots in their
 *  template colours where its band has room. Periods sit proportional in
 *  time with `PERIOD_GAP` between them; the period at the top of the rows is
 *  tinted. Exact counts are in the tooltip and the accessible name.
 *
 *  Clicking a period filters the Library to it and brings its rows up; click
 *  it again to clear. */
function RailTrack(props: TrackProps) {
  const { buckets, extent, pos, activeAt, hovered, setHovered, scrollToTime } = props;
  const geom = useTrackGeom();
  const range = useRange();
  const maxCount = Math.max(1, ...buckets.map((b) => b.entities.length));

  return (
    <TrackFrame
      width={geom.W}
      axisEnd={geom.AXIS}
      labelW={geom.LABEL}
      label="Timeline — records by period"
      scope={props.scope}
      setScope={props.setScope}
      focusYear={props.focusYear}
      before={props.before}
      after={props.after}
      marks={props.marks}
    >
      {(plotH) =>
        buckets.map((b) => {
          const n = b.entities.length;
          const picked = !range.isAll && range.covers(b);
          const inRange = range.overlaps(b);
          const isHov = hovered === b.key;
          const active = activeAt >= b.start && activeAt < b.end;
          const top = pos(Math.max(b.start, extent.min));
          const bottom = pos(Math.min(b.end, extent.max));
          const bandPx = ((bottom - top) / 100) * plotH - PERIOD_GAP;
          const dotted = n <= DOT_CAP && bandPx >= 8 && n * 8 <= geom.BAR;
          const len = Math.max(3, Math.sqrt(n / maxCount) * (geom.BAR - 4));
          const thick = Math.max(2, Math.min(6, bandPx - 2));
          const ink = picked ? "var(--text-primary)" : isHov || active ? "var(--text-secondary)" : "var(--text-tertiary)";
          const records = `${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}`;
          return (
            <button
              key={b.key}
              aria-label={`${b.label}: ${records}`}
              aria-pressed={picked}
              onClick={() => {
                range.toggle(b);
                scrollToTime(b.start);
              }}
              onMouseEnter={() => setHovered(b.key)}
              onMouseLeave={() => setHovered(null)}
              // Out of the date range: faded, but the hovered one is opaque so
              // its tooltip reads.
              className={`absolute flex flex-row-reverse items-center gap-0.5 rounded-sm cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40
                ${active ? "bg-parchment" : isHov ? "bg-vellum" : ""}`}
              style={{
                insetInlineEnd: geom.AXIS + 1,
                width: geom.BAR,
                top: `calc(${top}% + ${PERIOD_GAP / 2}px)`,
                height: `max(2px, calc(${bottom - top}% - ${PERIOD_GAP}px))`,
                opacity: inRange || isHov ? 1 : 0.3,
              }}
            >
              {dotted ? (
                b.entities.map((e) => (
                  <span
                    key={e.id}
                    aria-hidden
                    className="shrink-0 w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: getEntityType(e.typeId)?.color ?? "var(--text-tertiary)" }}
                  />
                ))
              ) : (
                <span
                  aria-hidden
                  className="shrink-0 rounded-s-[2px]"
                  style={{ width: len, height: thick, backgroundColor: ink, opacity: picked || isHov || active ? 1 : 0.6 }}
                />
              )}
              {isHov && (
                <ChartTip>
                  {b.label} · {records}
                </ChartTip>
              )}
            </button>
          );
        })
      }
    </TrackFrame>
  );
}

/** The same periods as volume bars — proportional in time, length = count,
 *  STACKED by template. The rail is where composition is read: a bar is short,
 *  but the segments are stable in order down the whole track, so you can see the
 *  corpus diversify. The wide brush strip below carries the volume SHAPE instead.
 *
 *  Clicking a period filters the Library to it (click again to clear). */
function DensityTrack(props: TrackProps) {
  const { buckets, extent, pos, activeKey, hovered, setHovered, scrollToTime } = props;
  const geom = useTrackGeom();
  const range = useRange();
  const maxCount = Math.max(1, ...buckets.map((b) => b.entities.length));
  // ONE segment order for the whole track, or the stacks wouldn't be comparable.
  const order = useMemo(() => typeOrder(buckets.flatMap((b) => b.entities)), [buckets]);

  return (
    <TrackFrame
      width={geom.W}
      axisEnd={geom.AXIS}
      labelW={geom.LABEL}
      label="Timeline — volume by period"
      scope={props.scope}
      setScope={props.setScope}
      focusYear={props.focusYear}
      before={props.before}
      after={props.after}
      marks={props.marks}
    >
      {buckets.map((b) => {
        const n = b.entities.length;
        const lit = range.overlaps(b);
        const picked = !range.isAll && range.covers(b);
        const isHov = hovered === b.key;
        const w = 4 + Math.sqrt(n / maxCount) * (geom.BAR - 4);
        // Bars are as tall as their period is long — a period that is 1/40th of
        // the corpus occupies 1/40th of the rail. Gaps in time stay gaps.
        const top = pos(Math.max(b.start, extent.min));
        const h = Math.max(pos(Math.min(b.end, extent.max)) - top, 0);
        const slices = stackByType(b.entities, order);

        return (
          <button
            key={b.key}
            aria-label={`${b.label} — ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}: ${slices
              .map((s) => `${s.n} ${s.name}`)
              .join(", ")}`}
            aria-pressed={picked}
            onClick={() => {
              range.toggle(b);
              scrollToTime(b.start);
            }}
            onMouseEnter={() => setHovered(b.key)}
            onMouseLeave={() => setHovered(null)}
            className="absolute cursor-pointer transition-[width,opacity] duration-150
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
            style={{
              insetInlineEnd: geom.AXIS + 1,
              top: `${top}%`,
              height: `calc(${h}% - 1px)`,
              minHeight: 3,
              width: isHov || picked ? Math.min(geom.BAR, w + 4) : w,
              // Hover wins over the out-of-range fade (0.16): the bar you're pointing
              // at goes fully opaque, so its tooltip — a child of the bar — is fully
              // readable instead of ghosted at 16%.
              opacity: isHov ? 1 : lit ? (picked || activeKey === b.key ? 1 : 0.65) : 0.16,
            }}
          >
            {/* Reversed so the biggest slice hugs the axis — the axis is the
                baseline this bar grows from. */}
            <span className="flex flex-row-reverse w-full h-full overflow-hidden rounded-s-[2px]">
              {slices.map((s) => (
                <span key={s.typeId} style={{ width: `${s.frac * 100}%`, backgroundColor: s.color }} />
              ))}
            </span>
            {isHov && (
              <ChartTip>
                <BucketBreakdown label={b.label} total={n} slices={slices} />
              </ChartTip>
            )}
          </button>
        );
      })}
    </TrackFrame>
  );
}

function PeriodHeader({ bucket, active }: { bucket: TimeBucket; active: boolean }) {
  return (
    <div className="sticky top-0 z-10 -mx-0.5 px-0.5 py-1 bg-warm flex items-center gap-2">
      <span
        className={`text-xs font-semibold tabular-nums ${active ? "text-ink" : "text-ink-secondary"}`}
      >
        {bucket.label}
      </span>
      <span className="text-meta text-ink-tertiary tabular-nums">
        {bucket.entities.length.toLocaleString()}
      </span>
      <span className="flex-1 h-px" style={{ backgroundColor: "var(--border-soft)" }} />
      <span className="flex items-center gap-1">
        {colorSpread(bucket.entities, 5).map((c) => (
          <span key={c} className="w-1.5 h-1.5 rounded-[2px]" style={{ backgroundColor: c }} />
        ))}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 2 — SPINE: a true proportional chronology. Every entity sits at its
 *     exact date on a continuous vertical axis; collisions push down and
 *     a leader line points back to the real instant.
 * ------------------------------------------------------------------ */

/** The spine line marks the title and nothing else, so every other hit is
 *  off-row evidence for `MatchOrigin`. */
const SPINE_MARKED_FIELDS = ["title"] as const;

/** The chronology body. Geometry — axis inset, adaptive scale, year marks,
 *  elided silences, collision push, leader lines, date gutter — all lives in the
 *  shared `TimeSpine`, which the Library's Results view renders too. This file
 *  only says what a row SAYS. */
function SpineLayout({ dated, query, selectedId, onSelect }: LayoutProps) {
  const hasQuery = query.trim().length > 0;
  const plotted = dated.slice(0, SPINE_CAP);
  const rows = useMemo(
    () => plotted.map((e) => ({ key: e.id, t: entityTime(e)!, item: e })),
    [plotted],
  );

  return (
    <div className="h-full overflow-auto no-scrollbar">
      <TimeSpine
        rows={rows}
        dotColor={(e) => getEntityType(e.typeId)?.color ?? "#6B7280"}
        dotActive={(e) => selectedId === e.id}
        renderRow={(e, { t }) => {
          const sel = selectedId === e.id;
          const color = getEntityType(e.typeId)?.color ?? "#6B7280";
          return (
            // The line hosts the match marker, so it's the stretched-button
            // shell, not a `<button>` — a control inside a button is invalid for
            // AT (and invalid HTML). Same keyboard behaviour, one level down.
            <div
              data-select-host
              onClick={(ev) => onSelect(e.id, ev)}
              onMouseDown={holdTextSelection}
              className={`group relative flex items-center h-[22px] px-2 rounded-md cursor-pointer
                transition-colors ${sel ? `bg-parchment ${PREVIEWED_RING_INSET}` : "hover:bg-parchment"}
                ${SELECTED_LOOK_INSET} ${FOCUS_RING_ON_SELECT}`}
            >
              <button
                type="button"
                aria-pressed={sel}
                aria-label={`Preview ${e.title}`}
                onClick={(ev) => {
                  ev.stopPropagation();
                  onSelect(e.id, ev);
                }}
                className="absolute inset-0 w-full rounded-md cursor-pointer focus:outline-none
                  focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/30"
              />
              <EntitySelectBox id={e.id} title={e.title} />
              <span className="relative flex-1 min-w-0 flex items-center gap-2">
                <span className="relative shrink-0 w-4 h-4 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-[2px]" style={{ backgroundColor: color }} />
                </span>
                <SpineDate t={t} />
                <span
                  className={`flex-1 min-w-0 truncate text-xs ${sel ? "text-ink font-medium" : "text-ink-secondary"}`}
                >
                  <HighlightedText text={e.title} query={query} fieldKey="title" />
                </span>
                <span className="shrink-0 text-meta text-ink-tertiary hidden md:block">
                  {getEntityType(e.typeId)?.name ?? e.typeId}
                </span>
                {/* Reserved while a query is active — a fixed box the per-row
                    marks toggle inside, so refining the query never nudges a
                    title. It rides at the row's END, not beside the type name:
                    the type label is variable-width, and hanging the marks off it
                    left them scattered across a diagonal instead of reading as
                    one column. The spine marks only the title, so ANY other hit
                    (country included) is off-row evidence. */}
                {hasQuery && (
                  <span className="shrink-0 w-[2.25rem] flex items-center justify-end">
                    <MatchOrigin
                      entity={e}
                      query={query}
                      visibleFieldKeys={SPINE_MARKED_FIELDS}
                      onSelect={onSelect}
                    />
                  </span>
                )}
              </span>
            </div>
          );
        }}
      />
      {dated.length > SPINE_CAP && (
        <div className="py-3 text-center text-meta text-ink-tertiary">
          Plotting the first {SPINE_CAP} of {dated.length.toLocaleString()} — narrow the range to see
          the rest.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 3 — LANES: a template × period density grid. One lane per template,
 *     one cell per period; the cell is a dot sized by count. Clicking a
 *     cell drills in — it sets the template facet AND the date range.
 * ------------------------------------------------------------------ */

function LanesLayout({ laneChart }: LayoutProps) {
  const [typeFilters, setTypeFilters] = useAtom(libraryTypeFiltersAtom);
  const [hover, setHover] = useState<string | null>(null);
  const range = useRange();

  const dated = useMemo(() => sortByTime(laneChart), [laneChart]);
  const extent = useMemo(() => timeExtent(dated), [dated]);
  const unit = useMemo(() => (extent ? pickUnit(extent.max - extent.min) : "year"), [extent]);

  const { cols, lanes, max } = useMemo(() => {
    const cols = groupByBucket(dated, unit);
    const byType = new Map<string, Map<string, Entity[]>>();
    for (const c of cols) {
      for (const e of c.entities) {
        const lane = byType.get(e.typeId) ?? new Map<string, Entity[]>();
        const cell = lane.get(c.key) ?? [];
        cell.push(e);
        lane.set(c.key, cell);
        byType.set(e.typeId, lane);
      }
    }
    let max = 1;
    for (const lane of byType.values())
      for (const cell of lane.values()) max = Math.max(max, cell.length);
    const lanes = [...byType.entries()]
      .map(([typeId, cells]) => ({
        typeId,
        name: getEntityType(typeId)?.name ?? typeId,
        color: getEntityType(typeId)?.color ?? "#6B7280",
        cells,
        total: [...cells.values()].reduce((n, c) => n + c.length, 0),
      }))
      .sort((a, b) => b.total - a.total);
    return { cols, lanes, max };
  }, [dated, unit]);

  if (!cols.length) return null;

  const anyType = Object.values(typeFilters).some(Boolean);
  const colW = 26;

  return (
    <div className="h-full overflow-auto no-scrollbar">
      <div dir="ltr" className="inline-block min-w-full">
        {/* Column heads */}
        <div className="flex sticky top-0 z-10 bg-warm pb-1">
          <div className="shrink-0 w-40" />
          {cols.map((c, i) => (
            <div key={c.key} className="shrink-0 text-center" style={{ width: colW }}>
              {i % Math.ceil(cols.length / 11 || 1) === 0 && (
                <span className="block text-meta leading-none tabular-nums text-ink-tertiary -rotate-45 origin-center whitespace-nowrap">
                  {c.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {lanes.map((lane) => {
          const laneOn = !anyType || !!typeFilters[lane.typeId];
          return (
            <div key={lane.typeId} className="flex items-center h-8">
              <div className="shrink-0 w-40 pe-2 flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2 h-2 rounded-[2px] shrink-0"
                  style={{ backgroundColor: lane.color, opacity: laneOn ? 1 : 0.35 }}
                />
                <span
                  className={`text-meta font-medium truncate ${laneOn ? "text-ink-secondary" : "text-ink-tertiary"}`}
                >
                  {lane.name}
                </span>
                <span className="ms-auto text-meta tabular-nums text-ink-tertiary">
                  {lane.total.toLocaleString()}
                </span>
              </div>
              {cols.map((c) => {
                const cell = lane.cells.get(c.key);
                const n = cell?.length ?? 0;
                const id = `${lane.typeId}:${c.key}`;
                const r = n ? 5 + Math.sqrt(n / max) * 9 : 0;
                const inRange = range.overlaps(c);
                const picked = laneOn && !range.isAll && range.covers(c) && anyType;
                return (
                  <div
                    key={c.key}
                    className="shrink-0 h-full flex items-center justify-center relative"
                    style={{ width: colW }}
                  >
                    {n > 0 && (
                      <button
                        aria-label={`${lane.name} · ${c.label} · ${n} ${n === 1 ? "entity" : "entities"}`}
                        aria-pressed={picked}
                        onClick={() => {
                          setTypeFilters(picked ? {} : { [lane.typeId]: true });
                          range.toggle(c);
                        }}
                        onMouseEnter={() => setHover(id)}
                        onMouseLeave={() => setHover(null)}
                        className="rounded-full transition-transform cursor-pointer hover:scale-110
                          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
                        style={{
                          width: r * 2,
                          height: r * 2,
                          backgroundColor: lane.color,
                          opacity: laneOn && inRange ? (picked ? 1 : 0.72) : 0.16,
                          boxShadow: picked ? `0 0 0 2px ${lane.color}55` : "none",
                        }}
                      />
                    )}
                    {hover === id && (
                      <span
                        className="absolute z-50 bottom-full mb-1 pointer-events-none text-meta font-medium whitespace-nowrap rounded-md"
                        style={{
                          padding: "3px 7px",
                          backgroundColor: "var(--text-primary)",
                          color: "var(--bg-surface)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                        }}
                      >
                        {c.label} · {n.toLocaleString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <p className="pt-3 text-meta text-ink-tertiary">
          A dot is one period of one template, sized by how many entities landed in it. Select one to
          filter the Library to that slice; select it again to clear.
        </p>
      </div>
    </div>
  );
}

export const TIMELINE_LAYOUTS: { id: TimelineLayout; label: string }[] = [
  { id: "rail", label: "Rail" },
  { id: "density", label: "Density" },
  { id: "spine", label: "Spine" },
  { id: "lanes", label: "Lanes" },
];
