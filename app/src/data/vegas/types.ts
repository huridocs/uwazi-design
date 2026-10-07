// "Las Vegas, 1 October 2017": a REAL open-source corpus (Research's OSINT
// seed, dev/results/vegas-seed) built on the VegasShootingMap.com annotations
// and the official and press sources around them. Recordings are links only.
// Shapes are what scripts/build-vegas-corpus.mjs writes: records in Uwazi's
// metadata shape, references with their media anchors.
import type { Verification } from "../references";

export type { Verification };

/** A metadata value as Uwazi stores it: `value`, and `label` for a thesaurus
 *  or relationship value. Dates are epoch seconds of the Las Vegas wall clock. */
export interface VegasMetaValue {
  value: unknown;
  label?: string;
}

/** A camera path or a venue footprint, as [lat, lng] pairs (a polygon's outer
 *  ring). The record's own text property holds the GeoJSON as given. */
export interface VegasShape {
  kind: "line" | "polygon";
  points: [number, number][];
}

export interface VegasEntity {
  sharedId: string;
  template: string;
  title: string;
  /** The record's own time (a recording's or a moment's start, a finding's
   *  clock time, a claim's as-of day, a source's publication), epoch seconds.
   *  Absent for places and organisations. */
  date?: number;
  /** Set when `date` is known to the second or the minute, or only to the
   *  month or year. Absent: a day. */
  datePrecision?: "second" | "minute" | "month" | "year";
  shape?: VegasShape;
  metadata: Record<string, VegasMetaValue[]>;
}

/** Where a reference sits inside a recording: the media equivalent of a text
 *  anchor. `captures` (a recording's moment) and `derived_from` (a call
 *  segment in its compilation) carry one. */
export interface VegasMediaAnchor {
  /** The recording the offset is in. */
  recording: string;
  /** Seconds from the recording's start. */
  offset: number;
  end?: number;
  /** The wall-clock time the map annotates there, epoch seconds. */
  clock?: number;
  /** The map's annotation ("10th Volley Begins"). */
  label?: string;
  /** How the map qualifies it ("1 sec. in"). */
  qualifier?: string;
}

export interface VegasReference {
  id: string;
  from: string;
  to: string;
  /** The relationship type's registry id. */
  type: string;
  verification: Verification;
  media?: VegasMediaAnchor;
  /** `followed_by`: seconds between the two moments' starts. */
  interval?: number;
  date?: { from: number | null; to: number | null };
}

export interface VegasThesaurus {
  _id: string;
  name: string;
  values: { id: string; label: string }[];
}

export interface VegasRelationType {
  _id: string;
  name: string;
}
