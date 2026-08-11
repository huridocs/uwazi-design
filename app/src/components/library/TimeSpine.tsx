import { useMemo, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { languageAtom } from "../../atoms/language";
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
/** The instant mark's radius. It was 2.5, and at that size the axis hairline ran
 *  straight THROUGH the dot: the mark read as a speck of ink behind the line
 *  rather than a node on it. The ring below is the other half of the fix. */
const MARK_R = 3.5;
/** A paper ring, painted UNDER the fill (`paintOrder: "stroke"`, so the fill
 *  covers the inner half and the stroke reads as an outer ring — half this
 *  number wide). It stops the axis at the mark's edge and keeps two
 *  near-touching marks countable. */
const MARK_RING = 3;
/** Marks closer together than their own drawn width can't be told apart — they
 *  fuse into one bead and their leaders into a hair-bundle. Rows this close
 *  share ONE cluster mark: a capsule spanning the instants, and one brace down
 *  to their rows. Measured on the mark's full footprint, ring included, so the
 *  test is exactly "would these two touch". */
const CLUSTER_EPS = 2 * (MARK_R + MARK_RING / 2) + 1;
/** The UTC day an instant falls on — the same day `formatDay` prints in the date
 *  gutter, so two rows share a value here exactly when they show one date. */
const dayOf = (t: number) => Math.floor(t / 86_400_000);
/** Where the brace's stem stands inside the leader gutter (0 = the row's edge,
 *  `LEADER_W - 4` = the axis). Far enough from the axis that the capsule reads
 *  on its own, close enough that the ticks into the rows stay short. */
const STEM_X = 7;
/** The longest stretch of nothing the axis draws at true scale before it elides. */
export const MAX_GAP = 88;
/** The "N later" break label's line box — `leading-4` on the label pins it to
 *  exactly this, so the reserve below is a real measurement and not a guess. */
const GAP_LABEL_H = 16;
/** Clearance above and below the label inside its reserve. Without it the label
 *  is mathematically correct and visually wrong: a reserve equal to the line box
 *  leaves the phrase touching the rows on both sides, which reads as a collision
 *  even though it technically isn't one. */
const GAP_CLEAR = 8;

/** The "N later" break label's own box on the axis. It sits in the SAME columns
 *  as a row body (both run from the pane's inline-start to the axis), so it has
 *  to reserve height against rows the way a row does — otherwise a
 *  collision-pushed stack catches up with the break and the label prints on top
 *  of a row label.
 *
 *  INVARIANT: `GAP_H + rowHeight ≤ MAX_GAP`. A break's row lands a whole
 *  `MAX_GAP` below the previous row's ideal position, so as long as the reserve
 *  still fits once that row's own height is taken out, an UNCROWDED break never
 *  binds the floor and the spine lays out identically to one with no reserve at
 *  all. That bound is `rowHeight ≤ 56` at this reserve: both spines run at
 *  `EVENT_H` (22), which leaves 34px of slack, and a denser 44 still leaves 12.
 *  Past 56 an unclustered break would start being pushed down — and past
 *  `MAX_GAP` itself nothing elides at all (see `rowHeight` on Props). */
export const GAP_H = GAP_LABEL_H + 2 * GAP_CLEAR;

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
  const rtl = useAtomValue(languageAtom) === "AR";

  const { rows, clusters, height, years, gaps } = useMemo(() => {
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
      // A break's label competes for the same columns as a row body, so it joins
      // the collision push as a box of its own: the row after a break may not
      // come closer than one label's height past where the previous row already
      // pushed to. Without it, a stack pushed far enough to reach the break puts
      // the row at `cursor` and the label at `(cursor + y) / 2` — the same y, one
      // printed over the other. In the uncrowded case `ideal` is a whole MAX_GAP
      // clear of `cursor`, so this floor never binds and nothing moves.
      const y = Math.max(ideal, broke ? cursor + GAP_H : cursor);
      // The break marker goes between the LAID-OUT rows, not at the ideal
      // position — collision-pushed neighbours would sit on top of it. Centre it
      // between the two rows' centres, which is also the midpoint of the empty
      // band between their facing edges.
      //
      // `+ 1` matches the row body's own `top: y - rowHeight / 2 + 1`: the rows
      // are DRAWN a pixel below the centres they're laid out on, so a label
      // centred on the bare midpoint sits a pixel proud of the band it was given
      // — 7px of air above and 9 below instead of 8 and 8. Measured, not
      // guessed; keep the two offsets in step.
      if (broke) gaps.push({ y: (prevY + y) / 2 + 1, ms: broke });
      prevY = y;
      cursor = y + rowHeight;
      return { row, y, ideal };
    });
    // Where a mark lands once the elisions are taken out. A mark INSIDE an
    // elided band is the case that bites: it has no cut of its own to subtract,
    // so it kept its uncompressed position and printed BELOW marks it precedes —
    // a spine running Jan, then Jul, then Apr. Inside a band it compresses with
    // the band, which keeps the sequence monotonic and says the true thing: that
    // stretch of the axis is squeezed.
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
    const laid = rows.map((r) => ({ ...r, y: r.y + PAD, ideal: r.ideal + PAD }));

    // Marks that would fuse become ONE cluster, on EITHER of two tests.
    //
    // The first is the DRAWN distance between instants, not equal timestamps: at
    // a compressed scale a fortnight of filings overlaps exactly as badly as
    // thirteen documents dated the same day, and both want the same treatment.
    //
    // The second is the DATE THE ROWS PRINT. Distance alone leaves one case
    // incoherent: rows carrying intraday timestamps read "24 Apr 1986" in the
    // gutter whatever the hour, so once the scale is open enough for a few hours
    // to exceed a mark's width (it runs to 40,000px/year), one date on screen
    // grows a second mark — and a reader has no way to tell that from two dates.
    // Every spine prints `SpineDate`, so "one mark per date shown" is the
    // primitive's invariant to keep, and `dayOf` reads the same UTC day
    // `formatDay` does.
    //
    // A UNION, not a replacement: the day test can only ever merge more, so the
    // compressed-fortnight behaviour above survives intact. It changes nothing
    // in the corpora as they stand (CEJIL dates are unix days at midnight UTC,
    // the sample's are date-only), which is the point — it closes the case
    // before a corpus with real timestamps opens it.
    //
    // Chaining is deliberate — a run of rows each within a mark's width of the
    // last IS one continuous band of activity, and drawing it as one capsule is
    // what it looks like.
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

    return {
      rows: laid,
      clusters,
      height,
      years: years.map((y) => ({ ...y, y: y.y + PAD })),
      gaps: gaps.map((g) => ({ ...g, y: g.y + PAD })),
    };
  }, [input, rowHeight]);

  // Nothing to plot draws NOTHING — not an axis. With no rows the extent
  // collapses to the epoch and the anchor mark below would print a lone "1970"
  // against an empty rail, which reads as a corpus dated 1970 rather than as no
  // corpus at all. Both callers already say so in words; this is the primitive
  // refusing to contradict them.
  if (!rows.length) return null;

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
          {/* ink-TERTIARY, not muted. At 9px these are small text by WCAG's
              measure and muted (#777 on parchment) lands at 3.94:1 — under AA in
              light, and worse in dark, where muted is the DARKER of the two.
              Tertiary is the design system's quiet-but-readable step and clears
              it in both. The Rail and Density tracks' marks moved with it; the
              three axes are one label column and can't drift. */}
          <span
            className="text-[9px] tabular-nums text-ink-tertiary whitespace-nowrap"
            style={{ width: geom.LABEL }}
          >
            {y.label}
          </span>
        </div>
      ))}

      {/* Elided silences.
          The phrase reads at the START of the row columns, with the dashed rule
          running from it toward the axis — NOT the other way round, which is
          where it used to sit. Hard against the axis it landed in two occupied
          places at once: the column every row ends with (a run of thirteen
          documents all labelled "Document", and an italic "2 months later"
          mixed in among them, reading as a fourteenth), and the leader gutter,
          where the rule crossed the very curves a break exists to explain. The
          band it sits in is empty by construction (GAP_H is reserved for it), so
          at the start it has the whole width to itself.

          It STOPS at the row bodies' own inline-end edge and leaves the gutter
          clear, because the row after a break is the one most likely to be
          pushed — its leader runs down through exactly this band. */}
      {gaps.map((g, i) => (
        <div
          key={`gap-${i}-${g.y}`}
          className="absolute flex items-center gap-2 ps-2 pointer-events-none -translate-y-1/2"
          style={{ top: g.y, insetInlineStart: 0, insetInlineEnd: AXIS_GUTTER + LEADER_W }}
        >
          {/* `dir="ltr"`: the phrase leads with a number, so an RTL pane
              otherwise renders "months later 4". Isolating the digit alone isn't
              enough — the whole phrase has to keep its order.
              `leading-4` pins the line box to GAP_H — the height the layout
              reserved for it. Inheriting the line-height instead would let the
              label outgrow its reserve on a caller with roomier leading. */}
          <span dir="ltr" className="shrink-0 text-[10px] leading-4 italic text-ink-tertiary">
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

      {/* Instants and leaders — ONE drawing per cluster, not per row. */}
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
  /** Where the row is DRAWN, after the collision push. */
  y: number;
  /** Where its instant truly is on the axis. */
  ideal: number;
}

/** One instant, or a stack of them, and the leader(s) back to the rows.
 *
 *  A single row draws what it always drew: a mark on the axis and one curve down
 *  to the row. A cluster — rows whose marks would fuse — draws a CAPSULE instead:
 *  one rounded stroke spanning the instants, then one brace (a curve, a stem and
 *  a tick per row) rather than a fan of near-identical curves out of a single
 *  bead. The capsule is measured, not decorative: it starts at the first instant
 *  and ends at the last, so thirteen documents filed on one day read as a dot and
 *  thirteen filed over a fortnight read as a stroke that long.
 *
 *  Colour: the members' colour where they agree, ink-tertiary where they don't —
 *  the same honesty the Rail's counted node keeps by going neutral once a period
 *  is too busy to speak for one type. Every row still carries its own colour on
 *  its own line; the axis is not where a mixed group gets to pick a winner.
 *
 *  The whole drawing mirrors under RTL. The box already flips (`insetInlineEnd`),
 *  but SVG coordinates don't, so without this the curves would leave the axis
 *  going the wrong way and land on top of the year marks. */
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
          {/* Brace: one curve out of the capsule, one stem, one short tick per
              row. Thirteen rows cost thirteen 7px ticks instead of thirteen
              full curves leaving the same point. */}
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

      {/* The mark itself: a capsule across the cluster's instants, a circle for a
          lone one (a zero-height capsule IS that circle, so it is drawn once). */}
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

      {/* The selected member surfaces from the group in its own colour — the one
          thing a neutral capsule would otherwise swallow. */}
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
