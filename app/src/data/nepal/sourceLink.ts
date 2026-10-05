// A Nepal Source is a web page, not a file: the entity view shows its link
// where a document would be (`NoDocumentPane`).
import { formatAtPrecision } from "../../utils/dateFormat";
import { nepalEntity } from "./load";

export interface SourceLink {
  url: string;
  /** The URL's host, without "www.". */
  host: string;
  publisher?: string;
  /** "Published 2025/07/29", or "Accessed 2026/10/05" for a page with no
   *  publication date (the day Research read it). */
  dateLine?: string;
}

const linkUrl = (v: unknown) =>
  v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string" ? (v as { url: string }).url : undefined;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** The link a Nepal Source record points at, or undefined for any other
 *  record. */
export function nepalSourceLink(id: string): SourceLink | undefined {
  const e = nepalEntity(id);
  if (!e || e.template !== "nepal_source") return undefined;
  const url = linkUrl(e.metadata.url?.[0]?.value);
  if (!url) return undefined;
  const publisher = e.metadata.publisher?.[0]?.value;
  const published = e.metadata.published?.[0]?.value;
  const accessed = e.metadata.accessed?.[0]?.value;
  const dateLine =
    typeof published === "number"
      ? `Published ${formatAtPrecision(new Date(published * 1000), e.datePrecision ?? "day")}`
      : typeof accessed === "number"
        ? `Accessed ${formatAtPrecision(new Date(accessed * 1000), "day")}`
        : undefined;
  return {
    url,
    host: hostOf(url),
    ...(typeof publisher === "string" ? { publisher } : {}),
    ...(dateLine ? { dateLine } : {}),
  };
}
