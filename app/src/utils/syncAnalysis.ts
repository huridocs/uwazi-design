// Sync analysis for the Las Vegas collection: how well the recordings agree on
// the clock. Pure: it reads the corpus's records and references and returns
// numbers, nothing else. The atom is `vegasSyncAtom` (atoms/vegasSync.ts).
//
// The method is the seed's sync check (dev/results/vegas-seed, sync_report.py),
// done here from the references so the app can show it per record:
//
// - An annotation is a `captures` reference from a recording to a moment that
//   carries a media anchor with a clock time: "at 0:04 in this video, 22:09:48".
// - A moment's clock is the median of its annotations across recordings. An
//   annotation the map marks partial ("1 sec. in") is listed but left out of
//   every statistic: the video starts inside the moment, so its clock is not
//   the moment's start.
// - Deviation = an annotation's clock minus its moment's median. An outlier is
//   more than 2 s from the median.
// - A recording's anchors are all its annotations with a clock (ricochets and
//   bullet passes too), partial ones left out. Each implies a start: its clock
//   minus its offset in the video. Drift is the spread of those starts; more
//   than 2 s means the anchors disagree inside one recording (cuts, or mixed
//   timelines).
// - A recording's offset to the shared clock is the median of its deviations
//   from the moments' medians (positive: its annotations run ahead).
// - The title time is compared with the start the first annotation implies.
import type { VegasEntity, VegasReference } from "../data/vegas/types";

/** The moment types the analysis aligns on. Ricochets and bullet passes are
 *  sounds one camera hears, not shared events, so they are left out. */
export const SYNC_MOMENT_TYPES = ["volley", "single-shot", "first-shots", "corridor-shots"] as const;
export type SyncMomentType = (typeof SYNC_MOMENT_TYPES)[number];

/** The threshold of every check, in seconds (the seed's). */
export const SYNC_TOLERANCE_SECONDS = 2;

export type SyncFlag = "outlier" | "drift" | "title-mismatch" | "qualified-annotation" | "no-clock";
export type SyncConfidence = "anchored-consistent" | "anchored-drift" | "one-or-two" | "title-only" | "none";

export const SYNC_FLAG_LABEL: Record<SyncFlag, string> = {
  outlier: "An anchor is more than 2 s from its moment's median",
  drift: "Anchors in the recording disagree by more than 2 s",
  "title-mismatch": "Title time differs from the annotations by more than 2 s",
  "qualified-annotation": "An annotation is marked partial",
  "no-clock": "No clock time",
};

export const SYNC_CONFIDENCE_LABEL: Record<SyncConfidence, string> = {
  "anchored-consistent": "Three or more anchors, consistent",
  "anchored-drift": "Anchors disagree by more than 2 s",
  "one-or-two": "One or two anchors",
  "title-only": "Title time only",
  none: "No clock",
};

export interface SyncAnnotation {
  refId: string;
  recordingId: string;
  momentId: string;
  /** Seconds into the recording. */
  offset: number;
  /** The clock the map annotates there, epoch seconds (Las Vegas wall clock). */
  clock: number;
  label?: string;
  qualifier?: string;
  /** Marked partial on the map: listed, not counted. */
  partial: boolean;
  /** Clock minus the moment's median; undefined for a partial annotation. */
  deviation?: number;
}

export interface MomentSync {
  momentId: string;
  title: string;
  type: SyncMomentType;
  /** A volley's number (1 to 12). */
  volley?: number;
  /** Every annotation, partial ones included, by deviation. */
  annotations: SyncAnnotation[];
  /** The annotations the statistics use (not partial). */
  counted: number;
  /** Distinct recordings among the counted annotations. */
  recordings: number;
  /** Median clock, epoch seconds; null when nothing is counted. */
  median: number | null;
  /** Latest minus earliest counted clock, seconds. */
  spread: number;
  /** Median absolute deviation, seconds. */
  mad: number;
  within1: number;
  within2: number;
  outliers: SyncAnnotation[];
}

export interface RecordingSync {
  recordingId: string;
  /** The record's clock at start, epoch seconds, as the corpus gives it. */
  clockStart?: number;
  /** Its anchors, in the order they occur in the video. */
  anchors: SyncAnnotation[];
  /** Anchors the statistics use (not partial). */
  anchorCount: number;
  /** Median deviation from the moments' medians, seconds; null when no
   *  anchor is on an aligned moment. Positive: the recording's annotations run ahead of the shared
   *  clock. */
  offset: number | null;
  /** Spread of the starts its anchors imply, seconds; null with fewer than
   *  two anchors. */
  drift: number | null;
  /** The clock in the title, and the start the first annotation implies. */
  titleStart?: number;
  impliedStart?: number;
  /** Title minus implied start, seconds; null when either is missing. */
  titleDifference: number | null;
  confidence: SyncConfidence;
  flags: SyncFlag[];
}

