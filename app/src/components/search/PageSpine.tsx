import { useAtomValue } from "jotai";
import type { FullTextSnippet } from "../../utils/librarySnippets";
import { resultsActivePageAtom } from "../../atoms/library";
import { HighlightedText } from "../shared/HighlightedText";

interface Props {
  entityId: string;
  /** Full-text hits, one per page, in page order. */
  fullText: FullTextSnippet[];
  query: string;
  /** Jump the doc to a page (select entity + scroll + record active page). */
  onSelect: (entityId: string, page: number) => void;
}

/** The full-text hits as a vertical list against a thin spine rail — one row per
 *  hit page, in page order. Each row is an excerpt + a page tag; a page with more
 *  than one hit folds its count into the tag (`p.7 · 2×`). No node markers on the
 *  rail — the rail is just quiet structure. Clicking a row jumps the doc to that
 *  page (§8) and records it in `resultsActivePageAtom`, so the row returns lit +
 *  `aria-pressed` after the preview closes. RTL-safe: rail on the inline-start
 *  edge; the page tag stays `dir="ltr"`. */
export function PageSpine({ entityId, fullText, query, onSelect }: Props) {
  const active = useAtomValue(resultsActivePageAtom);

  return (
    <div className="relative flex flex-col gap-1.5 ps-4">
      {/* The rail — a continuous quiet line, inline-start edge. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-1.5 w-px bg-border/60"
        style={{ insetInlineStart: "0.1875rem" }}
      />
      {fullText.map((snippet) => {
        const isActive = active?.entityId === entityId && active.page === snippet.page;
        return (
          <button
            key={snippet.page}
            type="button"
            aria-pressed={isActive}
            aria-label={`Page ${snippet.page}, ${snippet.hits} ${
              snippet.hits === 1 ? "match" : "matches"
            }`}
            onClick={() => onSelect(entityId, snippet.page)}
            className={`w-full text-start rounded-md px-2 py-1.5 transition-colors cursor-pointer
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20 ${
                isActive ? "bg-parchment" : "hover:bg-warm"
              }`}
          >
            <p className="text-sm text-ink leading-relaxed">
              <HighlightedText text={snippet.text} query={query} />
            </p>
            <span
              dir="ltr"
              className="mt-0.5 block text-end text-xs font-semibold text-ink-tertiary tabular-nums"
            >
              p.{snippet.page}
              {snippet.hits > 1 ? ` · ${snippet.hits}×` : ""}
            </span>
          </button>
        );
      })}
    </div>
  );
}
