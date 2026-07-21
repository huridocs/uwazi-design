import { Fragment, type ReactNode } from "react";

/** The search-match mark. Reuses the app's own highlight token (softened) so
 *  search matches and document highlights read as one visual family; theme-aware
 *  via `--highlight-yellow`.
 *
 *  Spacing: `px-0.5` paints the tint slightly past the glyphs, and `-mx-0.5`
 *  cancels that width so the mark occupies the SAME horizontal space as the
 *  plain text — a highlighted line wraps identically to an unhighlighted one.
 *  No `font-weight` is set either: the mark INHERITS the surrounding weight, so
 *  a match inside a semibold title stays semibold and a match in body text stays
 *  regular — a weight change would shift glyph metrics and re-wrap the line.
 *  `-mx-*` is symmetric, so this is RTL-safe. */
const MARK_CLASS = "rounded-[2px] px-0.5 -mx-0.5 bg-highlight/60 text-ink";

/** Renders `text` with every case-insensitive occurrence of `query` wrapped in a
 *  highlight `<mark>`. Marking is done by string-split — never
 *  `dangerouslySetInnerHTML` — so it's safe on arbitrary content. An empty query
 *  (or no match) renders the text unchanged, with no extra wrapper element, so
 *  it's a drop-in for a bare `{text}`. */
export function HighlightedText({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const parts: ReactNode[] = [];
  const lower = text.toLowerCase();
  const needle = q.toLowerCase();
  let cursor = 0;
  let key = 0;

  for (;;) {
    const hit = lower.indexOf(needle, cursor);
    if (hit < 0) {
      parts.push(<Fragment key={key++}>{text.slice(cursor)}</Fragment>);
      break;
    }
    if (hit > cursor) parts.push(<Fragment key={key++}>{text.slice(cursor, hit)}</Fragment>);
    parts.push(
      <mark key={key++} className={MARK_CLASS}>
        {text.slice(hit, hit + q.length)}
      </mark>,
    );
    cursor = hit + q.length;
  }

  return <>{parts}</>;
}
