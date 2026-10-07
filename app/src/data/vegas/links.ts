// Where a Vegas record can be watched, listened to or read: a recording's
// link (a 911 call's archive.org audio file when it has one, else its
// address in the YouTube compilation), the same link at a time inside it, and
// a Source's web page. Links only: nothing is stored here.
import { formatAtPrecision } from "../../utils/dateFormat";
import { mediaUrlAt, parseMediaValue } from "../../utils/mediaValue";
import type { SourceLink } from "../nepal/sourceLink";
import { vegasEntity } from "./load";
import type { VegasEntity } from "./types";

const linkUrl = (v: unknown) =>
  v && typeof v === "object" && typeof (v as { url?: unknown }).url === "string" ? (v as { url: string }).url : undefined;

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/** A recording's address: the audio file a 911 call links to on the
 *  Internet Archive, else its embedded media's address. */
export function vegasRecordingUrl(e: VegasEntity): string | undefined {
  const audio = linkUrl(e.metadata.audio_url?.[0]?.value);
  if (audio) return audio;
  const embed = e.metadata.embed?.[0]?.value;
  return typeof embed === "string" ? embed : undefined;
}

/** The recording's YouTube address at `seconds` into it, or undefined where
 *  the host cannot be opened at a time (Facebook, Twitter, the archive.org
 *  files, a news site). A compilation's own `t` is replaced. */
export function vegasLinkAt(recordingId: string, seconds: number): string | undefined {
  const media = parseMediaValue(vegasEntity(recordingId)?.metadata.embed?.[0]?.value);
  if (!media || media.provider !== "YouTube") return undefined;
  return mediaUrlAt(media, Math.max(0, Math.floor(seconds)));
}

/** "1:17:23", "4:03", "0:04": an offset into a recording (as
 *  `MediaFieldValue`'s chapter clock prints it). */
export function formatOffset(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "22:09:48": a wall-clock time stored as epoch seconds. */
export function formatClock(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(11, 19);
}

/** The page a Source record points at, or undefined for any other record.
 *  The entity view shows it where a document would be (`NoDocumentPane`). */
export function vegasSourceLink(id: string): SourceLink | undefined {
  const e = vegasEntity(id);
  if (!e || e.template !== "vegas_source") return undefined;
  const url = linkUrl(e.metadata.url?.[0]?.value);
  if (!url) return undefined;
  const publisher = e.metadata.publisher?.[0]?.value;
  const published = e.metadata.published?.[0]?.value;
  const accessed = e.metadata.accessed?.[0]?.value;
  const precision = e.datePrecision === "month" || e.datePrecision === "year" ? e.datePrecision : "day";
  const dateLine =
    typeof published === "number"
      ? `Published ${formatAtPrecision(new Date(published * 1000), precision)}`
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
