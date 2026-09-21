import type { BorrowedDoc } from "../../utils/librarySnippets";
import { ProvenanceLine } from "../shared/ProvenanceLine";

/** `↳ from <document>` — the passages beside this line were quoted from a
 *  document the result doesn't own.
 *
 *  Why the results need it: a Causa with no PDF of its own reads a connected
 *  Sentencia's (`cejilRenderedDoc`), and the corpus ships six real PDFs standing
 *  in for 5,191 filenames — so hundreds of results can quote the SAME page of the
 *  SAME judgment. Unattributed, that reads as a corpus of duplicates, or as a
 *  bug. Attributed, it reads as what it is: many cases citing one shared
 *  judgment.
 *
 *  Renders nothing for an entity's own document, so it must be placed on a line
 *  that is mounted EITHER WAY — a section label, a row's attribution line — never
 *  as a line of its own that appears and disappears under the reader (CLAUDE.md:
 *  never shift layout on state change). Hence `inline`.
 *
 *  Not a link: the library's main pane doesn't mount `EntityOverlay`, so a
 *  clickable hop here would be a control that does nothing. It's an attribution,
 *  and the title is the whole of it. */
export function BorrowedDocLine({
  from,
  className = "",
  fade = false,
}: {
  from: BorrowedDoc | null;
  className?: string;
  /** Fade the title out at the slot's end instead of cutting it with an
   *  ellipsis — for a fixed slot where the title is routinely longer than the
   *  room (the Spine's attribution column). */
  fade?: boolean;
}) {
  if (!from) return null;
  return (
    <ProvenanceLine inline label="from" className={className}>
      <span
        data-part="document"
        className={
          fade
            ? "min-w-0 overflow-hidden whitespace-nowrap [mask-image:linear-gradient(to_right,#000_75%,transparent)] rtl:[mask-image:linear-gradient(to_left,#000_75%,transparent)]"
            : "truncate"
        }
        title={`Passage from ${from.title}, a connected document`}
      >
        {from.title}
      </span>
    </ProvenanceLine>
  );
}
