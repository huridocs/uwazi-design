import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, CirclePlay, Clapperboard, ExternalLink, Play } from "lucide-react";
import { mediaUrlAt, parseMediaValue, youtubeId, type MediaChapter, type MediaValue } from "../../utils/mediaValue";

/** A `media` property in the record.
 *
 *  A YouTube video plays IN the record, and its chapters (Uwazi's `timelinks`)
 *  seek it. Anything else — another host, an audio file, an address we cannot
 *  read — keeps the plain link and `?t=` chapter links, never a broken embed.
 *
 *  The card mark says a recording exists; this is where the reader watches it. */
export function MediaFieldValue({ raw }: { raw: string }) {
  const media = parseMediaValue(raw);
  if (!media) {
    // Not a URL we can open. Say what the record holds rather than hiding it.
    return <p className="text-sm text-ink-secondary leading-relaxed break-words">{raw}</p>;
  }
  const id = youtubeId(media);
  return id ? <YouTubeMedia media={media} id={id} /> : <LinkedMedia media={media} />;
}

const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

function watchName(media: MediaValue): string {
  const verb = media.kind === "audio" ? "Listen" : media.kind === "video" ? "Watch" : "Open";
  return media.provider ? `${verb} on ${media.provider}` : `${verb} recording`;
}

function WatchLink({ media }: { media: MediaValue }) {
  // The same three glyphs the Library card marks with, so the mark and the
  // record agree about what kind of recording this is.
  const Icon = media.kind === "video" ? Clapperboard : media.kind === "audio" ? AudioLines : CirclePlay;
  return (
    <a
      data-part="open"
      href={media.url}
      target="_blank"
      rel="noopener noreferrer"
      title={media.url}
      className="inline-flex w-fit shrink-0 items-center gap-1.5 text-xs font-medium text-ink-secondary
        hover:text-ink hover:underline underline-offset-2 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <Icon size={13} aria-hidden className="text-ink-tertiary shrink-0" />
      {watchName(media)}
      <ExternalLink size={10} aria-hidden className="text-ink-tertiary shrink-0" />
    </a>
  );
}

/** The line between the recording and its chapters: what the list below is, on
 *  the left, and the way out to the provider on the right. One line, so the
 *  link stops sitting between the player and the chapters that control it. */
function MetaRow({ media }: { media: MediaValue }) {
  const n = media.chapters.length;
  return (
    <div data-part="meta" className="flex items-baseline justify-between gap-3 min-w-0">
      <span className="text-meta font-semibold uppercase tracking-wide text-ink-tertiary">
        {n > 0 ? `${n} ${n === 1 ? "chapter" : "chapters"}` : (media.provider ?? "Recording")}
      </span>
      <WatchLink media={media} />
    </div>
  );
}

/** A chapter start as a player writes it: `0:58`, `5:24`, `1:02:12`. The corpus
 *  stores `00:00:58` and `05:24` side by side; the list reads them as one
 *  column, right-aligned in tabular figures so the colons line up. */
