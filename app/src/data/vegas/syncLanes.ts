// The Sync view's model: every Vegas recording as a lane on the collection's
// one wall clock, the moments it was synced against, and where each of its
// anchors falls against the moment's consensus time. Built once from the
// loaded corpus (load.ts); callers gate on `vegasLoaded()`.
//
// Nothing here is invented. A lane starts at its `clock_start`; it is known to
// run to its `clock_end` where one is recorded, else to its last anchor. The
// data holds no durations, so past that point the view draws a faded tail,
// never a length. Recordings without a clock time to the second or the minute
// (every 911 call, the compilations, a few undated ones) are lanes with no
// bar.
import { vegasCorpus, vegasEntity } from "./load";
import { vegasLinkAt, vegasRecordingUrl } from "./links";
import type { Verification } from "./types";

/** 2017-10-01, Las Vegas wall clock as the corpus stores it (epoch seconds
 *  read as UTC). The Sync view's default window holds the shooting, first
 *  shots to the last single gunshot, with about half a minute either side. */
const at = (h: number, m: number, s: number) => Date.UTC(2017, 9, 1, h, m, s) / 1000;
export const SYNC_DEFAULT_WINDOW = { from: at(22, 4, 30), to: at(22, 16, 30) };

/** The Sync view's lane groups, in the order the brief reads them. A 911
 *  compilation sits with the calls it holds. */
export const SYNC_KINDS = [
  { id: "phone", label: "Phone video", kinds: ["phone-video"] },
  { id: "body", label: "Body camera", kinds: ["body-camera"] },
  { id: "vehicle", label: "Video from a vehicle", kinds: ["vehicle-video"] },
  { id: "cctv", label: "Surveillance camera", kinds: ["cctv"] },
  { id: "aerial", label: "Aerial", kinds: ["aerial"] },
  { id: "call", label: "911 call", kinds: ["911-call", "911-compilation"] },
] as const;
export type SyncKindId = (typeof SYNC_KINDS)[number]["id"];

const KIND_OF = new Map<string, SyncKindId>(SYNC_KINDS.flatMap((g) => g.kinds.map((k) => [k, g.id] as const)));

/** An anchor further than this from its moment's consensus time is drawn as
 *  an outlier (the seed's sync check uses the same 2 s). */
export const OUTLIER_SECONDS = 2;

export interface SyncAnchor {
  refId: string;
  momentId: string;
  /** The moment as the map names it ("Volley 5"). */
  moment: string;
  /** The map's annotation at this point ("5th Volley Begins (1 sec. in)"). */
  label?: string;
  /** Seconds into the recording. */
  offset: number;
  /** Where the lane's clock puts it: start + offset, epoch seconds. */
  at: number;
  verification: Verification;
  /** `at` minus the moment's consensus time, where the moment is timed to
   *  the second. */
  residual?: number;
  outlier: boolean;
}

export interface SyncLane {
  id: string;
  /** The map's label, without the title's clock suffix. */
  name: string;
  group: SyncKindId;
  /** The recording kind's own label ("Video from a vehicle", "911 call"). */
  kindLabel: string;
  /** Clock start, epoch seconds; absent where the recording has no clock
   *  time to the second or the minute. */
  start?: number;
  precision?: "second" | "minute";
  /** The last instant the data shows the recording running: `clock_end`, else
   *  the last anchor, else the start. */
  knownEnd?: number;
  endBasis?: "clock-end" | "last-anchor" | "start";
  /** Where the title alone would start it, when that differs from `start`. */
  titleStart?: number;
  anchors: SyncAnchor[];
  confidence?: { value: string; label: string };
  flags: { value: string; label: string }[];
  /** `sync_offset_seconds`: seconds after 22:00:00 the recording starts. */
  syncOffset?: number;
  callCategory?: string;
  warning: "graphic" | "distressing";
}

