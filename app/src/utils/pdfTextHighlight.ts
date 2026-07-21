import { highlightRanges } from "./queryTokens";

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Wrap search hits in `<mark>` for react-pdf's `customTextRenderer`.
 *
 *  `customTextRenderer` returns a STRING that react-pdf injects as the text
 *  layer span's innerHTML, so every non-match segment is escaped here — the only
 *  markup in the result is ours.
 *
 *  Marking inside the EXISTING text layer (rather than painting absolute
 *  overlays) is what makes these marks line up with the glyphs for free and
 *  survive zoom: they inherit the layer's own transform. The text nodes are
 *  preserved verbatim, so selection still yields the original string, and the
 *  highlighter tool and reference highlights — which live in their own overlay
 *  layer — are untouched.
 *
 *  Ranges come from the shared `highlightRanges`, so a term marked in a snippet
 *  row is the same term marked on the page, diacritics and all. */
export function markSearchHits(str: string, terms: string[]): string {
  const ranges = highlightRanges(str, terms);
  if (ranges.length === 0) return escapeHtml(str);

  const cls = "pdf-search-hit";
  let out = "";
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) out += escapeHtml(str.slice(cursor, start));
    out += `<mark class="${cls}">${escapeHtml(str.slice(start, end))}</mark>`;
    cursor = end;
  }
  return out + escapeHtml(str.slice(cursor));
}