function clock(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** A chapter row. The first track is RESERVED for the now-playing mark, so the
 *  mark coming and going never moves the time or the title. Hover is the warm
 *  wash; the chapter the player is in takes the app's selected ground. */
const CHAPTER_ROW =
  "grid w-full grid-cols-[0.75rem_3.75rem_minmax(0,1fr)] items-baseline gap-x-2 rounded px-2 py-1.5 text-start " +
  "transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40";

function ChapterText({ chapter, current = false }: { chapter: MediaChapter; current?: boolean }) {
  return (
    <>
      <span aria-hidden className="self-center flex items-center justify-center">
        {current && <Play size={9} className="text-ink" fill="currentColor" />}
      </span>
      <span dir="ltr" className={`text-end text-xs tabular-nums ${current ? "text-ink" : "text-ink-tertiary"}`}>
        {clock(chapter.seconds)}
      </span>
      <span className={`text-sm leading-snug ${current ? "text-ink font-medium" : "text-ink-secondary"}`}>
        {chapter.label}
      </span>
    </>
  );
}

/** The chapter list: one ruled sheet, a row per chapter. `framed={false}` when
 *  the caller draws the frame, so a scrolling list keeps its border still. */
function ChapterList({ children, framed = true }: { children: React.ReactNode; framed?: boolean }) {
  return (
    <ol
      data-part="chapters"
      aria-label="Chapters"
      className={`flex flex-col divide-y divide-border ${
        framed ? "rounded-md border border-border bg-paper overflow-hidden" : ""
      }`}
    >
      {children}
    </ol>
  );
}

/** Not embeddable: the recording as a link, chapters as links that start there. */
function LinkedMedia({ media }: { media: MediaValue }) {
  return (
    <div data-component="MediaFieldValue" data-kind={media.kind} className="flex flex-col gap-2 min-w-0">
      <MetaRow media={media} />
      {media.chapters.length > 0 && (
        <ChapterList>
          {media.chapters.map((c) => (
            <li key={`${c.seconds}-${c.label}`}>
              <a
                data-part="chapter"
                href={mediaUrlAt(media, c.seconds)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${clock(c.seconds)}, ${c.label}`}
                className={`${CHAPTER_ROW} hover:bg-warm`}
              >
                <ChapterText chapter={c} />
              </a>
            </li>
          ))}
        </ChapterList>
      )}
    </div>
  );
}

/** How long a loaded player may stay silent before we stop waiting for its API
 *  and fall back to reloading the embed at a start time. */
const HANDSHAKE_MS = 4000;
/** How long a posted `seekTo` has to show up in the player's reported time
 *  before we stop trusting it and reload the embed at that start instead. */
const SEEK_CONFIRM_MS = 2500;
/** Close enough to call a seek landed (a playing video moves on meanwhile). */
const SEEK_TOLERANCE_S = 3;

/** A YouTube video played in place.
 *
 *  FACADE FIRST. Until the reader presses play (or a chapter) this is a drawn
 *  poster and a button — no iframe, no image from YouTube's servers: opening a
 *  hearing's record makes no request to Google. The poster is local on purpose;
 *  YouTube's thumbnails live on `i.ytimg.com`, and fetching one would be exactly
 *  the request the facade exists to avoid.
 *
 *  The embed is `youtube-nocookie.com` with `rel=0` and our `origin`. Chapters
 *  SEEK it: once the player has answered the `listening` handshake, a chapter
 *  posts `seekTo` + `playVideo` — no API script is loaded — and then waits for
 *  the player to REPORT a time near the chapter. A seek that is not confirmed
 *  within `SEEK_CONFIRM_MS` (the API blocked, a privacy extension, a player
 *  that stopped talking) is redone the one way that needs no API: reloading the
 *  embed at that start. Before the player exists, a chapter loads it starting
 *  at that timestamp. "Watch on YouTube" is always there as the way out.
 *
 *  THE BOX IS DEFINITE: `aspect-video` on the same element before and after the
 *  iframe arrives, so the record never shifts when the player loads. */
function YouTubeMedia({ media, id }: { media: MediaValue; id: string }) {
  /** `null` until the reader asks for the player; then the start it loaded at.
   *  `loadNonce` changes the iframe's key when a reload is the only way to seek. */
  const [start, setStart] = useState<number | null>(null);
  const [loadNonce, setLoadNonce] = useState(0);
  const [apiReady, setApiReady] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  /** A posted seek still waiting for the player to confirm it. */
  const pendingSeek = useRef<{ target: number; timer: number } | null>(null);
  const loaded = start !== null;
  /** Index of the chapter the player is in, from the time it reports — or the
   *  one just pressed, until it reports. `null` before anything has played. */
  const [current, setCurrent] = useState<number | null>(null);
  const chapterAt = useCallback(
    (t: number) => {
      let i = -1;
      for (let k = 0; k < media.chapters.length; k++) if (media.chapters[k].seconds <= t + 0.5) i = k;
      return i < 0 ? null : i;
    },
    [media.chapters],
  );

  const post = useCallback((message: object) => {
    frameRef.current?.contentWindow?.postMessage(JSON.stringify(message), EMBED_ORIGIN);
  }, []);

  // The player's own messages: the handshake reply, and the time it reports.
  useEffect(() => {
    if (!loaded) return;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== EMBED_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      let data: { event?: string; info?: { currentTime?: number } } | null = null;
      try {
        data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
      } catch {
        return;
      }
      if (!data?.event) return;
      setApiReady(true);
      const t = data.info?.currentTime;
      if (typeof t !== "number") return;
      // Read-only trace of where the player is.
      if (rootRef.current) rootRef.current.dataset.playerTime = String(Math.round(t));
      // The chapter changes a handful of times per recording; the same index is
      // a bail-out, so a steady stream of time reports does not re-render.
      const at = chapterAt(t);
      setCurrent((prev) => (prev === at ? prev : at));
      const pending = pendingSeek.current;
      if (pending && Math.abs(t - pending.target) <= SEEK_TOLERANCE_S) {
        window.clearTimeout(pending.timer);
        pendingSeek.current = null;
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [loaded, loadNonce, chapterAt]);

  const embedSrc = (from: number) => {
    const params = new URLSearchParams({
      rel: "0",
      autoplay: "1",
      start: String(from),
      enablejsapi: "1",
      origin: window.location.origin,
      playsinline: "1",
    });
    return `${EMBED_ORIGIN}/embed/${id}?${params}`;
  };

  const reloadAt = useCallback((seconds: number) => {
    setApiReady(false);
    setStart(seconds);
    setLoadNonce((n) => n + 1);
  }, []);

  const playFrom = (seconds: number) => {
    setCurrent(chapterAt(seconds));
    if (pendingSeek.current) {
      window.clearTimeout(pendingSeek.current.timer);
      pendingSeek.current = null;
    }
    if (!loaded) {
      setStart(seconds);
      return;
    }
    if (!apiReady) {
      // Loaded but the API never answered: the only seek left is a reload.
      reloadAt(seconds);
      return;
    }
    post({ event: "command", func: "seekTo", args: [seconds, true] });
    post({ event: "command", func: "playVideo", args: [] });
    const timer = window.setTimeout(() => {
      pendingSeek.current = null;
      reloadAt(seconds);
    }, SEEK_CONFIRM_MS);
    pendingSeek.current = { target: seconds, timer };
  };

  // A pending confirmation must not fire into an unmounted record.
  useEffect(
    () => () => {
      if (pendingSeek.current) window.clearTimeout(pendingSeek.current.timer);
    },
    [],
  );

  // Keep asking the player to talk until it does; give up quietly.
  useEffect(() => {
    if (!loaded || apiReady) return;
    const started = Date.now();
    const timer = window.setInterval(() => {
      post({ event: "listening", id, channel: "widget" });
      if (Date.now() - started > HANDSHAKE_MS) window.clearInterval(timer);
    }, 400);
    return () => window.clearInterval(timer);
  }, [loaded, apiReady, loadNonce, id, post]);

  const hasChapters = media.chapters.length > 0;

  return (
    <div
      ref={rootRef}
      data-component="MediaFieldValue"
      data-kind={media.kind}
      data-state={loaded ? "player" : "facade"}
      /* BESIDE, WHEN THERE IS ROOM. A chapter is a control for the player, so
         past 52rem of the record's own width the list sits next to the video,
         as tall as the video and scrolling inside that height, and a reader can
         press a chapter without the player leaving the screen. Below that the
         two stack. Measured on this container, not the viewport: the record is
         the same component in the main pane and in the drawer. */
      className="@container min-w-0"
    >
      <div className={`grid gap-3 min-w-0 ${hasChapters ? "@[52rem]:grid-cols-[minmax(0,3fr)_minmax(20rem,2fr)]" : ""}`}>
      <div className="flex flex-col gap-2 min-w-0">
      <div data-part="stage" className="relative w-full aspect-video overflow-hidden rounded-md border border-border bg-warm">
        {loaded ? (
          <iframe
            key={loadNonce}
            ref={frameRef}
            data-part="player"
            src={embedSrc(start)}
            title="Video player"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 w-full h-full border-0"
          />
        ) : (
          <button
            type="button"
            data-part="play"
            onClick={() => playFrom(0)}
            aria-label="Play video"
            className="group absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-carbon/40"
          >
            <span
              aria-hidden
              className="flex items-center justify-center w-12 h-12 rounded-full bg-ink text-paper
                group-hover:scale-105 group-focus-visible:scale-105 transition-transform"
            >
              <Play size={18} className="translate-x-px" fill="currentColor" />
            </span>
            <span aria-hidden className="px-4 text-center text-meta text-ink-tertiary">
              Loads from {media.provider ?? "the provider"} when you press play
            </span>
          </button>
        )}
      </div>
      <MetaRow media={media} />
      </div>

      {hasChapters && (
        /* The wrapper takes the grid row's height beside the video; the list
           fills it and scrolls. Stacked, it is ordinary flow. */
        <div className="relative min-w-0 @[52rem]:min-h-[12rem] rounded-md border border-border bg-paper overflow-hidden">
          <div className="@[52rem]:absolute @[52rem]:inset-0 @[52rem]:overflow-y-auto @[52rem]:overscroll-contain">
            <ChapterList framed={false}>
              {media.chapters.map((c, i) => (
                <li key={`${c.seconds}-${c.label}`}>
                  <button
                    type="button"
                    data-part="chapter"
                    data-seconds={c.seconds}
                    onClick={() => playFrom(c.seconds)}
                    aria-current={current === i || undefined}
                    // The spans are grid cells, and an accessible name built from
                    // them runs the time into the label ("5:24initial…").
                    aria-label={`Play from ${clock(c.seconds)}, ${c.label}`}
                    className={`${CHAPTER_ROW} cursor-pointer ${current === i ? "bg-parchment" : "hover:bg-warm"}`}
                  >
                    <ChapterText chapter={c} current={current === i} />
                  </button>
                </li>
              ))}
            </ChapterList>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
