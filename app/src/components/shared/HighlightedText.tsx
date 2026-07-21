import { Fragment, type ReactNode } from "react";
import { highlightTerms } from "../../utils/queryTokens";

/** The search-match mark. Reuses the app's highlight family — the *active*
 *  highlight token (`--highlight-yellow-active`) at 70%, a cleaner marigold than
 *  the muddier base yellow washed out over warm paper. Theme-aware, so it flips
 *  to a warm amber in dark.
 *
 *  Spacing: `px-0.5` paints the tint slightly past the glyphs, and `-mx-0.5`
 *  cancels that width so the mark occupies the SAME horizontal space as the
 *  plain text — a highlighted line wraps identically to an unhighlighted one.
 *  No `font-weight` is set either: the mark INHERITS the surrounding weight, so
 *  a match inside a semibold title stays semibold and a match in body text stays
 *  regular — a weight change would shift glyph metrics and re-wrap the line.
 *  `-mx-*` is symmetric, so this is RTL-safe. */
const MARK_CLASS = "rounded-[2px] px-0.5 -mx-0.5 bg-highlight-active/70 text-ink";

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

  // Collect every term's match ranges, then sort + merge overlaps so a mark is
  // never opened inside another (e.g. a word that also sits inside a phrase).
  const lower = text.toLowerCase();
  const ranges: [number, number][] = [];
  for (const term of terms) {
    const needle = term.toLowerCase();
    let from = 0;
    for (;;) {
      const hit = lower.indexOf(needle, from);
      if (hit < 0) break;
      ranges.push([hit, hit + needle.length]);
      from = hit + needle.length;
    }
  }
  if (ranges.length === 0) return <>{text}</>;

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

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
