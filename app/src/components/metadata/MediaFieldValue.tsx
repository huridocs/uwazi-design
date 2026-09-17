import { ExternalLink, Film, AudioLines, PlayCircle } from "lucide-react";
import { mediaUrlAt, parseMediaValue } from "../../utils/mediaValue";

/** A `media` property in the record: the recording as a named link, and its
 *  chapters (Uwazi's `timelinks`) as a list of links that start playback there.
 *
 *  A link, not an embedded player. An embed would load YouTube's player and its
 *  tracking into every record that carries a hearing — 771 Audiencia records —
 *  just to show a thumbnail, and the chapter jumps would need the player's API.
 *  A link with `?t=` does the jump with no dependency, and opens where the
 *  reader's own player settings already live.
 *
 *  The card mark says a recording exists; this is where the reader reaches it. */
export function MediaFieldValue({ raw }: { raw: string }) {
  const media = parseMediaValue(raw);
  if (!media) {
    // Not a URL we can open. Say what the record holds rather than hiding it.
    return <p className="text-sm text-ink-secondary leading-relaxed break-words">{raw}</p>;
  }

  const Icon = media.kind === "video" ? Film : media.kind === "audio" ? AudioLines : PlayCircle;
  const verb = media.kind === "audio" ? "Listen" : media.kind === "video" ? "Watch" : "Open";
  const name = media.provider ? `${verb} on ${media.provider}` : `${verb} recording`;

  return (
    <div data-component="MediaFieldValue" data-kind={media.kind} className="flex flex-col gap-2 min-w-0">
      <a
        data-part="open"
        href={media.url}
        target="_blank"
        rel="noopener noreferrer"
        title={media.url}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-ink underline underline-offset-2
          hover:text-ink-secondary rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        <Icon size={14} aria-hidden className="text-ink-tertiary shrink-0" />
        {name}
        <ExternalLink size={10} aria-hidden className="text-ink-muted shrink-0" />
      </a>

      {media.chapters.length > 0 && (
        <ol data-part="chapters" aria-label="Chapters" className="flex flex-col">
          {media.chapters.map((c) => (
            <li key={`${c.seconds}-${c.label}`}>
              <a
                data-part="chapter"
                href={mediaUrlAt(media, c.seconds)}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[4.5rem_1fr] items-baseline gap-2 rounded px-1 -mx-1 py-1
                  hover:bg-parchment transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
              >
                <span dir="ltr" className="font-mono text-meta tabular-nums text-ink-tertiary">
                  {c.time}
                </span>
                <span className="text-sm text-ink leading-snug">{c.label}</span>
              </a>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
