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
  /** A media item's bundled picture: its public path and pixel size, so the
   *  record reserves the box before it loads. */
  image?: { url: string; width: number; height: number };
  /** The bundled documents attached to the record (`NepalDoc.id`), primary
   *  first. A source and the official action it records share one. */
  docs?: string[];
  metadata: Record<string, NepalMetaValue[]>;
}

/** A bundled PDF: a Government of Nepal publication, copied unaltered to
 *  public/nepal-data/docs/<id>.pdf, with where it came from and its text. */
export interface NepalDoc {
  id: string;
  title: string;
  /** ISO 639-1: "ne" for 22 of 23, "en" for one. */
  language: string;
  pages: number;
  bytes: number;
  /** The issuing office. */
  publisher: string;
  /** Epoch seconds. */
  published?: number;
  /** The PDF's own address on the issuer's server. */
  sourceUrl: string;
  /** The page that lists it, when there is one. */
  sourcePage?: string;
  retrieved: number;
  /** "Government of Nepal official publication; no explicit open licence stated". */
  licenceBasis: string;
  /** Every page was machine-read (Tesseract, Nepali and English) and nobody
   *  has checked it against the scan. */
  textSource: "ocr";
  textQuality: "unreviewed";
  /** One string per page, page 1 first. */
  text: string[];
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
  /** Where the quote sits when it was located in a bundled PDF: the document
   *  (`NepalDoc.id`) and its 1-based page. */
  file?: string;
  page?: number;
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
