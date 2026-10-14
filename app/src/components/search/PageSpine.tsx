import type { FullTextSnippet } from "../../utils/librarySnippets";
import { SnippetLine } from "../library/ResultsSnippets/ResultRecord";

interface Props {
  entityId: string;
  /** Full-text hits, one per page, in page order. */
  fullText: FullTextSnippet[];
  query: string;
  /** Jump the doc to a page (select entity + scroll + record active page). */
  onSelect: (entityId: string, page: number) => void;
}

/** The full-text hits as a vertical list against a thin spine rail, one row per
 *  hit page, in page order. Each row is the shared `SnippetLine`: the excerpt
 *  with its page tag trailing the last word (`p.7 · 2×`), a jump where the
 *  corpus has pages, passive text where it has none. No node markers on the
 *  rail; it is quiet structure. RTL-safe: the rail is on the inline-start edge. */
export function PageSpine({ entityId, fullText, query, onSelect }: Props) {
  return (
    <div data-component="PageSpine" className="relative ps-4">
      <span
        aria-hidden="true"
        data-part="rail"
        className="absolute inset-y-1.5 w-px bg-border/60"
        style={{ insetInlineStart: "0.1875rem" }}
      />
      <ul data-part="rows" className="flex flex-col gap-0.5">
        {fullText.map((snippet, i) => (
          <li key={i} data-part="row">
            <SnippetLine entityId={entityId} snippet={snippet} query={query} onJump={onSelect} />
          </li>
        ))}
      </ul>
    </div>
  );
}
