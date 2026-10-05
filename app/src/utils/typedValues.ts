import type { MetadataField } from "../data/metadata";
import { formatPlace } from "./geoFormat";
import { fromDateInputValue } from "./dateValue";

/** Patches for the typed values a display string cannot hold (step M4,
 *  template-schema-spec.md §2.1). An editor writes its typed value through one
 *  of these, which also recomputes `value` (what search, cards and text-only
 *  readers print) and, for a list, `displayValues` (what the record lists).
 *  Dates are written as the record writes them (dd/mm/yyyy, or the source's own
 *  shape: `fromDateInputValue`). */

const DOT = " · ";

export const rangeText = (r: { from: string; to: string }) =>
  r.from && r.to ? `${r.from} – ${r.to}` : r.from ? `${r.from} –` : r.to ? `– ${r.to}` : "";

export function withDates(dates: string[]): Partial<MetadataField> {
  const clean = dates.filter((d) => d.trim());
  return { dates, displayValues: clean, value: clean.join(DOT) };
}

export function withRanges(ranges: { from: string; to: string }[], multi: boolean): Partial<MetadataField> {
  const shown = ranges.map(rangeText).filter(Boolean);
  return { ranges, value: shown.join(DOT), ...(multi ? { displayValues: shown } : {}) };
}

export function withLink(link: { label: string; url: string }): Partial<MetadataField> {
  return { link, value: link.url };
}

export function withGeo(geo: { lat: number; lon: number; label?: string } | undefined): Partial<MetadataField> {
  if (!geo) return { geo: undefined, value: "" };
  return { geo, value: formatPlace({ lat: geo.lat, lng: geo.lon }, geo.label || undefined) };
}

/** A value the record can draw as a picture: a URL, not a corpus's own token
 *  (Travesía's `portrait:…`, which its record's image card draws). */
export const isImageUrl = (v: string | undefined) => !!v && /^(https?:|\/|data:image\/|blob:)/.test(v.trim());

/** Whether focusing the editor arms click-to-fill (CLAUDE.md › Metadata view):
 *  a typed value from a passage of text fits text, numbers, links and ids;
 *  dates, ranges, places and pictures do not. */
export function armsOnFocus(f: Pick<MetadataField, "type" | "propertyType">): boolean {
  switch (f.propertyType) {
    case "date":
    case "multidate":
    case "daterange":
    case "multidaterange":
    case "geolocation":
    case "image":
    case "media":
    case "select":
    case "multiselect":
      return false;
    default:
      return f.type !== "date" && f.type !== "media";
  }
}

/** A date input's yyyy-mm-dd as a list or range writes it: in the shape of the
 *  value it replaces, and dd/mm/yyyy (the record's form) for a new one, so a
 *  list never mixes shapes. */
export function listDate(iso: string, previous: string): string {
  if (previous.trim()) return fromDateInputValue(iso, previous);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