export interface VolleyInterval {
  from: number;
  to: number;
  /** Start to start, seconds, from the two medians. */
  seconds: number;
}

/** One check of the map's times against another account. */
export interface SyncComparison {
  id: string;
  check: string;
  /** Whose figure: the NYT analysis or the official timeline. */
  against: "nyt" | "official";
  /** What that account gives. */
  theirs: string;
  /** What the annotations give. */
  ours: string;
  result: "match" | "differs" | "possible" | "within-precision";
  /** The other account is known from press summaries only, not read at source. */
  fromSummary: boolean;
  /** The record that carries their figure (a claim or a moment). */
  entityId?: string;
}

/** The line from a camera to where the shots were fired from. */
export interface SourceBearing {
  recordingId: string;
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  /** Degrees clockwise from north, from the camera to the source. */
  bearing: number;
  metres: number;
}

export interface SyncAnalysis {
  moments: MomentSync[];
  momentById: Map<string, MomentSync>;
  recordingById: Map<string, RecordingSync>;
  /** Volley start to volley start, in order. */
  intervals: VolleyInterval[];
  comparisons: SyncComparison[];
  /** The place the moments were fired from, and each placed camera's line to it. */
  source?: { placeId: string; lat: number; lng: number };
  bearings: SourceBearing[];
  totals: { annotations: number; counted: number; within1: number; within2: number; partial: number };
}

// ── Small statistics ─────────────────────────────────────────────────────────

export function median(xs: readonly number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const spreadOf = (xs: readonly number[]) => (xs.length ? Math.max(...xs) - Math.min(...xs) : 0);

/** Degrees clockwise from north, from `a` to `b` (initial great-circle bearing). */
export function bearingDegrees(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const φ1 = a.lat * r;
  const φ2 = b.lat * r;
  const Δλ = (b.lng - a.lng) * r;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) / r + 360) % 360;
}

/** Metres between two points (haversine). */
export function distanceMetres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const r = Math.PI / 180;
  const dφ = (b.lat - a.lat) * r;
  const dλ = (b.lng - a.lng) * r;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dλ / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

// ── Reading the corpus ───────────────────────────────────────────────────────

const val = (e: VegasEntity, prop: string): unknown => e.metadata[prop]?.[0]?.value;
const num = (e: VegasEntity, prop: string): number | undefined => {
  const v = val(e, prop);
  return typeof v === "number" ? v : undefined;
};
const pointOf = (v: unknown): { lat: number; lng: number } | undefined => {
  const p = v as { lat?: unknown; lon?: unknown } | undefined;
  return p && typeof p.lat === "number" && typeof p.lon === "number" ? { lat: p.lat, lng: p.lon } : undefined;
};

/** The NYT figures the corpus carries as claims, by id. */
const NYT_CLAIMS = {
  bursts: "claim:twelve-bursts",
  longGaps: "claim:three-gaps-over-a-minute",
  buildingBurst: "claim:burst-40s-in-building",
} as const;

