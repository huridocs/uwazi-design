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
 *  into several, so a plain fold loses index alignment; this doesn't. */
export function foldWithMap(s: string): { folded: string; map: number[] } {
  let folded = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const f = fold(s[i]);
    for (const c of f) {
      folded += c;
      map.push(i);
    }
  }
  return { folded, map };
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