export interface SyncMoment {
  id: string;
  type: string;
  label: string;
  /** Consensus time, epoch seconds. */
  at: number;
  /** Volleys: 1–12. */
  number?: number;
  /** A volley's band: from the earliest to the latest anchor within
   *  `OUTLIER_SECONDS` of the consensus, at least one second wide. */
  bandFrom: number;
  bandTo: number;
  /** Anchors that place it (every recording, outliers included). */
  anchorCount: number;
  spread?: number;
}

export interface SyncModel {
  lanes: SyncLane[];
  laneById: Map<string, SyncLane>;
  /** The 12 volleys, in order. */
  volleys: SyncMoment[];
  /** First shots, single gunshots and the corridor shots: thin ticks. */
  ticks: SyncMoment[];
  /** Earliest start to latest known end over the clocked lanes. */
  extent: { from: number; to: number };
}

/** The moment types drawn as ticks across every lane. */
const TICK_TYPES = new Set(["first-shots", "single-shot", "corridor-shots"]);

const first = (e: { metadata: Record<string, { value: unknown; label?: string }[]> }, k: string) => e.metadata[k]?.[0];
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

/** "From a car along Mandalay Bay Road · 22:09:44" → the label before the clock. */
const nameOf = (title: string, mapLabel: unknown) =>
  typeof mapLabel === "string" && mapLabel.trim() ? mapLabel.trim() : title.replace(/ · \d{1,2}:\d{2}(:\d{2})?$/, "");

let cached: SyncModel | null = null;