const clockText = (t: number) => {
  const d = new Date(t * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
};
const minuteText = (t: number) => clockText(t).slice(0, 5);

/** The whole analysis, from the loaded corpus. */
export function analyseSync(entities: readonly VegasEntity[], references: readonly VegasReference[]): SyncAnalysis {
  const byId = new Map(entities.map((e) => [e.sharedId, e]));
  const isSyncMoment = (e: VegasEntity | undefined): e is VegasEntity =>
    !!e &&
    e.template === "vegas_moment" &&
    (SYNC_MOMENT_TYPES as readonly string[]).includes(String(val(e, "moment_type"))) &&
    val(e, "time_basis") !== "official-report-summary";

  // Annotations, grouped by moment (aligned moments only) and by recording
  // (every annotated moment).
  const byMoment = new Map<string, SyncAnnotation[]>();
  const byRecording = new Map<string, SyncAnnotation[]>();
  for (const r of references) {
    if (r.type !== "captures" || !r.media || typeof r.media.clock !== "number") continue;
    const a: SyncAnnotation = {
      refId: r.id,
      recordingId: r.from,
      momentId: r.to,
      offset: r.media.offset,
      clock: r.media.clock,
      ...(r.media.label ? { label: r.media.label } : {}),
      ...(r.media.qualifier ? { qualifier: r.media.qualifier } : {}),
      partial: !!r.media.qualifier,
    };
    if (isSyncMoment(byId.get(r.to))) (byMoment.get(a.momentId) ?? byMoment.set(a.momentId, []).get(a.momentId)!).push(a);
    (byRecording.get(a.recordingId) ?? byRecording.set(a.recordingId, []).get(a.recordingId)!).push(a);
  }

  // Per moment.
  const moments: MomentSync[] = [];
  for (const [momentId, list] of byMoment) {
    const e = byId.get(momentId)!;
    const counted = list.filter((a) => !a.partial);
    const med = median(counted.map((a) => a.clock));
    for (const a of counted) if (med !== null) a.deviation = a.clock - med;
    const devs = counted.map((a) => a.deviation!);
    const abs = devs.map(Math.abs);
    const type = String(val(e, "moment_type")) as SyncMomentType;
    const volley = type === "volley" ? Number(/volley-(\d+)/.exec(momentId)?.[1]) || undefined : undefined;
    moments.push({
      momentId,
      title: e.title,
      type,
      ...(volley ? { volley } : {}),
      annotations: [...list].sort((a, b) => (a.deviation ?? 0) - (b.deviation ?? 0)),
      counted: counted.length,
      recordings: new Set(counted.map((a) => a.recordingId)).size,
      median: med,
      spread: spreadOf(counted.map((a) => a.clock)),
      mad: median(abs) ?? 0,
      within1: abs.filter((d) => d <= 1).length,
      within2: abs.filter((d) => d <= SYNC_TOLERANCE_SECONDS).length,
      outliers: counted.filter((a) => Math.abs(a.deviation!) > SYNC_TOLERANCE_SECONDS),
    });
  }
  moments.sort((a, b) => (a.median ?? Infinity) - (b.median ?? Infinity));
  const momentById = new Map(moments.map((m) => [m.momentId, m]));

  // Per recording: every Recording record, anchored or not.
  const recordingById = new Map<string, RecordingSync>();
  for (const e of entities) {
    if (e.template !== "vegas_recording") continue;
    const anchors = [...(byRecording.get(e.sharedId) ?? [])].sort((a, b) => a.offset - b.offset);
    const counted = anchors.filter((a) => !a.partial);
    const devs = counted.flatMap((a) => (a.deviation !== undefined ? [a.deviation] : []));
    const offset = median(devs);
    const drift = counted.length >= 2 ? spreadOf(counted.map((a) => a.clock - a.offset)) : null;
    const clockStart = num(e, "clock_start");
    const precision = val(e, "clock_precision");
    const titleStart = num(e, "clock_start_title");
    const impliedStart = anchors.length ? anchors[0].clock - anchors[0].offset : undefined;
    const titleDifference =
      titleStart !== undefined && impliedStart !== undefined ? titleStart - impliedStart : null;
    const flags: SyncFlag[] = [];
    // A title time on :00 may be given to the minute only ("22:08"): it
    // mismatches when the implied start falls outside that minute.
    const titleMinute = titleStart !== undefined && titleStart % 60 === 0;
    if (
      titleDifference !== null &&
      (titleMinute ? titleDifference > 0 || titleDifference <= -60 : Math.abs(titleDifference) > SYNC_TOLERANCE_SECONDS)
    )
      flags.push("title-mismatch");
    if (drift !== null && drift > SYNC_TOLERANCE_SECONDS) flags.push("drift");
    if (devs.some((d) => Math.abs(d) > SYNC_TOLERANCE_SECONDS)) flags.push("outlier");
    if (anchors.some((a) => a.partial)) flags.push("qualified-annotation");
    const timed = precision === "second" || precision === "minute";
    if (!timed && !counted.length) flags.push("no-clock");
    const confidence: SyncConfidence = flags.includes("drift")
      ? "anchored-drift"
      : counted.length >= 3
        ? "anchored-consistent"
        : counted.length
          ? "one-or-two"
          : timed
            ? "title-only"
            : "none";
    recordingById.set(e.sharedId, {
      recordingId: e.sharedId,
      ...(clockStart !== undefined ? { clockStart } : {}),
      anchors,
      anchorCount: counted.length,
      offset,
      drift,
      ...(titleStart !== undefined ? { titleStart } : {}),
      ...(impliedStart !== undefined ? { impliedStart } : {}),
      titleDifference,
      confidence,
      flags,
    });
  }

  // Volley intervals, start to start.
  const volleys = moments.filter((m) => m.volley && m.median !== null).sort((a, b) => a.volley! - b.volley!);
  const intervals: VolleyInterval[] = [];
  for (let i = 1; i < volleys.length; i++) {
    intervals.push({ from: volleys[i - 1].volley!, to: volleys[i].volley!, seconds: volleys[i].median! - volleys[i - 1].median! });
  }

  const comparisons = compare(byId, moments, volleys, intervals);

  // Where the shots came from: the place the moments' `fired_from` names
  // most often, and a line to it from every placed camera.
  const firedFrom = new Map<string, number>();
  for (const r of references) if (r.type === "fired_from") firedFrom.set(r.to, (firedFrom.get(r.to) ?? 0) + 1);
  const placeId = [...firedFrom].sort((a, b) => b[1] - a[1])[0]?.[0];
  const placePoint = placeId ? pointOf(byId.get(placeId) && val(byId.get(placeId)!, "geolocation")) : undefined;
  const bearings: SourceBearing[] = [];
  if (placePoint) {
    for (const e of entities) {
      if (e.template !== "vegas_recording") continue;
      const from = pointOf(val(e, "camera_position"));
      if (!from) continue;
      bearings.push({
        recordingId: e.sharedId,
        from,
        to: placePoint,
        bearing: bearingDegrees(from, placePoint),
        metres: distanceMetres(from, placePoint),
      });
    }
  }

  const all = moments.flatMap((m) => m.annotations);
  return {
    moments,
    momentById,
    recordingById,
    intervals,
    comparisons,
    ...(placeId && placePoint ? { source: { placeId, ...placePoint } } : {}),
    bearings,
    totals: {
      annotations: all.length,
      counted: moments.reduce((n, m) => n + m.counted, 0),
      within1: moments.reduce((n, m) => n + m.within1, 0),
      within2: moments.reduce((n, m) => n + m.within2, 0),
      partial: all.filter((a) => a.partial).length,
    },
  };
}

/** The annotations against the NYT figures and the official times the corpus
 *  carries. A check whose record is missing is left out. */
function compare(
  byId: Map<string, VegasEntity>,
  moments: MomentSync[],
  volleys: MomentSync[],
  intervals: VolleyInterval[],
): SyncComparison[] {
  const out: SyncComparison[] = [];
  const figure = (id: string) => {
    const e = byId.get(id);
    return e ? num(e, "figure") : undefined;
  };

  const bursts = figure(NYT_CLAIMS.bursts);
  if (bursts !== undefined) {
    out.push({
      id: "nyt-bursts",
      check: "Number of bursts",
      against: "nyt",
      theirs: String(bursts),
      ours: `${volleys.length} numbered volleys`,
      result: bursts === volleys.length ? "match" : "differs",
      fromSummary: true,
      entityId: NYT_CLAIMS.bursts,
    });
  }

  const gaps = figure(NYT_CLAIMS.longGaps);
  if (gaps !== undefined) {
    const long = intervals.filter((i) => i.seconds > 60);
    out.push({
      id: "nyt-long-gaps",
      check: "Intervals over one minute",
      against: "nyt",
      theirs: String(gaps),
      ours: long.length
        ? `${long.length} (${long.map((i) => `${i.from} to ${i.to}, ${i.seconds} s`).join("; ")})`
        : "0",
      result: gaps === long.length ? "match" : "differs",
      fromSummary: true,
      entityId: NYT_CLAIMS.longGaps,
    });
  }

  const corridor = moments.find((m) => m.type === "corridor-shots" && m.median !== null);
  const buildingSeconds = figure(NYT_CLAIMS.buildingBurst);
  if (buildingSeconds !== undefined && corridor) {
    out.push({
      id: "nyt-building-burst",
      check: "A burst heard below the source only",
      against: "nyt",
      theirs: `About ${buildingSeconds} s, no clock time`,
      ours: `Corridor shots at ${clockText(corridor.median!)} in ${corridor.recordings} recordings, no duration`,
      result: "possible",
      fromSummary: true,
      entityId: NYT_CLAIMS.buildingBurst,
    });
  }

  // Official times: the timeline's moments, given to the minute.
  const official = [...byId.values()].filter(
    (e) => e.template === "vegas_moment" && val(e, "time_basis") === "official-report-summary",
  );
  const firstAnnotated = moments.find((m) => m.type === "first-shots" && m.median !== null);
  const lastVolley = volleys[volleys.length - 1];
  for (const e of official) {
    const type = val(e, "moment_type");
    const t = num(e, "clock_start");
    if (t === undefined) continue;
    const ours = type === "first-shots" ? firstAnnotated : type === "last-shots" ? lastVolley : undefined;
    if (!ours || ours.median === null) continue;
    const minute = val(e, "precision") === "minute";
    const inside = minute ? ours.median >= t && ours.median < t + 60 : ours.median === t;
    out.push({
      id: `official-${type}`,
      check: type === "first-shots" ? "First shots" : "Last shots (start of the last volley)",
      against: "official",
      theirs: minute ? `About ${minuteText(t)}` : clockText(t),
      ours: clockText(ours.median),
      result: inside ? (minute ? "within-precision" : "match") : "differs",
      fromSummary: true,
      entityId: e.sharedId,
    });
  }
  return out;
}
