import type { Entity } from "../data/entities";

/** Per-entity search snippets, mirroring Uwazi's `SnippetsSearchResponse` shape
 *  (`app/shared/types` → `EntitySchema['snippets']`) so the Results-tab UI maps
 *  1:1 onto what the real backend returns:
 *
 *    { count, metadata: [{ field, texts[] }], fullText: [{ page, text }] }
 *
 *  `texts`/`text` carry the matched terms wrapped in `<b>…</b>`, exactly like
 *  ElasticSearch highlight fragments. `count` is the total number of snippet
 *  fragments across metadata + fullText.
 *
 *  The module is PURE: it imports only the `Entity` type and takes the CEJIL
 *  full-text (`Record<filename→pages>` resolved to per-entity pages by the
 *  caller) as an argument, never reaching into the `data/cejil/load.ts`
 *  singletons. That keeps it unit-testable without the corpus loaded. */

export interface MetadataSnippet {
  /** The metadata field's label ("title", "País", …). */
  field: string;
  /** One `<b>`-highlighted fragment per hit window (capped per field). */
  texts: string[];
}

export interface FullTextSnippet {
  /** 1-based page number the fragment came from. */
  page: number;
  /** `<b>`-highlighted fragment. */
  text: string;
}

export interface EntitySnippets {
  /** Total fragments (metadata texts + fullText entries). */
  count: number;
  metadata: MetadataSnippet[];
  fullText: FullTextSnippet[];
}

/** Per-entity page text, keyed by `entity.id`. The Library resolves each CEJIL
 *  entity's primary filename → `cejilFullText()[filename]` and keys the result
 *  by entity id before handing it here — so this stays decoupled from the
 *  filename indirection. Accepts either a Map or a plain record. */
export type FullTextByEntity =
  | ReadonlyMap<string, readonly string[]>
  | Readonly<Record<string, readonly string[]>>;

export interface SnippetOptions {
  /** Words of context on EACH side of a hit. Default 7 → ~15-word windows. */
  contextWords?: number;
  /** Max fragments per metadata field. Default 3. */
  maxPerField?: number;
  /** Max fragments per document's full text. Default 3. */
  maxFullText?: number;
}

const DEFAULTS = { contextWords: 7, maxPerField: 3, maxFullText: 3 } as const;

// ---------------------------------------------------------------------------
// Text folding + tokenisation
// ---------------------------------------------------------------------------

/** Case- and diacritic-insensitive fold. NFD-decompose, drop combining marks,
 *  lowercase — so "Velásquez" and "velasquez" compare equal. Matching happens on
 *  folded token strings; highlighting slices the ORIGINAL text, so accents and
 *  case survive in the output. */
const fold = (s: string): string =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

interface Token {
  /** Original substring (accents/case preserved) for highlighting. */
  raw: string;
  /** Folded form used for matching. */
  folded: string;
  /** Char offset of `raw` in the source text. */
  start: number;
  /** Exclusive end char offset. */
  end: number;
}

/** Word tokens: runs of letters/digits, keeping internal apostrophes/hyphens so
 *  "art. 8", "no-bis-in-idem" and "d'État" tokenise sensibly. */
