import { Fragment, type ReactNode } from "react";
import { highlightTerms, highlightRanges } from "../../utils/queryTokens";

/** The search-match mark. Reuses the app's highlight family — the *active*
 *  highlight token (`--highlight-yellow-active`) at 70%, a cleaner marigold than
 *  the muddier base yellow washed out over warm paper. Theme-aware, so it flips
 *  to a warm amber in dark.
 *
 *  Spacing: the tint bleeds slightly past the glyphs via a `box-shadow` SPREAD,
 *  not padding. The mark therefore has no box metrics at all — no padding, no
 *  margin, no border — so a highlighted line wraps identically to an
 *  unhighlighted one. No `font-weight` is set either: the mark INHERITS the
 *  surrounding weight, so a match inside a semibold title stays semibold and a
 *  match in body text stays regular — a weight change would shift glyph metrics
 *  and re-wrap the line.
 *
 *  **The zero box metrics are a correctness requirement, not a preference.**
 *  Per CSS Text §"Shaping Across Element Boundaries", shaping must NOT be
 *  performed across an inline boundary carrying margin, border or padding — and
 *  a match is very often mid-word (searching `حكم` marks the middle of
 *  `المحكمة`). The previous `px-0.5 -mx-0.5` supplied both margin and padding,
 *  which severed the cursive join: the word rendered as two disconnected runs
 *  with the letters at the seam reshaped into the wrong contextual forms. It
 *  cancelled its own WIDTH, which is why it read as RTL-safe, but width was
 *  never the issue. `box-shadow` paints outside the box without creating one,
 *  so Arabic, Syriac, N'Ko and every other cursive script stay joined. This is
 *  the same background-only treatment `.pdf-search-hit` uses for the PDF text
 *  layer, and for the same reason. */
const MARK_CLASS =
  "rounded-[2px] bg-highlight-active/70 text-ink " +
  "shadow-[0_0_0_0.125rem_color-mix(in_oklab,var(--color-highlight-active)_70%,transparent)]";

/** Renders `text` with every case-insensitive occurrence of each query TERM
 *  wrapped in a highlight `<mark>`. The query is tokenised the same way the
 *  snippet matcher tokenises it (`highlightTerms`: quoted phrases as units, bare
 *  words separately, `AND`/`OR`/`NOT` dropped) so a multi-word query like
 *  `tortura psicológica` marks BOTH words wherever they appear — matching and
 *  marking share one tokenizer and can't drift.
 *
 *  Marking is done by string-split — never `dangerouslySetInnerHTML` — so it's
 *  safe on arbitrary content. Overlapping term hits are merged into one mark. An
 *  empty query (or no match) renders the text unchanged, with no extra wrapper,
 *  so it's a drop-in for a bare `{text}`. */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const terms = highlightTerms(query);
  if (terms.length === 0) return <>{text}</>;

  // Ranges come from the SHARED matcher, so these marks and the ones painted
  // into the PDF text layer always agree about what a hit is.
  const merged = highlightRanges(text, terms);
  if (merged.length === 0) return <>{text}</>;

  const parts: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const [start, end] of merged) {
    if (start > cursor) parts.push(<Fragment key={key++}>{text.slice(cursor, start)}</Fragment>);
    parts.push(
      <mark key={key++} className={MARK_CLASS}>
        {text.slice(start, end)}
      </mark>,
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(<Fragment key={key++}>{text.slice(cursor)}</Fragment>);

  return <>{parts}</>;
}
