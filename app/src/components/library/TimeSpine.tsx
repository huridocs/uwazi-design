import { useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { bucketOf, elapsed, formatDay } from "../../utils/timeline";

/* ONE track geometry, shared by Rail, Density and BOTH spines. The axis lands at
 * the same x in every layout, so switching between them doesn't slide the
 * timeline across the pane. All measure from the pane's inline-end edge:
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
/** On a phone the track was taking 90px of a 414px screen — a fifth of the width,
 *  spent on a gutter, while the rows beside it truncated to "Kimel. Informe …".
 *  Same geometry, scaled down. */
const MOBILE_SCALE = 0.62;

/** The track's geometry, scaled for the viewport. ONE source, so the cluster
 *  nodes, the density bars, the marks and both spines' axes stay on the same line
 *  at every width. */
export function useTrackGeom() {
  const k = useAtomValue(breakpointAtom) === "mobile" ? MOBILE_SCALE : 1;
  return {
    W: Math.round(TRACK_W * k),
    AXIS: Math.round(TRACK_AXIS * k),
    BAR: Math.round(TRACK_BAR * k),
    LABEL: Math.round(TRACK_LABEL * k),
  };
}

/** Floor for the adaptive scale — below this a multi-decade sweep reads as a void. */
export const PX_PER_YEAR = 190;
/** Default row box: one line. A row occupies this much axis whatever it draws,
 *  so collisions push down instead of overlapping. */
export const EVENT_H = 22;
/** The gutter kept for the leader line between the axis and the pushed row. */
export const LEADER_W = 22;
/** The longest stretch of nothing the axis draws at true scale before it elides. */
export const MAX_GAP = 88;

export interface SpineRow<T> {
  key: string;
  /** The instant this row sits at (ms). */
  t: number;
  item: T;
}

interface Props<T> {
  rows: SpineRow<T>[];
  /** Axis box per row. **Leave it alone unless you have measured what happens.**
   *  It is not a styling knob: the adaptive scale is multiplied by it, so raising
   *  it stretches the whole chronology by the same factor — and once it passes
   *  `MAX_GAP` (88) no silence can ever exceed a row, so nothing elides and the
   *  axis degenerates into a column of whitespace. Both spines run at the default
   *  `EVENT_H`; the Results spine shipped at 104 and had to be walked back.
   *  If a row needs to say more, say it on ONE line — that's what the passage
   *  continuation in the Results spine is. */
  rowHeight?: number;
  /** Colour of the instant dot on the axis. */
  dotColor: (item: T) => string;
  /** Full-strength dot (selected/active) instead of the resting 0.7. */
  dotActive?: (item: T) => boolean;
  /** The row body. Positioned by the spine, styled by the caller — the caller
   *  owns what a row SAYS, never where it sits. */
  renderRow: (item: T, ctx: { t: number }) => ReactNode;
}

/** The proportional chronology, shared by the Timeline's Spine layout and the
 *  Results view's.
 *
 *  It owns everything that must be identical between them and would otherwise
 *  drift on the next edit: the axis inset (`useTrackGeom`, the same x the Rail
 *  and Density tracks use), the adaptive scale, the year/month marks, the
 *  elided-silence breaks, the collision push and the leader line back to the true
 *  instant. Callers supply only the rows and what each one draws.
 *
 *  Three properties worth keeping in mind when you render into it:
 *   - a row occupies `rowHeight` of axis whatever it actually draws — if the body
 *     grows past that, rows overlap. Raise `rowHeight`, don't clamp the axis.
 *   - the scroller belongs to the HOST. This renders one positioned canvas so it
 *     can sit inside whatever pane the caller already scrolls.
 *   - rows are CENTRED on their instant, so the canvas reserves half a row at
 *     each end and lays everything out inside that. A row of any height stays
 *     fully on-canvas and therefore scrollable-to; nothing renders at a negative
 *     offset, where a scroller could never reach it.
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

  const { rows, height, years, gaps } = useMemo(() => {
    // Half a row of reserve at each end of the canvas. Rows are CENTRED on their
    // instant (`top: y - rowHeight/2 + 1`) and the earliest y is 6, so the first
    // row reaches `rowHeight/2 - 7` ABOVE the origin — already 4px at the default
    // 22, and the whole row once `rowHeight` passes ~14. Content above a
    // scroller's origin is unreachable: scrollTop bottoms out at 0, so it sits
    // clipped under the host's header with no way to bring it into view.
    //
    // Everything below is laid out in unpadded coordinates and shifted by PAD in
    // ONE place (the return), because rows, year marks, silence breaks and
    // leader lines share this origin — move them separately and the leaders
    // detach from the dots they point at.
    const PAD = Math.ceil(rowHeight / 2);
    const sorted = [...input].sort((a, b) => a.t - b.t);
    const min = sorted.length ? sorted[0].t : 0;
    const max = sorted.length ? sorted[sorted.length - 1].t : 0;
    const yearMs = 365.2425 * 86_400_000;
    // The scale ADAPTS to the density of what's on screen. A fixed px-per-year
    // makes a single busy year collide into an undifferentiated list (the exact
    // thing this layout exists to avoid) and a 40-year sweep into a void. Give
    // every event roughly its own row's worth of axis, and the proportions read.
    const spanYears = Math.max((max - min) / yearMs, 1 / 365);
    const scale = Math.min(
      Math.max((sorted.length * rowHeight * 1.35) / spanYears, PX_PER_YEAR),
      40_000,
    );
    const raw = (t: number) => 6 + ((t - min) / yearMs) * scale;

    // A long silence is information, but 700px of white is not. Anything longer
    // than MAX_GAP collapses to MAX_GAP and gets a labelled break, so the axis
    // stays proportional WHERE THE EVENTS ARE and elides where they aren't.
    const cuts: { atRaw: number; cut: number }[] = [];
    const gaps: { y: number; ms: number }[] = [];
    let accum = 0;
    let prevRaw = raw(min);
    let prevT = min;
    let cursor = 0;
    const rows = sorted.map((row) => {
      const r = raw(row.t);
      const delta = r - prevRaw;
      let broke = 0;
      if (delta > MAX_GAP) {
        const cut = delta - MAX_GAP;
        cuts.push({ atRaw: r, cut });
        accum += cut;
        broke = row.t - prevT;
      }
      prevRaw = r;
      prevT = row.t;
      const ideal = r - accum;
      const y = Math.max(ideal, cursor);
      // The break marker goes between the LAID-OUT rows, not at the ideal
      // position — collision-pushed neighbours would sit on top of it.
      if (broke) gaps.push({ y: (cursor + y) / 2, ms: broke });
      cursor = y + rowHeight;
      return { row, y, ideal };
    });
    const at = (t: number) => {
      const r = raw(t);
      let a = 0;
      for (const c of cuts) if (c.atRaw <= r) a += c.cut;
      return r - a;
    };
    // `+ PAD` pays for the top reserve the shift below consumes. The BOTTOM
    // reserve is already there: `cursor` advances a full `rowHeight` past the
    // last row's centre, which is `PAD` past that row's bottom edge — so the
    // canvas ends PAD + 24 clear of the last thing drawn on it.
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
    // The first mark is often clipped (a range starting 17 Jan has no 1 Jan tick
    // above it) — anchor the top of the axis explicitly.
    if (!years.length || years[0].y > 14) {
      const anchor = bucketOf(min, spanYears < 2.5 ? "month" : "year").label;
      years.unshift({ label: spanYears < 2.5 ? anchor.slice(0, 3) : anchor, y: 6 });
    }
    // The single shift into the reserve — see PAD above.
    return {
      rows: rows.map((r) => ({ ...r, y: r.y + PAD, ideal: r.ideal + PAD })),
      height,
      years: years.map((y) => ({ ...y, y: y.y + PAD })),
      gaps: gaps.map((g) => ({ ...g, y: g.y + PAD })),
    };
  }, [input, rowHeight]);

  return (
    <div className="relative" style={{ height }}>
      {/* Axis — right rail (inline-end), where the document's reference minimap
          sits and where the Rail and Density tracks put theirs. */}
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
          key={`${y.label}-${y.y}`}
          className="absolute flex items-center gap-1 -translate-y-1/2"
          style={{ top: y.y, insetInlineEnd: 0 }}
        >
          <span className="w-1.5 h-px" style={{ backgroundColor: "var(--border-primary)" }} />
          <span
            className="text-[9px] tabular-nums text-ink-muted whitespace-nowrap"
            style={{ width: geom.LABEL }}
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
          {/* `dir="ltr"`: the phrase leads with a number, so an RTL pane
              otherwise renders "months later 4". Isolating the digit alone isn't
              enough — the whole phrase has to keep its order. */}
          <span dir="ltr" className="text-[10px] italic text-ink-muted">
            {elapsed(g.ms)} later
          </span>
          <span
            className="w-8 h-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(to right, var(--border-primary) 0 3px, transparent 3px 6px)",
            }}
          />
        </div>
      ))}

      {rows.map(({ row, y, ideal }) => {
        const drop = Math.max(1, y - ideal);
        return (
          <div key={row.key}>
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
              <circle
                cx={LEADER_W - 4}
                cy={0}
                r={2.5}
                fill={dotColor(row.item)}
                opacity={dotActive?.(row.item) ? 1 : 0.7}
              />
            </svg>

            <div
              className="absolute"
              style={{
                top: y - rowHeight / 2 + 1,
                insetInlineStart: 0,
                insetInlineEnd: AXIS_GUTTER + LEADER_W,
              }}
            >
              {renderRow(row.item, { t: row.t })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The date gutter — same width, size and colour in every spine, so the two
 *  layouts line up column for column and can't drift apart by a `w-` class.
 *
 *  The date is a fixed-order token, not prose: under RTL "9 Feb 2012" otherwise
 *  reorders to "Feb 2012 9". `<bdi>` isolates the RUN while the BOX keeps the
 *  pane's direction — putting `dir="ltr"` on the box itself would also flip its
 *  text-align, parking the date at the far side of its 5.5rem column, away from
 *  the dot it belongs to. */
export function SpineDate({ t }: { t: number }) {
  return (
    <span className="shrink-0 w-[5.5rem] text-[10px] tabular-nums text-ink-tertiary">
      <bdi dir="ltr">{formatDay(t)}</bdi>
    </span>
  );
}
