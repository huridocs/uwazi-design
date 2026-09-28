import { useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { languageAtom } from "../../atoms/language";
import { bucketOf, elapsed, formatDay } from "../../utils/timeline";

/* One track geometry, shared by Rail, Density and both spines, so the axis sits at
 * the same x in every layout and switching layouts doesn't move the timeline.
 * All values measure from the pane's inline-end edge:
 *
 *   |<-- TRACK_BAR -->|<- TRACK_AXIS ->|
 *   [ bars / leaders ]|                | axis line
 *                     |     marks      | TRACK_LABEL
 *
 * TRACK_AXIS must exceed TRACK_LABEL by more than a counted ring's radius: the
 * cluster nodes straddle the axis, while the density bars only grow inward. */
// Sized so a date label fits at the 11px text floor.
const TRACK_LABEL = 32;
const TRACK_AXIS = 44;
const TRACK_BAR = 42;
const TRACK_W = TRACK_AXIS + TRACK_BAR + 4;
/** At full size the track takes about a fifth of a phone's width and the rows
 *  beside it truncate, so on mobile the same geometry is scaled down. */
const MOBILE_SCALE = 0.62;

/** The track's geometry, scaled for the viewport. Single source, so cluster
 *  nodes, density bars, marks and both spines' axes stay aligned at every width. */
export function useTrackGeom() {
  const k = useAtomValue(breakpointAtom) === "mobile" ? MOBILE_SCALE : 1;
  return {
    W: Math.round(TRACK_W * k),
    AXIS: Math.round(TRACK_AXIS * k),
    BAR: Math.round(TRACK_BAR * k),
    LABEL: Math.round(TRACK_LABEL * k),
  };
}

/** Floor for the adaptive scale; below it a multi-decade range becomes mostly empty space. */
export const PX_PER_YEAR = 190;
/** Default row box: one line. A row occupies this much axis whatever it draws,
 *  so collisions push down instead of overlapping. */
export const EVENT_H = 22;
/** The gutter kept for the leader line between the axis and the pushed row. */
export const LEADER_W = 22;
/** The instant mark's radius. Large enough that the axis hairline doesn't run
 *  through the dot; the ring below stops the line at the mark's edge. */
const MARK_R = 3.5;
/** A paper ring painted under the fill (`paintOrder: "stroke"`), so it shows as
 *  an outer ring half this width. It stops the axis at the mark's edge and keeps
 *  two near-touching marks distinguishable. */
const MARK_RING = 3;
/** Marks closer than their own drawn width can't be told apart, so rows this
 *  close share one cluster mark (a capsule and one brace). Measured on the full
 *  footprint, ring included: the test is "would these two marks touch". */
const CLUSTER_EPS = 2 * (MARK_R + MARK_RING / 2) + 1;
/** The UTC day an instant falls on, the same day `formatDay` prints, so two rows
 *  share a value here exactly when they show the same date. */
const dayOf = (t: number) => Math.floor(t / 86_400_000);
/** The brace stem's x in the leader gutter (0 = row edge, `LEADER_W - 4` = axis):
 *  clear of the capsule, close enough that the ticks into the rows stay short. */
const STEM_X = 7;
/** The longest stretch of nothing the axis draws at true scale before it elides. */
export const MAX_GAP = 88;
/** The "N later" label's line box; `leading-4` on the label pins it to this. */
const GAP_LABEL_H = 16;
/** Clearance above and below the label inside its reserve, so the phrase doesn't
 *  touch the rows on either side. */
const GAP_CLEAR = 8;

/** Height reserved for the "N later" break label. It sits in the same columns as
 *  a row body, so it reserves height the way a row does; otherwise a
 *  collision-pushed stack reaches the break and the label prints over a row.
 *
 *  Invariant: `GAP_H + rowHeight ≤ MAX_GAP` (here `rowHeight ≤ 56`). Within it, an
 *  uncrowded break never binds the floor and the layout matches one with no
 *  reserve. Past 56 uncrowded breaks get pushed down; past `MAX_GAP` nothing
 *  elides at all (see `rowHeight` on Props). */
export const GAP_H = GAP_LABEL_H + 2 * GAP_CLEAR;

export interface SpineRow<T> {
  key: string;
  /** The instant this row sits at (ms). */
  t: number;
  /** Optional end of a SPAN that starts at `t` (a mandate, a term). The row still
   *  sits at `t`; the span is a thin bar down the axis from there to its end,
   *  clipped to the canvas. Rows without it draw exactly what they always drew. */
  tEnd?: number;
  item: T;
}

interface Props<T> {
  rows: SpineRow<T>[];
  /** Axis box per row. Not a styling knob: the adaptive scale is multiplied by it,
   *  and past `MAX_GAP` (88) no silence exceeds a row, so nothing elides and the
   *  axis becomes whitespace. Keep the default `EVENT_H`; put extra content on one line. */
  rowHeight?: number;
  /** Colour of the instant dot on the axis. */
  dotColor: (item: T) => string;
  /** Full-strength dot (selected/active) instead of the resting 0.7. */
  dotActive?: (item: T) => boolean;
  /** The row body. The spine positions it; the caller decides what it shows. */
  renderRow: (item: T, ctx: { t: number }) => ReactNode;
}

/** The proportional chronology, shared by the Timeline's Spine layout and the
 *  Results view's spine layout. It owns the axis inset (`useTrackGeom`), the
 *  adaptive scale, year/month marks, elided-silence breaks, the collision push
 *  and leader lines; callers supply the rows and what each one draws.
 *   - A row occupies `rowHeight` of axis whatever it draws; a taller body overlaps.
 *   - The host owns the scroller; this renders one positioned canvas.
 *   - Rows are centred on their instant, so the canvas reserves half a row at each
 *     end; nothing renders at a negative offset, where a scroller can't reach it.
 */
export function TimeSpine<T>({
  rows: input,
  rowHeight = EVENT_H,
  dotColor,
  dotActive,
  renderRow,
}: Props<T>) {
  const geom = useTrackGeom();
  const AXIS_GUTTER = geom.AXIS;
  const rtl = useAtomValue(languageAtom) === "AR";

  const { rows, clusters, height, years, gaps, spans } = useMemo(() => {
    // Half a row of reserve at each end. Rows are centred on their instant and the
    // earliest y is 6, so without it the first row starts above the origin, where
    // scrollTop can't reach. Layout below is unpadded and shifted by PAD in one
    // place (the return): rows, marks, breaks and leaders share this origin, and
    // shifting them separately detaches the leaders from their dots.
    const PAD = Math.ceil(rowHeight / 2);
    const sorted = [...input].sort((a, b) => a.t - b.t);
    const min = sorted.length ? sorted[0].t : 0;
    const max = sorted.length ? sorted[sorted.length - 1].t : 0;
    const yearMs = 365.2425 * 86_400_000;
    // The scale adapts to event density: a fixed px-per-year collapses a busy year
    // into a list and stretches a 40-year range into empty space. Each event gets
    // roughly one row of axis.
    const spanYears = Math.max((max - min) / yearMs, 1 / 365);
    const scale = Math.min(
      Math.max((sorted.length * rowHeight * 1.35) / spanYears, PX_PER_YEAR),
      40_000,
    );
    const raw = (t: number) => 6 + ((t - min) / yearMs) * scale;

    // A gap longer than MAX_GAP collapses to MAX_GAP with a labelled break, so the
    // axis stays proportional where events are and elides where they aren't.
    const cuts: { fromRaw: number; atRaw: number; cut: number }[] = [];
    const gaps: { y: number; ms: number }[] = [];
    let accum = 0;
    let prevRaw = raw(min);
    let prevT = min;
    let cursor = 0;
    let prevY = 0;
    const rows = sorted.map((row) => {
      const r = raw(row.t);
      const delta = r - prevRaw;
      let broke = 0;
      if (delta > MAX_GAP) {
        const cut = delta - MAX_GAP;
        cuts.push({ fromRaw: prevRaw, atRaw: r, cut });
        accum += cut;
        broke = row.t - prevT;
      }
      prevRaw = r;
      prevT = row.t;
      const ideal = r - accum;
      // A break's label shares the row columns, so it joins the collision push:
      // the row after a break sits at least GAP_H past the previous row's end, or
      // a pushed stack prints the label over a row. Uncrowded, this never binds.
      const y = Math.max(ideal, broke ? cursor + GAP_H : cursor);
      // The break label centres between the laid-out rows, not the ideal positions,
      // or pushed neighbours cover it. `+ 1` matches the row body's
      // `top: y - rowHeight / 2 + 1`; keep the two offsets in step.
      if (broke) gaps.push({ y: (prevY + y) / 2 + 1, ms: broke });
      prevY = y;
      cursor = y + rowHeight;
      return { row, y, ideal };
    });
    // Where a mark lands once elisions are taken out. A mark inside an elided band
    // compresses with the band; subtracting only whole cuts would print it below
    // later marks (Jan, Jul, Apr).
    const at = (t: number) => {
      const r = raw(t);
      let a = 0;
      for (const c of cuts) {
        if (c.atRaw <= r) a += c.cut;
        else if (c.fromRaw < r) {
          const span = c.atRaw - c.fromRaw;
          return c.fromRaw - a + ((r - c.fromRaw) / span) * (span - c.cut);
        }
      }
      return r - a;
    };
    // `+ PAD` covers the top reserve. The bottom reserve is already in `cursor`,
    // which sits a full `rowHeight` past the last row's centre.
    const height = cursor + PAD + 24;

    // Marks: years across a long sweep, months once the range is short enough
    // that "2009" alone would be the only label on the whole axis.
    const years: { label: string; y: number }[] = [];
    const d0 = new Date(min);
    const d1 = new Date(max);
    if (spanYears < 2.5) {
      const step = spanYears < 0.6 ? 1 : 3;
      for (
        let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1));
        m.getTime() <= max;
        m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + step, 1))
      ) {
        const pos = at(m.getTime());
        // "Jan 2009" doesn't fit the label column: January shows the year, other
        // months show a three-letter name.
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
    // A range starting mid-period has no tick above its first row, so anchor the
    // top of the axis explicitly.
    if (!years.length || years[0].y > 14) {
      const anchor = bucketOf(min, spanYears < 2.5 ? "month" : "year").label;
      years.unshift({ label: spanYears < 2.5 ? anchor.slice(0, 3) : anchor, y: 6 });
    }
    // The single shift into the reserve — see PAD above.
    const laid = rows.map((r) => ({ ...r, y: r.y + PAD, ideal: r.ideal + PAD }));

    // Rows join one cluster if either test holds (a union: the day test only adds):
    //  - drawn distance within CLUSTER_EPS, since at a compressed scale nearby
    //    instants overlap as badly as equal ones;
    //  - the same printed day (`dayOf` matches `formatDay`), so intraday
    //    timestamps at a wide scale never show two marks for one date.
    // Chaining is deliberate: a run of close rows is drawn as one capsule.
    const clusters: { members: typeof laid; top: number; bottom: number }[] = [];
    for (const r of laid) {
      const open = clusters[clusters.length - 1];
      const last = open?.members[open.members.length - 1];
      const sameDay = last ? dayOf(last.row.t) === dayOf(r.row.t) : false;
      if (open && (sameDay || r.ideal - open.bottom <= CLUSTER_EPS)) {
        open.members.push(r);
        open.bottom = r.ideal;
      } else {
        clusters.push({ members: [r], top: r.ideal, bottom: r.ideal });
      }
    }

    // Spans: from the row's own instant to where its end falls on the (elided)
    // axis, never past the canvas.
    const spans = laid
      .filter((r) => r.row.tEnd !== undefined && r.row.tEnd > r.row.t)
      .map((r) => ({ key: r.row.key, item: r.row.item, top: r.ideal, bottom: Math.min(at(r.row.tEnd!) + PAD, height - PAD) }));

    return {
      rows: laid,
      clusters,
      height,
      years: years.map((y) => ({ ...y, y: y.y + PAD })),
      gaps: gaps.map((g) => ({ ...g, y: g.y + PAD })),
      spans,
    };
  }, [input, rowHeight]);

  // No rows renders nothing: the extent would collapse to the epoch and the
  // anchor mark would print a lone "1970". Callers show their own empty state.
  if (!rows.length) return null;

  return (
    <div data-component="TimeSpine" className="relative" style={{ height }}>
      {/* Axis on the inline-end side, matching the Rail and Density tracks. */}
      <div
        data-part="axis"
        aria-hidden
        className="absolute top-0 bottom-0"
        style={{
          insetInlineEnd: AXIS_GUTTER,
          width: 1,
          backgroundColor: "var(--border-primary)",
        }}
      />
      {years.map((y) => (
        <div
          key={`${y.label}-${y.y}`}
          data-part="year"
          aria-hidden
          className="absolute flex items-center gap-1 -translate-y-1/2"
          style={{ top: y.y, insetInlineEnd: 0 }}
        >
          <span className="w-1.5 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
          {/* Tertiary, not muted: muted fails AA contrast for small text in both
              themes. Keep in step with the Rail and Density tracks' marks. */}
          <span
            className="text-meta leading-none tabular-nums text-ink-tertiary whitespace-nowrap"
            style={{ width: geom.LABEL }}
          >
            {y.label}
          </span>
        </div>
      ))}

      {/* Elided silences. The phrase sits at the start of the row columns with the
          rule running toward the axis; at the axis end it would mix with the rows'
          trailing type column. It stops at the row bodies' edge so it doesn't
          cross the leader of the pushed row after the break. */}
      {gaps.map((g, i) => (
        <div
          key={`gap-${i}-${g.y}`}
          data-part="gap"
          className="absolute flex items-center gap-2 ps-2 pointer-events-none -translate-y-1/2"
          style={{ top: g.y, insetInlineStart: 0, insetInlineEnd: AXIS_GUTTER + LEADER_W }}
        >
          {/* `dir="ltr"` on the whole phrase: an RTL pane otherwise renders
              "months later 4". `leading-4` pins the line box to GAP_LABEL_H so the
              label can't outgrow its reserve under a caller's roomier leading. */}
          <span dir="ltr" className="shrink-0 text-meta leading-4 italic text-ink-tertiary">
            {elapsed(g.ms)} later
          </span>
          <span
            className="flex-1 h-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--border-primary) 0 3px, transparent 3px 6px)",
            }}
          />
        </div>
      ))}

      {/* Spans run under the marks, so a mark always reads on top of its bar. */}
      {spans.map((sp) => (
        <div
          key={`span-${sp.key}`}
          data-part="span"
          aria-hidden
          className="absolute rounded-full pointer-events-none"
          style={{
            top: sp.top,
            height: Math.max(sp.bottom - sp.top, 2),
            insetInlineEnd: AXIS_GUTTER - 1,
            width: 3,
            backgroundColor: dotColor(sp.item),
            opacity: 0.3,
          }}
        />
      ))}

      {/* Instants and leaders: one drawing per cluster, not per row. */}
      {clusters.map((c) => (
        <ClusterLeader
          key={c.members[0].row.key}
          members={c.members}
          top={c.top}
          bottom={c.bottom}
          axisGutter={AXIS_GUTTER}
          rtl={rtl}
          dotColor={dotColor}
          dotActive={dotActive}
        />
      ))}

      {rows.map(({ row, y }) => (
        <div
          key={row.key}
          data-part="row"
          className="absolute"
          style={{
            top: y - rowHeight / 2 + 1,
            insetInlineStart: 0,
            insetInlineEnd: AXIS_GUTTER + LEADER_W,
          }}
        >
          {renderRow(row.item, { t: row.t })}
        </div>
      ))}
    </div>
  );
}