export function vegasSyncModel(): SyncModel | null {
  if (cached) return cached;
  const corpus = vegasCorpus();
  if (!corpus) return null;

  // Moments timed to the second; minute-precision ones (the LVMPD summary's
  // "22:05") would draw a false instant.
  const moments = new Map<string, SyncMoment>();
  for (const e of corpus.entities) {
    if (e.template !== "vegas_moment" || e.date === undefined || e.datePrecision !== "second") continue;
    const type = first(e, "moment_type")?.value as string;
    const label = (first(e, "label")?.value as string) ?? e.title;
    const n = type === "volley" ? Number(/(\d+)$/.exec(label)?.[1]) : undefined;
    moments.set(e.sharedId, {
      id: e.sharedId,
      type,
      label,
      at: e.date,
      ...(n ? { number: n } : {}),
      bandFrom: e.date,
      bandTo: e.date + 1,
      anchorCount: 0,
      spread: num(first(e, "spread_seconds")?.value),
    });
  }

  const lanes: SyncLane[] = [];
  const anchorsByRec = new Map<string, typeof corpus.references>();
  for (const r of corpus.references) {
    if (r.type !== "captures" || !r.media) continue;
    const arr = anchorsByRec.get(r.media.recording);
    if (arr) arr.push(r);
    else anchorsByRec.set(r.media.recording, [r]);
  }

  for (const e of corpus.entities) {
    if (e.template !== "vegas_recording") continue;
    const kind = first(e, "media_kind");
    const group = KIND_OF.get(kind?.value as string);
    if (!group) continue;
    const p = first(e, "clock_precision")?.value;
    const precision = p === "second" || p === "minute" ? p : undefined;
    const start = precision ? num(first(e, "clock_start")?.value) : undefined;
    const anchors: SyncAnchor[] =
      start === undefined
        ? []
        : (anchorsByRec.get(e.sharedId) ?? [])
            .map((r) => {
              const m = moments.get(r.to);
              const at = start + r.media!.offset;
              const residual = m ? at - m.at : undefined;
              return {
                refId: r.id,
                momentId: r.to,
                moment: m?.label ?? vegasEntity(r.to)?.title ?? r.to,
                ...(r.media!.label ? { label: r.media!.label } : {}),
                offset: r.media!.offset,
                at,
                verification: r.verification,
                ...(residual !== undefined ? { residual } : {}),
                outlier: residual !== undefined && Math.abs(residual) > OUTLIER_SECONDS,
              };
            })
            .sort((a, b) => a.offset - b.offset);
    const end = num(first(e, "clock_end")?.value);
    const lastAnchor = anchors.length ? anchors[anchors.length - 1].at : undefined;
    const knownEnd = start === undefined ? undefined : end !== undefined && end > start ? end : (lastAnchor ?? start);
    const titleStart = num(first(e, "clock_start_title")?.value);
    const conf = first(e, "sync_confidence");
    const w = first(e, "content_warning")?.value;
    lanes.push({
      id: e.sharedId,
      name: nameOf(e.title, first(e, "map_label")?.value),
      group,
      kindLabel: kind?.label ?? group,
      ...(start !== undefined
        ? {
            start,
            precision,
            knownEnd,
            endBasis: end !== undefined && end > start ? "clock-end" : lastAnchor !== undefined ? "last-anchor" : "start",
          }
        : {}),
      ...(start !== undefined && titleStart !== undefined && titleStart !== start ? { titleStart } : {}),
      anchors,
      ...(conf?.label ? { confidence: { value: conf.value as string, label: conf.label } } : {}),
      flags: (e.metadata.sync_flags ?? []).map((f) => ({ value: f.value as string, label: f.label ?? String(f.value) })),
      ...(num(first(e, "sync_offset_seconds")?.value) !== undefined ? { syncOffset: num(first(e, "sync_offset_seconds")?.value) } : {}),
      ...(first(e, "call_category")?.label ? { callCategory: first(e, "call_category")!.label } : {}),
      // The build refuses a recording without one; distressing is the milder.
      warning: w === "graphic" ? "graphic" : "distressing",
    });
  }

  // Each moment's band and anchor count, from the lanes that place it.
  const inliers = new Map<string, number[]>();
  for (const l of lanes)
    for (const a of l.anchors) {
      const m = moments.get(a.momentId);
      if (!m) continue;
      m.anchorCount++;
      if (!a.outlier) {
        const arr = inliers.get(m.id);
        if (arr) arr.push(a.at);
        else inliers.set(m.id, [a.at]);
      }
    }
  for (const m of moments.values()) {
    const xs = inliers.get(m.id);
    if (!xs?.length) continue;
    m.bandFrom = Math.min(m.at, ...xs);
    m.bandTo = Math.max(m.at + 1, ...xs.map((x) => x + 1));
  }

  const clocked = lanes.filter((l) => l.start !== undefined);
  const extent = clocked.length
    ? { from: Math.min(...clocked.map((l) => l.start!)), to: Math.max(...clocked.map((l) => l.knownEnd!)) }
    : { from: 0, to: 0 };
  const all = [...moments.values()].sort((a, b) => a.at - b.at);
  cached = {
    lanes,
    laneById: new Map(lanes.map((l) => [l.id, l])),
    volleys: all.filter((m) => m.type === "volley"),
    ticks: all.filter((m) => TICK_TYPES.has(m.type)),
    extent,
  };
  return cached;
}

/** Does the loaded collection hold recordings placed on its clock and synced
 *  by anchors? (The Sync view is offered only then.) */
export const vegasHasSync = (): boolean =>
  !!vegasSyncModel()?.lanes.some((l) => l.start !== undefined && l.anchors.length > 0);

export interface SyncLink {
  url: string;
  /** The link opens at the offset (YouTube). Otherwise it opens at the
   *  start and the reader seeks by hand. */
  seeks: boolean;
}

/** Where to open `lane` at `offset` seconds in: the YouTube address at that
 *  time, else the recording's own link (a 911 call's archive.org audio). */
export function syncLinkAt(lane: SyncLane, offset: number): SyncLink | undefined {
  const at = vegasLinkAt(lane.id, offset);
  if (at) return { url: at, seeks: true };
  const e = vegasEntity(lane.id);
  const url = e ? vegasRecordingUrl(e) : undefined;
  return url ? { url, seeks: false } : undefined;
}
