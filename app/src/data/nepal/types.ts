// "Nepal protests 2024–2026": a REAL open-source corpus (Research's OSINT seed,
// dev/results/nepal-seed). Every fact comes from a public source and carries a
// verification status. Shapes are what scripts/build-nepal-corpus.mjs writes:
// records in Uwazi's metadata shape, references with the source's quote.

/** A metadata value as Uwazi stores it: `value`, and `label` for a thesaurus
 *  or relationship value. Dates are epoch seconds. */
export interface NepalMetaValue {
  value: unknown;
  label?: string;
}

export interface NepalEntity {
  sharedId: string;
  template: string;
  title: string;
  /** The record's own date (an event's start, a source's publication), epoch
   *  seconds. Absent for people, organisations and places. */
  date?: number;
  /** Set when `date` is known only to the month or the year (a value written
   *  "2024-03", or an event whose Time precision says month). Absent: a day. */
  datePrecision?: "month" | "year";
  metadata: Record<string, NepalMetaValue[]>;
}

/** How well a fact is sourced: two independent publishers, one, or sources
 *  that conflict. */
export type Verification = "confirmed" | "single-source" | "disputed";

export interface NepalReference {
  id: string;
  from: string;
  to: string;
  /** The relationship type's registry id. */
  type: string;
  verification: Verification;
  /** A verbatim excerpt of the source (`from`), at most 25 words. */
  quote?: string;
  /** Office tenure and membership: epoch seconds, either end open. */
  date?: { from: number | null; to: number | null };
}

export interface NepalThesaurus {
  _id: string;
  name: string;
  values: { id: string; label: string }[];
}

export interface NepalRelationType {
  _id: string;
  name: string;
}
