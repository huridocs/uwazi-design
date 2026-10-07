import type { MediaAnchor } from "../../data/references";
import { formatOffset } from "../../data/vegas/links";
import { formatTime } from "../../utils/dateFormat";

const BOX = "inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded bg-vellum text-ink-secondary";

/** The time inside a recording a reference rests on — the media counterpart
 *  of `PageTag` — and, where the recording's host can be opened at a time, the
 *  way to it: a link to the recording at that offset, in a new tab. Nothing
 *  plays here; the recording stays on its host.
 *
 *  It reads "0:04", the offset. The clock time there and the annotation are
 *  in its name and its tooltip. Like `PageTag`, it stops the click from
 *  reaching the row. Without a link (Facebook, an archive.org file) it is a
 *  `<span>` that only states the time. */
export function TimeTag({ anchor, recordingTitle }: { anchor: MediaAnchor; recordingTitle?: string }) {
  const at = formatOffset(anchor.offset);
  const clock = anchor.clock !== undefined ? formatTime(anchor.clock) : undefined;
  const about = [anchor.label, clock ? `clock ${clock}` : undefined].filter(Boolean).join(", ");
  const tip = [`${at} into ${recordingTitle ?? "the recording"}`, about].filter(Boolean).join(" · ");
  if (!anchor.url) {
    return (
      <span data-component="TimeTag" className={`${BOX} tabular-nums`} title={tip}>
        {at}
      </span>
    );
  }
  return (
    <a
      href={anchor.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={`Open ${recordingTitle ?? "the recording"} at ${at}${about ? `, ${about}` : ""} (opens in a new tab)`}
      title={tip}
      data-component="TimeTag"
      className={`${BOX} tabular-nums hover:bg-border hover:text-ink transition-colors cursor-pointer
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40`}
    >
      {at}
    </a>
  );
}