const TOKEN_RE = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(TOKEN_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    tokens.push({ raw, folded: fold(raw), start, end: start + raw.length });
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Query parsing — the Uwazi/Lucene syntax subset
// ---------------------------------------------------------------------------

/** A single term: a bare word (with optional `*`/`?` wildcards) or a quoted
 *  phrase (a sequence of word-matchers that must appear consecutively). Both
 *  compile down to anchored regexes tested against folded tokens. */
type Term =
  | { kind: "word"; source: string; re: RegExp }
  | { kind: "phrase"; source: string; words: RegExp[] };

/** One clause = an operator (relative to the previous clause), an optional
 *  negation, and a term. `op` is left-associative with NO precedence. */
interface Clause {
  op: "AND" | "OR";
  neg: boolean;
  term: Term;
}

/** Turn one folded word into an anchored regex. `*` → any run, `?` → one char;
 *  every other regex metacharacter is escaped so it matches literally. */
function wordRegex(word: string): RegExp {
  let pattern = "";
  for (const ch of fold(word)) {
    if (ch === "*") pattern += ".*";
    else if (ch === "?") pattern += ".";
    else pattern += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${pattern}$`);
}

/** Split the query into raw tokens, keeping `"quoted phrases"` intact. */
const QUERY_TOKEN_RE = /"[^"]*"|\S+/g;

/** Parse the query string into clauses. Returns an empty array when the query
 *  has no actual terms (blank, or operators only) — the caller treats that as
 *  "no search".
 *
 *  Rules (the documented subset):
 *   - `"exact phrase"` — consecutive-token match.
 *   - trailing/embedded `*` — any run; `?` — one char.
 *   - `AND` / `OR` / `NOT` — literal uppercase operators.
 *   - default connective between bare words is `OR`.
 *   - a `NOT` term defaults to `AND NOT` (a filter, not an alternative) unless an
 *     explicit `AND`/`OR` preceded it — so `a NOT b` means `a AND (NOT b)`. */
export function parseQuery(query: string): Clause[] {
  const clauses: Clause[] = [];
  let explicitOp: "AND" | "OR" | null = null;
  let neg = false;

  for (const m of query.matchAll(QUERY_TOKEN_RE)) {
    const tok = m[0];
    if (tok === "AND" || tok === "OR") {
      explicitOp = tok;
      continue;
    }
    if (tok === "NOT") {
      neg = true;
      continue;
    }

    let term: Term | null = null;
    if (tok.startsWith('"')) {
      const inner = tok.slice(1, -1).trim();
      if (inner) {
        term = {
          kind: "phrase",
          source: inner,
          words: inner.split(/\s+/).map(wordRegex),
        };
      }
    } else {
      term = { kind: "word", source: tok, re: wordRegex(tok) };
    }

    if (term) {
      clauses.push({ op: explicitOp ?? (neg ? "AND" : "OR"), neg, term });
    }
    explicitOp = null;
    neg = false;
  }

  return clauses;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Inclusive token-index span of a single hit (a word hit is one token; a phrase
 *  hit spans its length). */
interface HitRange {
  from: number;
  to: number;
}

/** Does this term hit anywhere in the token stream? */
function termHasHit(term: Term, tokens: Token[]): boolean {
  if (term.kind === "word") {
    return tokens.some((t) => term.re.test(t.folded));
  }
  const len = term.words.length;
  for (let i = 0; i + len <= tokens.length; i++) {
    if (term.words.every((re, k) => re.test(tokens[i + k].folded))) return true;
  }
  return false;
}

/** All hit ranges for the given terms in one token stream, sorted and merged so
 *  overlapping/touching hits (e.g. a word inside a phrase) become one span. */
function findHits(terms: Term[], tokens: Token[]): HitRange[] {
  const ranges: HitRange[] = [];
  for (const term of terms) {
    if (term.kind === "word") {
      tokens.forEach((t, i) => {
        if (term.re.test(t.folded)) ranges.push({ from: i, to: i });
      });
    } else {
      const len = term.words.length;
      for (let i = 0; i + len <= tokens.length; i++) {
        if (term.words.every((re, k) => re.test(tokens[i + k].folded))) {
          ranges.push({ from: i, to: i + len - 1 });
        }
      }
    }
  }
  ranges.sort((a, b) => a.from - b.from || a.to - b.to);

  const merged: HitRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.from <= last.to + 1) last.to = Math.max(last.to, r.to);
    else merged.push({ ...r });
  }
  return merged;
}

/** Evaluate the clause expression against a set of already-tokenised texts —
 *  left-associative, no precedence, negation applied per clause. A term is
 *  "present" if it hits any of the entity's texts. */
function matchesQuery(clauses: Clause[], texts: Token[][]): boolean {
  const present = (term: Term) => texts.some((toks) => termHasHit(term, toks));
  const clauseVal = (c: Clause) => (c.neg ? !present(c.term) : present(c.term));

  let acc = clauseVal(clauses[0]);
  for (let i = 1; i < clauses.length; i++) {
    acc = clauses[i].op === "AND" ? acc && clauseVal(clauses[i]) : acc || clauseVal(clauses[i]);
  }
  return acc;
}

// ---------------------------------------------------------------------------
// Snippet extraction + highlighting
// ---------------------------------------------------------------------------

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Build one highlighted fragment covering tokens `[winA, winB]`, wrapping every
 *  hit token-span in `<b>`. Source text is HTML-escaped so the only markup is
 *  ours; leading/trailing `…` mark a clipped window. */
function buildFragment(
  text: string,
  tokens: Token[],
  winA: number,
  winB: number,
  hits: HitRange[],
): string {
  const endChar = tokens[winB].end;
  let cursor = tokens[winA].start;
  let out = "";
  for (const h of hits) {
    const hs = tokens[h.from].start;
    const he = tokens[h.to].end;
    if (hs < cursor) continue; // defensive: already-covered overlap
    out += escapeHtml(text.slice(cursor, hs));
    out += `<b>${escapeHtml(text.slice(hs, he))}</b>`;
    cursor = he;
  }
  out += escapeHtml(text.slice(cursor, endChar));

  const prefix = winA > 0 ? "… " : "";
  const suffix = winB < tokens.length - 1 ? " …" : "";
  return `${prefix}${out.trim()}${suffix}`;
}

/** Up to `max` highlighted fragments for one text. Each fragment is a ~15-word
 *  window around a hit; hits that fall within a window are merged so clustered
 *  matches don't spawn near-duplicate fragments. */
function extractFragments(
  text: string,
  tokens: Token[],
  terms: Term[],
  max: number,
  contextWords: number,
): string[] {
  if (max <= 0) return [];
  const hits = findHits(terms, tokens);
  if (hits.length === 0) return [];

  const out: string[] = [];
  let i = 0;
  while (i < hits.length && out.length < max) {
    const first = hits[i];
    const winA = Math.max(0, first.from - contextWords);
    let winB = Math.min(tokens.length - 1, first.to + contextWords);

    const group: HitRange[] = [first];
    let j = i + 1;
    while (j < hits.length && hits[j].from <= winB) {
      group.push(hits[j]);
      winB = Math.min(tokens.length - 1, Math.max(winB, hits[j].to + contextWords));
      j++;
    }

    out.push(buildFragment(text, tokens, winA, winB, group));
    i = j;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entity field sources
// ---------------------------------------------------------------------------

/** The searchable metadata fields of an entity, in display order. Mirrors the
 *  parts `buildSearchIndex` (utils/libraryFilter.ts) concatenates — title,
 *  country, adapter fields, descriptors — but keeps them per-field (with
 *  labels) because snippets need field granularity that the flat index throws
 *  away. */
function entityFieldTexts(e: Entity): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [{ field: "title", text: e.title }];
  if (e.country) out.push({ field: "country", text: e.country });
  for (const f of e.fields ?? []) {
    if (f.value) out.push({ field: f.label, text: f.value });
  }
  if (e.descriptors?.length) {
    out.push({ field: "descriptors", text: e.descriptors.join(", ") });
  }
  return out;
}

function readPages(
  fullText: FullTextByEntity | undefined,
  id: string,
): readonly string[] {
  if (!fullText) return [];
  if (fullText instanceof Map) return fullText.get(id) ?? [];
  return (fullText as Readonly<Record<string, readonly string[]>>)[id] ?? [];
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/** Produce per-entity snippets for the library `query`. Returns a Map keyed by
 *  `entity.id`, holding only entities the query MATCHES (a pure-negation query
 *  can match with `count: 0` and empty arrays — a legitimate hit with nothing to
 *  highlight). An empty/termless query returns an empty Map.
 *
 *  `fullText` is optional (metadata-only when absent) and keyed by entity id;
 *  the caller resolves CEJIL filenames → pages before calling. */
export function searchSnippets(
  query: string,
  entities: Entity[],
  fullText?: FullTextByEntity,
  options: SnippetOptions = {},
): Map<string, EntitySnippets> {
  const results = new Map<string, EntitySnippets>();
  const clauses = parseQuery(query);
  if (clauses.length === 0) return results;

  const contextWords = options.contextWords ?? DEFAULTS.contextWords;
  const maxPerField = options.maxPerField ?? DEFAULTS.maxPerField;
  const maxFullText = options.maxFullText ?? DEFAULTS.maxFullText;
  const positiveTerms = clauses.filter((c) => !c.neg).map((c) => c.term);

  for (const e of entities) {
    // Tokenise each source once; reused for both the match test and extraction.
    const fields = entityFieldTexts(e).map((ft) => ({ ...ft, tokens: tokenize(ft.text) }));
    const pages = readPages(fullText, e.id).map((text, idx) => ({
      page: idx + 1,
      text,
      tokens: tokenize(text),
    }));

    const allTokens = [...fields.map((f) => f.tokens), ...pages.map((p) => p.tokens)];
    if (!matchesQuery(clauses, allTokens)) continue;

    const metadata: MetadataSnippet[] = [];
    for (const f of fields) {
      const texts = extractFragments(f.text, f.tokens, positiveTerms, maxPerField, contextWords);
      if (texts.length) metadata.push({ field: f.field, texts });
    }

    const fullTextSnippets: FullTextSnippet[] = [];
    for (const p of pages) {
      if (fullTextSnippets.length >= maxFullText) break;
      const remaining = maxFullText - fullTextSnippets.length;
      for (const text of extractFragments(p.text, p.tokens, positiveTerms, remaining, contextWords)) {
        fullTextSnippets.push({ page: p.page, text });
      }
    }

    const count =
      metadata.reduce((n, m) => n + m.texts.length, 0) + fullTextSnippets.length;
    results.set(e.id, { count, metadata, fullText: fullTextSnippets });
  }

  return results;
}
