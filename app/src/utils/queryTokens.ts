/** The raw tokenizer for a search query, shared by the snippet matcher
 *  (`searchSnippets.ts`) and the highlighter (`HighlightedText`) so what MATCHES
 *  and what gets MARKED can never drift out of sync.
 *
 *  Splits on whitespace but keeps `"quoted phrases"` intact as one token, and
 *  classifies the bare uppercase booleans `AND`/`OR`/`NOT` as operators (not
 *  content). No wildcard/regex semantics here — that's the matcher's job. */

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

/** The literal strings to HIGHLIGHT for a query: phrase inner-text and bare
 *  words, with operators dropped. Wildcard chars (`*`/`?`) are stripped so a
 *  `juris*` token still marks the literal run it shares with matches — a
 *  best-effort mark, since the Library filter itself is substring, not glob. */
export function highlightTerms(query: string): string[] {
  return tokenizeQuery(query)
    .filter((t) => t.kind !== "op")
    .map((t) => t.value.replace(/[*?]/g, "").trim())
    .filter(Boolean);
}
