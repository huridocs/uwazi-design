/** The tokenizer, parser and term matcher for a search query, shared by the
 *  Library filter, the snippet builder (`librarySnippets.ts`, which also serves
 *  the entity drawer's Search tab) and the highlighter (`HighlightedText`), so
 *  what MATCHES and what gets MARKED can never drift out of sync. (The older
 *  `searchSnippets.ts` parser has no callers.)
 *
 *  Tokenizing splits on whitespace but keeps `"quoted phrases"` intact as one
 *  token, and classifies the bare uppercase booleans `AND`/`OR`/`NOT` as
 *  operators (not content). `parseSearchQuery` gives them their meaning; `termIn`
 *  / `termHit` give `*` / `?` theirs. */

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

/** A query as the Library filter reads it: every GROUP must match (implicit
 *  AND between terms), a group matches when ANY of its terms does (`OR`), and no
 *  EXCLUDE term may match (`NOT`). Terms are folded, wildcards kept.
 *
 *  Deliberately flat, so it stays predictable:
 *   - bare terms and `AND` are the same thing: `a b` = `a AND b`;
 *   - `OR` joins the positive terms either side of it: `a OR b c` = `(a|b) c`,
 *     and a chain `a OR b OR c` is one group;
 *   - `NOT` binds the ONE term after it: `a NOT b` = `a` without `b`. An `OR`
 *     beside a `NOT` term has nothing to join and reads as `AND`;
 *   - no parentheses; they are ordinary characters in a term. */
export interface SearchQuery {
  groups: string[][];
  exclude: string[];
}

/** Folded term, or "" when there is nothing to match (a lone `*`). */
function foldTerm(raw: string): string {
  const t = fold(raw.trim());
  return /[^*?]/.test(t) ? t : "";
}

let lastQuery: string | null = null;
let lastParsed: SearchQuery = { groups: [], exclude: [] };

/** Parse a RAW query (case intact — the operators are uppercase). Cached on the
 *  last query string, since the highlighter, snippets and filter all ask for the
 *  same one within a keystroke. */
export function parseSearchQuery(query: string): SearchQuery {
  if (query === lastQuery) return lastParsed;
  const groups: string[][] = [];
  const exclude: string[] = [];
  let negate = false;
  let or = false;
  let lastPositive = false;
  for (const tok of tokenizeQuery(query)) {
    if (tok.kind === "op") {
      if (tok.value === "NOT") negate = true;
      else or = tok.value === "OR";
      continue;
    }
    const term = foldTerm(tok.value);
    if (term) {
      if (negate) {
        exclude.push(term);
        lastPositive = false;
      } else if (or && lastPositive) {
        groups[groups.length - 1].push(term);
      } else {
        groups.push([term]);
        lastPositive = true;
      }
    }
    negate = false;
    or = false;
  }
  lastQuery = query;
  lastParsed = { groups, exclude };
  return lastParsed;
}

/** The terms to HIGHLIGHT (and to categorise and excerpt by): every positive
 *  term, wildcards kept. Excluded (`NOT`) terms are left out — a result is
 *  there BECAUSE it lacks them, so there is nothing of theirs to mark. An `OR`
 *  term that matched is marked like any other.
 *
 *  Terms come back FOLDED (lowercased + de-accented) because every text they're
 *  tested against is folded too — so filter, snippets, and marks all compare in
 *  the same normalisation and an unaccented query matches accented text. Test
 *  them with `termIn` / `termHit`, never a bare `includes`: a term may be a glob. */
export function highlightTerms(query: string): string[] {
  return parseSearchQuery(query).groups.flat();
}

/** A letter or digit, in any script — the edge of a word for globs. */
const WORD_CHAR = "[\\p{L}\\p{N}]";
const globCache = new Map<string, RegExp>();

/** Whether a (folded) term carries a wildcard. Only these build a RegExp; a
 *  plain term keeps the `includes()` / `indexOf()` path. */
export const isGlob = (term: string): boolean => term.includes("*") || term.includes("?");

/** A wildcard term matches WHOLE WORDS: `*` is any run of letters/digits, `?`
 *  exactly one, and the match may not start or end inside a word. That edge is
 *  what makes a glob mean something: without it `juris*` is just the substring
 *  "juris" and `198?` just "198" — which is what a plain term already does. */
function globRegex(term: string): RegExp {
  let re = globCache.get(term);
  if (!re) {
    let src = "";
    for (const ch of term) {
      if (ch === "*") src += `${WORD_CHAR}*`;
      else if (ch === "?") src += WORD_CHAR;
      else src += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
    re = new RegExp(`(?<!${WORD_CHAR})${src}(?!${WORD_CHAR})`, "gu");
    globCache.set(term, re);
  }
  return re;
}

/** Does folded `text` contain `term`? */
export function termIn(text: string, term: string): boolean {
  if (!isGlob(term)) return text.includes(term);
  const re = globRegex(term);
  re.lastIndex = 0;
  return re.test(text);
}

/** The first hit of `term` in folded `text` at or after `from`, as [start, end). */
export function termHit(text: string, term: string, from = 0): [number, number] | null {
  if (!isGlob(term)) {
    const i = text.indexOf(term, from);
    return i < 0 ? null : [i, i + term.length];
  }
  const re = globRegex(term);
  re.lastIndex = from;
  const m = re.exec(text);
  return m ? [m.index, m.index + m[0].length] : null;
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
      const found = termHit(folded, needle, from);
      if (!found) break;
      const [hit, stop] = found;
      const start = map[hit] ?? 0;
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
