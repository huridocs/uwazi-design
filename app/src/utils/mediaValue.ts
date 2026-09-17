/** An Uwazi `media` property value, read.
 *
 *  Uwazi stores it as a URL, optionally followed by a comma and a JSON config:
 *  `https://youtu.be/ID, {"timelinks": {"00:00:58": "apertura", …}}`. The
 *  timelinks are a video's chapters — a timestamp and what happens there.
 *
 *  The JSON is not always JSON. In the CEJIL corpus 18 of 762 values fail
 *  `JSON.parse` (a typographic quote closing a label, a truncated blob), so a
 *  failed parse falls back to lifting the `"HH:MM:SS": "label"` pairs out one
 *  by one. A value with no URL at all reads as nothing.
 *
 *  One URL in the corpus lost its first letter (`ttps://youtu.be/…`, "Masacre de
 *  Santo Domingo. Audiencia de 27 de junio de 2012"); that exact slip is
 *  repaired, since the card already tells the reader the video exists. */

export interface MediaChapter {
  /** As written: `00:05:24`. */
  time: string;
  seconds: number;
  label: string;
}

export interface MediaValue {
  url: string;
  /** What the URL points at, as far as the address says. */
  kind: "video" | "audio" | "unknown";
  /** Where the provider is known, a name for the link ("YouTube"). */
  provider?: string;
  chapters: MediaChapter[];
}

const TIME = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function toSeconds(time: string): number | null {
  const m = TIME.exec(time.trim());
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), m[3] === undefined ? null : Number(m[3])];
  return c === null ? a * 60 + b : a * 3600 + b * 60 + c;
}

function chaptersFrom(record: Record<string, unknown>): MediaChapter[] {
  const out: MediaChapter[] = [];
  for (const [time, label] of Object.entries(record)) {
    const seconds = toSeconds(time);
    if (seconds === null || typeof label !== "string" || !label.trim()) continue;
    out.push({ time: time.trim(), seconds, label: label.trim() });
  }
  return out.sort((a, b) => a.seconds - b.seconds);
}

/** `"00:00:58": "apertura"` pairs, tolerant of typographic quotes. */
const PAIR = /["“”]\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*["“”]\s*:\s*["“”]([^"“”]*)["“”]?/g;

function parseConfig(json: string): MediaChapter[] {
  try {
    const parsed = JSON.parse(json) as { timelinks?: unknown };
    if (parsed && typeof parsed.timelinks === "object" && parsed.timelinks) {
      return chaptersFrom(parsed.timelinks as Record<string, unknown>);
    }
    return [];
  } catch {
    const record: Record<string, string> = {};
    for (const m of json.matchAll(PAIR)) record[m[1]] = m[2];
    return chaptersFrom(record);
  }
}

const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg|oga|opus|flac)(?:[?#]|$)/i;
const VIDEO_EXT = /\.(mp4|m4v|webm|mov|ogv)(?:[?#]|$)/i;

function classify(url: URL): Pick<MediaValue, "kind" | "provider"> {
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be" || host.endsWith("youtube.com")) return { kind: "video", provider: "YouTube" };
  if (host.endsWith("vimeo.com")) return { kind: "video", provider: "Vimeo" };
  if (host.endsWith("soundcloud.com")) return { kind: "audio", provider: "SoundCloud" };
  if (AUDIO_EXT.test(url.pathname)) return { kind: "audio" };
  if (VIDEO_EXT.test(url.pathname)) return { kind: "video" };
  return { kind: "unknown" };
}

export function parseMediaValue(raw: unknown): MediaValue | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const brace = s.indexOf("{");
  const head = (brace >= 0 ? s.slice(0, brace) : s)
    .replace(/,\s*$/, "")
    .trim()
    .replace(/^ttps?:\/\//, (m) => `h${m}`);
  let url: URL;
  try {
    url = new URL(head);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  return {
    url: url.href,
    ...classify(url),
    chapters: brace >= 0 ? parseConfig(s.slice(brace)) : [],
  };
}

/** The URL that starts playback at `seconds`. */
export function mediaUrlAt(media: MediaValue, seconds: number): string {
  const url = new URL(media.url);
  if (media.provider === "YouTube") {
    url.searchParams.set("t", `${seconds}s`);
    return url.href;
  }
  if (media.provider === "Vimeo") {
    url.hash = `t=${seconds}s`;
    return url.href;
  }
  // A plain media file: the W3C media-fragment form.
  url.hash = `t=${seconds}`;
  return url.href;
}
