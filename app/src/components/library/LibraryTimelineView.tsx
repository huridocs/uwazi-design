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
  dominantColor,
  entityTime,
  formatDay,
  groupByBucket,
  pickUnit,
  stackByType,
  timeExtent,
  toISODate,
  typeOrder,
  type TimeBucket,
} from "../../utils/timeline";
import { BucketBreakdown, ChartTip } from "./BucketBreakdown";
import { EntityCard } from "./EntityCard";

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
  selectedId: string | null;
  onSelect: (id: string) => void;
  onView: (id: string) => void;
  countByEntity: Map<string, number>;
}

export function LibraryTimelineView(props: Props) {
  const layout = useAtomValue(libraryTimelineLayoutAtom);
  const { entities } = props;

  const dated = useMemo(() => sortByTime(entities), [entities]);
  const undated = entities.length - dated.length;

  if (!dated.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-ink-muted">
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
        <div className="shrink-0 pt-2 text-[11px] text-ink-muted">
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
  const from = dateFrom ? Date.parse(dateFrom) : null;
  const to = dateTo ? Date.parse(dateTo) + 86_399_999 : null;
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
 *       · clusters — dots and counted clusters that FAN OUT into their
 *                    members (RefMinimap, straight across). Navigation:
 *                    clicking picks an entity, it never filters.
 *       · density  — the same periods as volume bars. Clicking a bar
 *                    FILTERS the Library to that period.
 * ------------------------------------------------------------------ */

/* ONE track geometry, shared by Rail, Density and Spine. The axis lands at the
 * same x in every layout, so switching between them doesn't slide the timeline
 * across the pane. All three measure from the pane's inline-end edge:
 *
 *   |<-- TRACK_BAR -->|<- TRACK_AXIS ->|
 *   [ bars / leaders ]|                | axis line
 *                     |     marks      | TRACK_LABEL
 *
 * TRACK_AXIS has to clear TRACK_LABEL by more than a counted ring's radius —
 * the cluster nodes straddle the axis, the density bars only grow inward. */
const TRACK_LABEL = 26;
const TRACK_AXIS = 44;
const TRACK_BAR = 42;
const TRACK_W = TRACK_AXIS + TRACK_BAR + 4;
/** A period small enough to fan out into its members, rather than jump to. */
const FAN_CAP = 12;

interface TrackProps {
  buckets: TimeBucket[];
  extent: { min: number; max: number };
  /** ms → % down the plotting area. Owned by the shell, because the year scope
   *  insets the plot to make room for the ↑/↓ edge counts. */
  pos: (ms: number) => number;
  marks: { label: string; yPct: number }[];
  scope: TimelineScope;
  setScope: (s: TimelineScope) => void;
  focusYear: number;
  before: number;
  after: number;
  activeKey: string | null;
  hovered: string | null;
  setHovered: (k: string | null) => void;
  scrollToTime: (t: number) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function TrackedList({
  dated,
  chart,
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
    const extent = isYear
      ? { min: Date.UTC(focusYear, 0, 1), max: Date.UTC(focusYear + 1, 0, 1) - 1 }
      : fullExtent;
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

    const marks: { label: string; yPct: number }[] = [];
    if (isYear) {
      for (let m = 0; m < 12; m += 2)
        marks.push({
          label: bucketOf(Date.UTC(focusYear, m, 1), "month").label.slice(0, 3),
          yPct: pos(Date.UTC(focusYear, m, 1)),
        });
    } else {
      const seen = new Set<number>();
      const all: { label: string; yPct: number }[] = [];
      for (const b of trackBuckets) {
        const y = new Date(b.start).getUTCFullYear();
        if (seen.has(y)) continue;
        seen.add(y);
        all.push({ label: String(y), yPct: pos(Math.max(b.start, extent.min)) });
      }
      const every = Math.max(1, Math.ceil(all.length / 9));
      marks.push(...all.filter((_, i) => i % every === 0));
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
    hovered,
    setHovered,
    scrollToTime,
    selectedId,
    onSelect,
  };

  return (
    <div className="flex h-full min-h-0 gap-3">
      {/* Period-grouped body */}
      <div ref={scrollRef} onScroll={onScroll} className="flex-1 min-w-0 overflow-auto pe-1">
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
              <div className="space-y-1.5 pt-1.5">
                {shown.map((e) => (
                  <EntityCard
                    key={e.id}
                    entity={e}
                    layout="list"
                    selected={selectedId === e.id}
                    connections={countByEntity.get(e.id) ?? 0}
                    onSelect={onSelect}
                    onView={onView}
                  />
                ))}
              </div>
              {g.entities.length > GROUP_CAP && (
                <button
                  onClick={() => setOpenGroups((s) => ({ ...s, [g.key]: !s[g.key] }))}
                  className="mt-1.5 px-2 py-1 text-[11px] font-medium text-ink-tertiary hover:text-ink bg-warm hover:bg-parchment rounded-md transition-colors cursor-pointer"
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

      {track === "density" ? <DensityTrack {...trackProps} /> : <ClusterTrack {...trackProps} />}
    </div>
  );
}

/** Shared chrome for both tracks: the scope toggle, the axis, the ↑/↓ counts for
 *  what the year scope leaves off, and the thinned marks. Straight off
 *  RefMinimap's whole-document / this-page rail. */
function TrackFrame({
  width,
  axisEnd,
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
  label: string;
  scope: TimelineScope;
  setScope: (s: TimelineScope) => void;
  focusYear: number;
  before: number;
  after: number;
  marks: { label: string; yPct: number }[];
  children: React.ReactNode;
}) {
  const isYear = scope === "year";
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
          className="absolute top-0 flex items-center justify-center rounded-md transition-colors cursor-pointer
            text-ink-tertiary hover:bg-warm hover:text-ink-secondary translate-x-1/2
            focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          style={{ width: 22, height: 22, insetInlineEnd: axisEnd }}
        >
          {isYear ? <CalendarDays size={12} /> : <Layers size={12} />}
        </button>
      </div>

      <div className="relative flex-1 min-h-0">
        <div
          className="absolute top-0 bottom-0"
          style={{ insetInlineEnd: axisEnd, width: 1, backgroundColor: "var(--border-primary)" }}
        />

        {/* What the year scope leaves off, above and below */}
        {isYear && before > 0 && <EdgeCount dir="up" n={before} axisEnd={axisEnd} />}
        {isYear && after > 0 && <EdgeCount dir="down" n={after} axisEnd={axisEnd} />}

        {children}

        {/* One label column: fixed width so "1986" and "Jan" share a left edge
            instead of each hanging off its own text width. */}
        {marks.map((m) => (
          <span
            key={`l-${m.label}`}
            className="absolute text-[9px] tabular-nums text-ink-muted -translate-y-1/2 pointer-events-none text-start"
            style={{ top: `${m.yPct}%`, insetInlineEnd: 0, width: TRACK_LABEL }}
          >
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function EdgeCount({ dir, n, axisEnd }: { dir: "up" | "down"; n: number; axisEnd: number }) {
  return (
    <span
      className="absolute text-[10px] font-medium tabular-nums leading-none translate-x-1/2 rounded-[3px] px-1 py-0.5 pointer-events-none whitespace-nowrap"
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

/** The RefMinimap idiom: a dot per small period (which fans out into its
 *  entities), a counted ring per busy one.
 *
 *  Clicking a node FILTERS the Library to that period — it doesn't merely scroll
 *  the list to it. Scrolling left you looking at the same 4,398 results with the
 *  viewport moved; the point of picking a period is to be left with that period.
 *  Click it again to clear. A picked period that's small enough also fans out,
 *  so its members are one more click away. */
function ClusterTrack(props: TrackProps) {
  const { buckets, extent, pos, activeKey, hovered, setHovered, selectedId, onSelect } = props;
  const range = useRange();
  const maxCount = Math.max(1, ...buckets.map((b) => b.entities.length));

  return (
    <TrackFrame
      width={TRACK_W}
      axisEnd={TRACK_AXIS}
      label="Timeline — periods"
      scope={props.scope}
      setScope={props.setScope}
      focusYear={props.focusYear}
      before={props.before}
      after={props.after}
      marks={props.marks}
    >
      {buckets.map((b) => {
        const n = b.entities.length;
        const picked = !range.isAll && range.covers(b);
        const inRange = range.overlaps(b);
        const small = n <= FAN_CAP;
        // A picked period fans out — the filter and the fan are the same gesture.
        const isOpen = picked && small;
        const lit = picked || activeKey === b.key || hovered === b.key;
        const size = small ? (lit ? 12 : 9) : 15 + Math.min(Math.sqrt(n / maxCount) * 11, 11);
        const color = dominantColor(b.entities);

        return (
          <div
            key={b.key}
            // Anchored so the node's centre lands ON the axis line.
            className="absolute -translate-y-1/2 translate-x-1/2"
            style={{
              top: `${pos(Math.max(b.start, extent.min))}%`,
              insetInlineEnd: TRACK_AXIS,
              // Out-of-range periods recede but stay: the way back is the track.
              opacity: inRange ? 1 : 0.28,
            }}
          >
            <button
              aria-label={`${b.label} — ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}`}
              aria-pressed={picked}
              onClick={() => range.toggle(b)}
              onMouseEnter={() => setHovered(b.key)}
              onMouseLeave={() => setHovered(null)}
              className="flex items-center justify-center rounded-full transition-all cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              style={
                small
                  ? {
                      width: size,
                      height: size,
                      backgroundColor: color,
                      opacity: lit ? 1 : 0.75,
                      boxShadow: lit ? `0 0 0 3px ${color}33` : "none",
                    }
                  : {
                      width: size,
                      height: size,
                      border: `1.5px solid ${lit ? "var(--text-secondary)" : "var(--border-soft)"}`,
                      backgroundColor: lit ? "var(--bg-muted)" : "var(--bg-surface)",
                    }
              }
            >
              {!small && (
                <span
                  className="text-[9px] font-bold leading-none tabular-nums"
                  style={{ color: lit ? "var(--text-primary)" : "var(--text-tertiary)" }}
                >
                  {n > 99 ? "99+" : n}
                </span>
              )}
              {hovered === b.key && !isOpen && (
                <ChartTip>
                  {b.label} · {n.toLocaleString()}
                </ChartTip>
              )}
            </button>

            {/* Fan — the picked period's members, branching out as in RefMinimap.
                Picking one previews that entity; it does NOT re-toggle the
                period, so the filter survives choosing something inside it. */}
            {isOpen && (
              <ClusterFan
                entities={b.entities}
                yPct={pos(Math.max(b.start, extent.min))}
                outer={size}
                selectedId={selectedId}
                hovered={hovered}
                setHovered={setHovered}
                onPick={(e) => onSelect(e.id)}
              />
            )}
          </div>
        );
      })}
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
  const range = useRange();
  const maxCount = Math.max(1, ...buckets.map((b) => b.entities.length));
  // ONE segment order for the whole track, or the stacks wouldn't be comparable.
  const order = useMemo(() => typeOrder(buckets.flatMap((b) => b.entities)), [buckets]);

  return (
    <TrackFrame
      width={TRACK_W}
      axisEnd={TRACK_AXIS}
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
        const w = 4 + Math.sqrt(n / maxCount) * (TRACK_BAR - 4);
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
              insetInlineEnd: TRACK_AXIS + 1,
              top: `${top}%`,
              height: `calc(${h}% - 1px)`,
              minHeight: 3,
              width: isHov || picked ? Math.min(TRACK_BAR, w + 4) : w,
              opacity: lit ? (isHov || picked || activeKey === b.key ? 1 : 0.65) : 0.16,
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

/** The expanded cluster: an SVG trunk with one branch per member, growing LEFT
 *  off the rail into the body — mirrored from the document minimap, which hangs
 *  off the right edge of the page. */
function ClusterFan({
  entities,
  yPct,
  outer,
  selectedId,
  hovered,
  setHovered,
  onPick,
}: {
  entities: Entity[];
  yPct: number;
  outer: number;
  selectedId: string | null;
  hovered: string | null;
  setHovered: (id: string | null) => void;
  onPick: (e: Entity) => void;
}) {
  const members = entities.slice(0, FAN_CAP);
  const rowH = 20;
  const dot = 9;
  const pad = 2;
  const branch = 14;
  const trunkX = dot + pad + branch;
  const stem = 10;
  const svgW = trunkX + stem;
  const totalH = (members.length - 1) * rowH + dot;
  const top =
    yPct < 25 ? outer / 2 : yPct > 75 ? -(totalH - dot) - outer / 2 : -totalH / 2 + outer / 2;
  const midY = yPct < 25 ? dot / 2 : yPct > 75 ? totalH - dot / 2 : totalH / 2;

  return (
    <div
      className="absolute top-1/2"
      style={{ right: "calc(100% + 4px)", marginTop: top - outer / 2 }}
    >
      <svg width={svgW} height={totalH} style={{ overflow: "visible" }}>
        {/* Stem: trunk → the rail node */}
        <line
          x1={trunkX}
          y1={midY}
          x2={svgW}
          y2={midY}
          stroke="var(--text-tertiary)"
          strokeWidth={1}
          opacity={0.4}
        />
        {/* Trunk */}
        <line
          x1={trunkX}
          y1={dot / 2}
          x2={trunkX}
          y2={totalH - dot / 2}
          stroke="var(--text-tertiary)"
          strokeWidth={1}
          opacity={0.4}
        />
        {members.map((e, i) => {
          const cy = i * rowH + dot / 2;
          const color = getEntityType(e.typeId)?.color ?? "#6B7280";
          const on = selectedId === e.id || hovered === e.id;
          const s = on ? 12 : dot;
          return (
            <g key={e.id}>
              <line
                x1={dot + pad}
                y1={cy}
                x2={trunkX}
                y2={cy}
                stroke="var(--text-tertiary)"
                strokeWidth={1}
                opacity={0.4}
              />
              <circle
                cx={dot / 2}
                cy={cy}
                r={s / 2}
                fill={color}
                opacity={on ? 1 : 0.8}
                tabIndex={0}
                role="button"
                aria-label={e.title}
                className="cursor-pointer focus:outline-none"
                onClick={() => onPick(e)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    onPick(e);
                  }
                }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered(null)}
              />
              {on && (
                <circle
                  cx={dot / 2}
                  cy={cy}
                  r={s / 2 + 2.5}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  opacity={0.35}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Hover labels as HTML overlays — never SVG text inside the track */}
      {members.map((e, i) => {
        if (hovered !== e.id) return null;
        return (
          <span
            key={`t-${e.id}`}
            className="absolute z-50 pointer-events-none text-[10px] font-medium whitespace-nowrap rounded-md"
            style={{
              top: i * rowH + dot / 2,
              right: "calc(100% + 8px)",
              transform: "translateY(-50%)",
              padding: "3px 7px",
              backgroundColor: "var(--text-primary)",
              color: "var(--bg-surface)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {e.title}
          </span>
        );
      })}
      {entities.length > FAN_CAP && (
        <span
          className="absolute text-[9px] tabular-nums text-ink-muted whitespace-nowrap"
          style={{ top: totalH + 2, right: stem }}
        >
          +{entities.length - FAN_CAP}
        </span>
      )}
    </div>
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
      <span className="text-[11px] text-ink-tertiary tabular-nums">
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

const PX_PER_YEAR = 190;
/** One event = one line. The spine is a chronology, NOT a second results list —
 *  cards here just recreate the List view with extra whitespace. */
const EVENT_H = 22;
/** The axis lives on the right, like the rail and the document's ref minimap.
 *  This is the gutter kept for its year marks. */
/** The spine's axis sits at the SAME inset as the Rail/Density track, so the
 *  timeline doesn't slide across the pane when you switch layout. */
const AXIS_GUTTER = TRACK_AXIS;
const LEADER_W = 22;
/** The longest stretch of nothing the axis will draw at true scale before it
 *  elides — see the break markers. */
const MAX_GAP = 88;

/** "8 months", "3 years" — the size of an elided silence. */
function elapsed(ms: number): string {
  const days = ms / 86_400_000;
  if (days >= 730) return `${Math.round(days / 365.2425)} years`;
  if (days >= 55) return `${Math.round(days / 30.44)} months`;
  return `${Math.max(1, Math.round(days))} days`;
}

function SpineLayout({ dated, selectedId, onSelect }: LayoutProps) {
  const plotted = dated.slice(0, SPINE_CAP);
  const extent = useMemo(() => timeExtent(plotted)!, [plotted]);

  const { rows, height, years, gaps } = useMemo(() => {
    const yearMs = 365.2425 * 86_400_000;
    // The scale ADAPTS to the density of what's on screen. A fixed px-per-year
    // makes a single busy year collide into an undifferentiated list (the exact
    // thing this layout exists to avoid) and a 40-year sweep into a void. Give
    // every event roughly its own row's worth of axis, and the proportions read.
    const spanYears = Math.max((extent.max - extent.min) / yearMs, 1 / 365);
    const scale = Math.min(
      Math.max((plotted.length * EVENT_H * 1.35) / spanYears, PX_PER_YEAR),
      40_000,
    );
    const raw = (t: number) => 6 + ((t - extent.min) / yearMs) * scale;

    // A long silence is information, but 700px of white is not. Anything longer
    // than MAX_GAP collapses to MAX_GAP and gets a labelled break, so the axis
    // stays proportional WHERE THE EVENTS ARE and elides where they aren't.
    const cuts: { atRaw: number; cut: number }[] = [];
    const gaps: { y: number; ms: number }[] = [];
    let accum = 0;
    let prevRaw = raw(extent.min);
    let prevT = extent.min;
    let cursor = 0;
    const rows = plotted.map((e) => {
      const t = entityTime(e)!;
      const r = raw(t);
      const delta = r - prevRaw;
      let broke = 0;
      if (delta > MAX_GAP) {
        const cut = delta - MAX_GAP;
        cuts.push({ atRaw: r, cut });
        accum += cut;
        broke = t - prevT;
      }
      prevRaw = r;
      prevT = t;
      const ideal = r - accum;
      const y = Math.max(ideal, cursor);
      // The break marker goes between the LAID-OUT rows, not at the ideal
      // position — collision-pushed neighbours would sit on top of it.
      if (broke) gaps.push({ y: (cursor + y) / 2, ms: broke });
      cursor = y + EVENT_H;
      return { e, t, y, ideal };
    });
    const at = (t: number) => {
      const r = raw(t);
      let a = 0;
      for (const c of cuts) if (c.atRaw <= r) a += c.cut;
      return r - a;
    };
    const height = cursor + 24;

    // Marks: years across a long sweep, months once the range is short enough
    // that "2009" alone would be the only label on the whole axis.
    const years: { label: string; y: number }[] = [];
    const d0 = new Date(extent.min);
    const d1 = new Date(extent.max);
    if (spanYears < 2.5) {
      const step = spanYears < 0.6 ? 1 : 3;
      for (
        let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
        m.getTime() <= extent.max;
        m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + step, 1))
      ) {
        const pos = at(m.getTime());
        // Compact: "Jan 2009" doesn't fit the shared 26px label column. January
        // carries the year, every other month is just its name.
        const full = bucketOf(m.getTime(), "month").label;
        const label = m.getUTCMonth() === 0 ? String(m.getUTCFullYear()) : full.slice(0, 3);
        if (pos >= 0) years.push({ label, y: pos });
      }
    } else {
      const y0 = d0.getUTCFullYear();
      const y1 = d1.getUTCFullYear();
      const step = y1 - y0 > 40 ? 5 : y1 - y0 > 12 ? 2 : 1;
      for (let y = y0; y <= y1; y += step) {
        const pos = at(Date.UTC(y, 0, 1));
        if (pos >= 0) years.push({ label: String(y), y: pos });
      }
    }
    // The first mark is often clipped (a range starting 17 Jan has no 1 Jan
    // tick above it) — anchor the top of the axis explicitly.
    if (!years.length || years[0].y > 14) {
      const anchor = bucketOf(extent.min, spanYears < 2.5 ? "month" : "year").label;
      years.unshift({ label: spanYears < 2.5 ? anchor.slice(0, 3) : anchor, y: 6 });
    }
    return { rows, height, years, gaps };
  }, [plotted, extent]);

  return (
    <div className="h-full overflow-auto">
      <div className="relative" style={{ height }}>
        {/* Axis — right rail */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            insetInlineEnd: AXIS_GUTTER,
            width: 1,
            backgroundColor: "var(--border-primary)",
          }}
        />
        {years.map((y) => (
          <div
            key={y.label}
            className="absolute flex items-center gap-1 -translate-y-1/2"
            style={{ top: y.y, insetInlineEnd: 0 }}
          >
            <span className="w-1.5 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
            <span
              className="text-[9px] tabular-nums text-ink-muted whitespace-nowrap"
              style={{ width: TRACK_LABEL }}
            >
              {y.label}
            </span>
          </div>
        ))}

        {/* Elided silences */}
        {gaps.map((g) => (
          <div
            key={`gap-${g.y}`}
            className="absolute flex items-center gap-2 pointer-events-none -translate-y-1/2"
            style={{ top: g.y, insetInlineStart: 0, insetInlineEnd: AXIS_GUTTER - 4 }}
          >
            <span className="flex-1 h-px" style={{ backgroundColor: "transparent" }} />
            <span className="text-[10px] italic text-ink-muted">{elapsed(g.ms)} later</span>
            <span
              className="w-8 h-px"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to right, var(--border-primary) 0 3px, transparent 3px 6px)",
              }}
            />
          </div>
        ))}

        {rows.map(({ e, t, y, ideal }) => {
          const color = getEntityType(e.typeId)?.color ?? "#6B7280";
          const drop = Math.max(1, y - ideal);
          const sel = selectedId === e.id;
          return (
            <div key={e.id}>
              {/* Leader from the true instant on the axis to the pushed row */}
              <svg
                className="absolute pointer-events-none"
                style={{
                  insetInlineEnd: AXIS_GUTTER - 4,
                  top: ideal,
                  width: LEADER_W,
                  height: drop + 1,
                  overflow: "visible",
                }}
                aria-hidden
              >
                <path
                  d={`M ${LEADER_W - 4} 0 C ${LEADER_W - 13} 0, ${LEADER_W - 9} ${drop}, 0 ${drop}`}
                  fill="none"
                  stroke="var(--border-primary)"
                  strokeWidth={1}
                />
                <circle cx={LEADER_W - 4} cy={0} r={2.5} fill={color} opacity={sel ? 1 : 0.7} />
              </svg>

              <button
                onClick={() => onSelect(e.id)}
                aria-pressed={sel}
                className={`absolute flex items-center gap-2 h-[22px] px-2 rounded-md text-start cursor-pointer
                  transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
                    sel ? "bg-parchment" : "hover:bg-parchment"
                  }`}
                style={{
                  top: y - EVENT_H / 2 + 1,
                  insetInlineStart: 0,
                  insetInlineEnd: AXIS_GUTTER + LEADER_W,
                }}
              >
                <span
                  className="shrink-0 w-1.5 h-1.5 rounded-[2px]"
                  style={{ backgroundColor: color }}
                />
                <span className="shrink-0 w-[5.5rem] text-[10px] tabular-nums text-ink-tertiary">
                  {formatDay(t)}
                </span>
                <span
                  className={`flex-1 min-w-0 truncate text-xs ${sel ? "text-ink font-medium" : "text-ink-secondary"}`}
                >
                  {e.title}
                </span>
                <span className="shrink-0 text-[10px] text-ink-muted hidden md:block">
                  {getEntityType(e.typeId)?.name ?? e.typeId}
                </span>
              </button>
            </div>
          );
        })}
      </div>
      {dated.length > SPINE_CAP && (
        <div className="py-3 text-center text-[11px] text-ink-muted">
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
    <div className="h-full overflow-auto">
      <div dir="ltr" className="inline-block min-w-full">
        {/* Column heads */}
        <div className="flex sticky top-0 z-10 bg-warm pb-1">
          <div className="shrink-0 w-40" />
          {cols.map((c, i) => (
            <div key={c.key} className="shrink-0 text-center" style={{ width: colW }}>
              {i % Math.ceil(cols.length / 16 || 1) === 0 && (
                <span className="block text-[9px] tabular-nums text-ink-muted -rotate-45 origin-center whitespace-nowrap">
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
                  className={`text-[11px] font-medium truncate ${laneOn ? "text-ink-secondary" : "text-ink-muted"}`}
                >
                  {lane.name}
                </span>
                <span className="ms-auto text-[10px] tabular-nums text-ink-muted">
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
                        className="absolute z-50 bottom-full mb-1 pointer-events-none text-[10px] font-medium whitespace-nowrap rounded-md"
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

        <p className="pt-3 text-[11px] text-ink-muted">
          A dot is one period of one template, sized by how many entities landed in it. Click one to
          filter the Library to that slice; click it again to clear.
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
