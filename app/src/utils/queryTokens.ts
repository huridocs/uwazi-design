/** The raw tokenizer for a search query, shared by the snippet matcher
 *  (`searchSnippets.ts`) and the highlighter (`HighlightedText`) so what MATCHES
 *  and what gets MARKED can never drift out of sync.
 *
 *  Splits on whitespace but keeps `"quoted phrases"` intact as one token, and
 *  classifies the bare uppercase booleans `AND`/`OR`/`NOT` as operators (not
 *  content). No wildcard/regex semantics here — that's the matcher's job. */

/** Case- AND diacritic-insensitive fold: "Velásquez" → "velasquez", so an
 *  unaccented query finds accented text (and vice versa). Every searchable text
 *  (metadata index, full-text blob) and every query term goes through this, so
 *  matching is one normalisation everywhere. */
export const fold = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** `fold`, but keeping a map from each folded char back to its index in the
 *  ORIGINAL string — needed by the highlighter, which matches on folded text but
 *  must mark the original (accents and case intact). NFD can expand one char
 *  into several, so a plain fold loses index alignment; this doesn't.
 *
 *  **`folded` is guaranteed identical to `fold(s)`** — the two are compared
 *  against each other all over the search path (`buildSnippetsFor` counts hits
 *  with `fold` and cuts the excerpt with this), so any divergence shows up as a
 *  page counted with no passage to show for it and no marks painted.
 *
 *  That forces the shape below. Lowercasing is **context-sensitive**: Greek Σ
 *  lowercases to final ς at the end of a word and medial σ elsewhere, so folding
 *  character by character turned "ΟΔΟΣ" into "οδοσ" while `fold` produced
 *  "οδος" — the same text, two spellings, no match. So the NFD + diacritic strip
 *  runs per character (that is what yields the index map) and `toLowerCase` runs
 *  ONCE over the whole result, where it can see the word boundaries.
 *
 *  Splitting the pass that way is only safe because lowercasing can't change the
 *  length here, which would slide `map` out of alignment with `folded`. Verified
 *  by brute force over every code point in Unicode (0…0x10FFFF): after NFD and
 *  the diacritic strip, zero of them lowercase to a different length. (The one
 *  expanding mapping, İ → i + U+0307, is a diacritic and is already gone.) */
export function foldWithMap(s: string): { folded: string; map: number[] } {
  let stripped = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const d = s[i].normalize("NFD").replace(/\p{Diacritic}/gu, "");
    for (const c of d) {
      stripped += c;
      map.push(i);
    }
  }
  return { folded: stripped.toLowerCase(), map };
}

export interface QueryToken {
  kind: "phrase" | "word" | "op";
  /** phrase → inner text (quotes stripped); word/op → the token verbatim. */
  value: string;
}

const QUERY_TOKEN_RE = /"[^"]*"|\S+/g;
const OPERATORS = new Set(["AND", "OR", "NOT"]);

export function tokenizeQuery(query: string): QueryToken[] {
  const out: QueryToken[] = [];
  for (const m of query.matchAll(QUERY_TOKEN_RE)) {
    const tok = m[0];
    if (OPERATORS.has(tok)) {
      out.push({ kind: "op", value: tok });
    } else if (tok.startsWith('"')) {
      const inner = tok.slice(1, -1).trim();
      if (inner) out.push({ kind: "phrase", value: inner });
    } else {
      out.push({ kind: "word", value: tok });
    }
  }
  return out;
}

/** The terms to MATCH and HIGHLIGHT for a query: phrase inner-text and bare
 *  words, operators dropped, wildcard chars (`*`/`?`) stripped (a `juris*` token
 *  still marks the literal run it shares with matches — the Library filter is
 *  substring, not glob).
 *
 *  Terms come back FOLDED (lowercased + de-accented) because every text they're
 *  tested against is folded too — so filter, snippets, and marks all compare in
 *  the same normalisation and an unaccented query matches accented text. */
export function highlightTerms(query: string): string[] {
  return tokenizeQuery(query)
    .filter((t) => t.kind !== "op")
    .map((t) => fold(t.value.replace(/[*?]/g, "").trim()))
    .filter(Boolean);
}


/** Every [start, end) range in `text` matched by any of `terms` (already folded),
 *  in ORIGINAL string indices, sorted and merged so no range nests inside
 *  another (a bare word that also sits inside a quoted phrase).
 *
 *  The single source of truth for "where are the hits" — shared by the snippet
 *  marks (`HighlightedText`) and the marks painted into the PDF text layer, so
 *  the two can never disagree about what counts as a match (diacritics
 *  included: matching is folded, the ranges point back at the original glyphs). */
export function highlightRanges(text: string, terms: string[]): [number, number][] {
  if (terms.length === 0) return [];
  const { folded, map } = foldWithMap(text);
  const ranges: [number, number][] = [];
  for (const needle of terms) {
    if (!needle) continue;
    let from = 0;
    for (;;) {
      const hit = folded.indexOf(needle, from);
      if (hit < 0) break;
      const start = map[hit] ?? 0;
      const stop = hit + needle.length;
      const end = stop < map.length ? map[stop] : text.length;
      if (end > start) ranges.push([start, end]);
      from = stop;
    }
  }
  if (ranges.length === 0) return [];
  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}