interface LaidRow<T> {
  row: SpineRow<T>;
  /** Where the row is drawn, after the collision push. */
  y: number;
  /** Where its instant truly is on the axis. */
  ideal: number;
}

/** One instant, or a cluster of them, and the leader(s) back to the rows.
 *
 *  A single row draws a mark and one curve to the row. A cluster draws a capsule
 *  spanning its first to last instant, then one brace (curve, stem, a tick per
 *  row). Colour is the members' shared colour, or ink-tertiary when they differ,
 *  like the Rail's counted node.
 *
 *  The SVG mirrors under RTL: the box flips via `insetInlineEnd` but SVG
 *  coordinates don't, so the curves would otherwise land on the year marks. */
function ClusterLeader<T>({
  members,
  top,
  bottom,
  axisGutter,
  rtl,
  dotColor,
  dotActive,
}: {
  members: LaidRow<T>[];
  top: number;
  bottom: number;
  axisGutter: number;
  rtl: boolean;
  dotColor: (item: T) => string;
  dotActive?: (item: T) => boolean;
}) {
  const AXIS_X = LEADER_W - 4;
  /** Half a mark of headroom above the first instant, so the ring isn't clipped. */
  const oy = top - MARK_R - MARK_RING;
  const rel = (v: number) => v - oy;
  const firstY = members[0].y;
  const lastY = members[members.length - 1].y;
  const many = members.length > 1;

  const colors = members.map((m) => dotColor(m.row.item));
  const fill = colors.every((c) => c === colors[0]) ? colors[0] : "var(--text-tertiary)";
  const active = members.find((m) => dotActive?.(m.row.item));

  /** Where the brace leaves the capsule: the end nearest the stem, so it never
   *  runs back up alongside the capsule it just left. */
  const leave = Math.min(Math.max(firstY, top), bottom);
  const curve = (from: number, to: number, x: number) =>
    `M ${AXIS_X} ${rel(from)} C ${AXIS_X - 9} ${rel(from)}, ${AXIS_X - 13} ${rel(to)}, ${x} ${rel(to)}`;

  return (
    <svg
      data-part={many ? "cluster" : "instant"}
      className="absolute pointer-events-none"
      style={{
        insetInlineEnd: axisGutter - 4,
        top: oy,
        width: LEADER_W,
        height: Math.max(lastY, bottom) - oy + MARK_R + MARK_RING,
        overflow: "visible",
        transform: rtl ? "scaleX(-1)" : undefined,
      }}
      aria-hidden
    >
      {many ? (
        <>
          {/* Brace: one curve out of the capsule, one stem, one short tick per row. */}
          <path d={curve(leave, firstY, STEM_X)} fill="none" stroke="var(--border-primary)" strokeWidth={1} />
          <path
            d={`M ${STEM_X} ${rel(firstY)} V ${rel(lastY)}`}
            fill="none"
            stroke="var(--border-primary)"
            strokeWidth={1}
          />
          {members.map((m) => (
            <path
              key={m.row.key}
              d={`M ${STEM_X} ${rel(m.y)} H 0`}
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth={1}
            />
          ))}
        </>
      ) : (
        <path
          d={curve(top, Math.max(members[0].y, top + 1), 0)}
          fill="none"
          stroke="var(--border-primary)"
          strokeWidth={1}
        />
      )}

      {/* The mark: a capsule across the cluster's instants. For a lone instant the
          zero-height capsule is a circle. */}
      <rect
        x={AXIS_X - MARK_R}
        y={rel(top) - MARK_R}
        width={MARK_R * 2}
        height={bottom - top + MARK_R * 2}
        rx={MARK_R}
        fill={fill}
        stroke="var(--bg-surface)"
        strokeWidth={MARK_RING}
        style={{ paintOrder: "stroke" }}
      />

      {/* The selected member is drawn in its own colour on top of the capsule. */}
      {active && (
        <>
          <circle cx={AXIS_X} cy={rel(active.ideal)} r={MARK_R + 3} fill={dotColor(active.row.item)} opacity={0.2} />
          <circle
            cx={AXIS_X}
            cy={rel(active.ideal)}
            r={MARK_R}
            fill={dotColor(active.row.item)}
            stroke="var(--bg-surface)"
            strokeWidth={MARK_RING}
            style={{ paintOrder: "stroke" }}
          />
        </>
      )}
    </svg>
  );
}

/** The date gutter, shared by every spine so the layouts line up column for column.
 *
 *  Under RTL "9 Feb 2012" would reorder to "Feb 2012 9", so `<bdi>` isolates the
 *  text while the box keeps the pane's direction; `dir="ltr"` on the box would
 *  also flip its text-align and move the date away from its dot. */
export function SpineDate({ t }: { t: number }) {
  return (
    <time
      data-component="SpineDate"
      dateTime={Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : undefined}
      className="shrink-0 w-[5.5rem] text-meta tabular-nums text-ink-tertiary"
    >
      <bdi dir="ltr">{formatDay(t)}</bdi>
    </time>
  );
}
