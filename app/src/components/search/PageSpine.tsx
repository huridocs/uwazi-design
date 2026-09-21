import type { ReactNode } from "react";
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
 *  than one hit folds its count into the tag (`p.7 · 2×`). The tag trails the
 *  excerpt's last word, as `PassageRow` does in the main Results view: on a line
 *  of its own, right-aligned, it cost every row a line and sat apart from the
 *  sentence it cites. No node markers on the
 *  rail — the rail is just quiet structure. Clicking a row jumps the doc to that
 *  page (§8) and records it in `resultsActivePageAtom`, so the row returns lit +
 *  `aria-pressed` after the preview closes. RTL-safe: rail on the inline-start
 *  edge; the page tag stays `dir="ltr"`. */
export function PageSpine({ entityId, fullText, query, onSelect }: Props) {
  const active = useAtomValue(resultsActivePageAtom);

  return (
    <div data-component="PageSpine" className="relative ps-4">
      {/* The rail — a continuous quiet line, inline-start edge. */}
      <span
        aria-hidden="true"
        data-part="rail"
        className="absolute inset-y-1.5 w-px bg-border/60"
        style={{ insetInlineStart: "0.1875rem" }}
      />
      <ul data-part="rows" className="flex flex-col gap-1.5">
        {fullText.map((snippet, i) => {
          const isActive =
            snippet.page !== null &&
            active?.entityId === entityId &&
            active.page === snippet.page;
          // A snippet whose corpus can't name a real page is a passive excerpt:
          // no "p.N", no click. Jumping to a page we invented would land nowhere.
          if (snippet.page === null) {
            return (
              <li key={i} data-part="row" data-variant="passive" className="w-full rounded-md px-2 py-1.5">
                <p data-part="excerpt" className="text-sm text-ink leading-relaxed">
                  <HighlightedText text={snippet.text} query={query} />
                  {snippet.hits > 1 && <PageTag>{snippet.hits}×</PageTag>}
                </p>
              </li>
            );
          }
          const page = snippet.page;
          return (
            <li key={i} data-part="row" data-state={isActive ? "active" : undefined}>
              <button
                type="button"
                data-part="jump"
                aria-pressed={isActive}
                aria-label={`Page ${page}, ${snippet.hits} ${
                  snippet.hits === 1 ? "match" : "matches"
                }`}
                onClick={() => onSelect(entityId, page)}
                className={`w-full text-start rounded-md px-2 py-1.5 transition-colors cursor-pointer
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20 ${
                    isActive ? "bg-parchment" : "hover:bg-warm"
                  }`}
              >
                <span data-part="excerpt" className="block text-sm text-ink leading-relaxed">
                  <HighlightedText text={snippet.text} query={query} />
                  <PageTag>
                    p.{page}
                    {snippet.hits > 1 ? ` · ${snippet.hits}×` : ""}
                  </PageTag>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The citation after the excerpt's last word. `bdi dir="ltr"` holds "p.15 · 2×"
 *  in order under RTL without forcing the excerpt's own direction; `nowrap`
 *  keeps the tag in one piece when it lands at a line end. */
function PageTag({ children }: { children: ReactNode }) {
  return (
    <bdi
      dir="ltr"
      data-part="page"
      className="ms-1.5 whitespace-nowrap text-meta font-semibold text-ink-tertiary tabular-nums"
    >
      {children}
    </bdi>
  );
}
