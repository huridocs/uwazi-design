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

/** A chapter timecode in seconds: `HH:MM:SS` or `MM:SS` (the corpus mixes both,
 *  hours may be one digit). `null` for anything else, including a minute or
 *  second field of 60 or more. THE one conversion — reading, the player's seek
 *  and the editor's validation all go through it. */
export function timecodeToSeconds(time: string): number | null {
  const m = TIME.exec(time.trim());
  if (!m) return null;
  const [a, b, c] = [Number(m[1]), Number(m[2]), m[3] === undefined ? null : Number(m[3])];
  if (c === null) return b < 60 ? a * 60 + b : null;
  return b < 60 && c < 60 ? a * 3600 + b * 60 + c : null;
}
const toSeconds = timecodeToSeconds;

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

/** A stored value in its two halves, exactly as written: the address before the
 *  config (no repair — the editor shows what is stored) and the config text
 *  from its first `{`, or `null` when there is none. */
export function splitMediaValue(raw: string): { head: string; config: string | null } {
  const s = raw.trim();
  const brace = s.indexOf("{");
  return {
    head: (brace >= 0 ? s.slice(0, brace) : s).replace(/,\s*$/, "").trim(),
    config: brace >= 0 ? s.slice(brace) : null,
  };
}

/** Whether the stored config is real JSON. `null` when there is no config. The
 *  18 that aren't still READ (pair extraction), but an editor has to be able to
 *  say that saving an edit will rewrite them. */
export function mediaConfigIsJson(raw: string): boolean | null {
  const { config } = splitMediaValue(raw);
  if (config === null) return null;
  try {
    JSON.parse(config);
    return true;
  } catch {
    return false;
  }
}

/** A chapter as the EDITOR holds it: the stored strings, untouched. */
export interface ChapterRow {
  time: string;
  label: string;
}

/** The chapters of a stored value, for editing: in STORED order with the stored
 *  strings (spaces inside labels included), not the read path's trimmed and
 *  time-sorted list — so an edit to one chapter rewrites as little of the rest
 *  as the format allows. A config that isn't JSON falls back to the same pair
 *  extraction the reader uses. */
export function chapterRows(raw: string): ChapterRow[] {
  const { config } = splitMediaValue(raw);
  if (config === null) return [];
  try {
    const parsed = JSON.parse(config) as { timelinks?: unknown };
    const links = parsed && typeof parsed.timelinks === "object" ? parsed.timelinks : null;
    if (!links) return [];
    return Object.entries(links as Record<string, unknown>).map(([time, label]) => ({
      time,
      label: typeof label === "string" ? label : String(label ?? ""),
    }));
  } catch {
    return [...config.matchAll(PAIR)].map((m) => ({ time: m[1], label: m[2] }));
  }
}

/** The inverse of `parseMediaValue`, in Uwazi's own shape:
 *  `URL, {"timelinks": {"00:00:58": "apertura", …}}` — `, ` after the URL and
 *  after each pair, `: ` inside it, labels as JSON strings with non-ASCII kept
 *  literal, strings written exactly as given. No chapters → the URL alone. Only
 *  ever called on an EDIT: an untouched value is never re-written. */
export function serializeMediaValue(url: string, chapters: ChapterRow[]): string {
  const address = url.trim();
  if (chapters.length === 0) return address;
  const pairs = chapters.map((c) => `${JSON.stringify(c.time)}: ${JSON.stringify(c.label)}`).join(", ");
  return `${address}, {"timelinks": {${pairs}}}`;
}

export function parseMediaValue(raw: unknown): MediaValue | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s) return null;
  const brace = s.indexOf("{");
  const head = splitMediaValue(s).head.replace(/^ttps?:\/\//, (m) => `h${m}`);
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

/** The YouTube video id, when the URL is a YouTube video — `youtu.be/ID`,
 *  `youtube.com/watch?v=ID`, `/embed/ID`, `/shorts/ID`, `/live/ID`. Ids are
 *  11 characters of `[A-Za-z0-9_-]`; anything else is not embeddable. */
export function youtubeId(media: MediaValue): string | null {
  if (media.provider !== "YouTube") return null;
  const url = new URL(media.url);
  const host = url.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
  else if (url.pathname === "/watch") id = url.searchParams.get("v");
  else {
    const m = /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(url.pathname);
    id = m ? m[1] : null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
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
