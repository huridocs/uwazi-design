import { foldTerm, tokenizeQuery } from "./queryTokens";

/** A search query as the Adv. Search builder shows it: one clause per chip.
 *  Read with the same rules as `parseSearchQuery` (bare terms AND, `OR` joins
 *  the positive terms either side, `NOT` binds the one term after it, a lone
 *  `*` matches nothing and is skipped), so a chip is exactly one of the query's
 *  AND groups or exclusions. Each clause keeps where it sits in the query, so
 *  removing one cuts that text out and leaves the rest as typed. */

export interface ClauseTerm {
  /** A word, or a phrase in straight quotes (closed, even while the query's
   *  closing quote is still to be typed). */
  raw: string;
  /** What the chip prints: the word, or the phrase without its quotes. */
  text: string;
  phrase: boolean;
}

export type QueryClause = (
  | { kind: "term"; term: ClauseTerm }
  | { kind: "any"; terms: ClauseTerm[] }
  | { kind: "not"; term: ClauseTerm }
) & {
  /** The clause's text in the query, as [start, end), operators before it
   *  included. */
  span: [number, number];
};

export function parseClauses(query: string): QueryClause[] {
  const out: QueryClause[] = [];
  let negate = false;
  let or = false;
  let lastPositive = false;
  /** Where the operators before the next term began. */
  let opStart: number | null = null;
  for (const tok of tokenizeQuery(query)) {
    if (tok.kind === "op") {
      if (tok.value === "NOT") negate = true;
      else or = tok.value === "OR";
      opStart ??= tok.start;
      continue;
    }
    const from = opStart ?? tok.start;
    opStart = null;
    if (!foldTerm(tok.value)) {
      // As the parser does: the term is dropped and the operators before it spent.
      negate = false;
      or = false;
      continue;
    }
    const term: ClauseTerm =
      tok.kind === "phrase"
        ? { raw: `"${tok.value}"`, text: tok.value, phrase: true }
        : { raw: tok.value, text: tok.value, phrase: false };
    if (negate) {
      out.push({ kind: "not", term, span: [from, tok.end] });
      lastPositive = false;
    } else if (or && lastPositive) {
      const last = out[out.length - 1];
      const span: [number, number] = [last.span[0], tok.end];
      if (last.kind === "any") out[out.length - 1] = { ...last, terms: [...last.terms, term], span };
      else if (last.kind === "term") out[out.length - 1] = { kind: "any", terms: [last.term, term], span };
    } else {
      out.push({ kind: "term", term, span: [from, tok.end] });
      lastPositive = true;
    }
    negate = false;
    or = false;
  }
  return out;
}

export function serializeClauses(clauses: QueryClause[]): string {
  return clauses
    .map((c) =>
      c.kind === "term"
        ? c.term.raw
        : c.kind === "not"
          ? `NOT ${c.term.raw}`
          : c.terms.map((t) => t.raw).join(" OR "),
    )
    .join(" ");
}

/** What a clause means, for comparing two readings of a query. */
const meaning = (clauses: QueryClause[]) => clauses.map(clauseLabel).join("\u0000");

/** Cut `[a, b)` out of `query` and close the gap to one space. */
const cut = (query: string, a: number, b: number) =>
  `${query.slice(0, a).trimEnd()} ${query.slice(b).trimStart()}`.trim();

/** The query without clause `index`: that clause's text (and the operators
 *  before it) is cut out and everything else stays as typed. When the cut
 *  would change what a neighbour means (`a NOT b OR c` without `NOT b` reads
 *  `a OR c`), the neighbour's leading operators go too; only if that still
 *  differs is the query written out from its clauses. */
export function withoutClause(query: string, index: number): string {
  const clauses = parseClauses(query);
  const target = clauses[index];
  if (!target) return query;
  const rest = clauses.filter((_, i) => i !== index);
  const expected = meaning(rest);
  const [a, b] = target.span;
  const tries = [cut(query, a, b)];
  const next = clauses[index + 1];
  if (next) tries.push(cut(query, a, next.span[0] + leadingOps(query.slice(next.span[0]))));
  for (const t of tries) {
    const clean = stripLeadingOps(t);
    if (meaning(parseClauses(clean)) === expected) return clean;
  }
  return serializeClauses(rest);
}

/** Length of the operator words (and spaces) a string starts with. */
function leadingOps(s: string): number {
  const m = /^\s*(?:(?:AND|OR|NOT)\s+)*/.exec(s);
  // Keep `NOT`: it is part of an exclusion, not a joint.
  const ops = m ? m[0] : "";
  const keepNot = ops.lastIndexOf("NOT");
  return keepNot >= 0 ? keepNot : ops.length;
}

/** A query no longer opens with `AND` / `OR`, which join nothing there. */
const stripLeadingOps = (s: string) => s.replace(/^(?:(?:AND|OR)\s+)+/, "");

/** A query no longer ends in an operator waiting for its term, and an unclosed
 *  phrase is closed, so whatever is appended reads as its own clause. */
function readyToAppend(query: string): string {
  let q = query.trim().replace(/(?:\s+(?:AND|OR|NOT))+$/, "");
  if (/^(?:AND|OR|NOT)$/.test(q)) q = "";
  const quotes = (q.match(/"/g) ?? []).length;
  return quotes % 2 ? `${q}"` : q;
}

/** What a builder input adds to the query, or "" when the input holds nothing.
 *  - `phrase`: the whole input as one exact phrase (its own quotes dropped);
 *  - `any`: each word or quoted phrase, joined by `OR`;
 *  - `not`: each word or quoted phrase, excluded. */
export type ClauseKind = "phrase" | "any" | "not";

export function clauseText(kind: ClauseKind, input: string): string {
  if (kind === "phrase") {
    const text = input.replace(/"/g, " ").replace(/\s+/g, " ").trim();
    return text ? `"${text}"` : "";
  }
  const terms = tokenizeQuery(input)
    .filter((t) => t.kind !== "op")
    .map((t) => (t.kind === "phrase" ? `"${t.value}"` : t.value));
  if (kind === "any") return terms.join(" OR ");
  return terms.map((t) => `NOT ${t}`).join(" ");
}

/** The query with a builder clause appended. A trailing `OR` / `NOT` / `AND`
 *  the user left waiting for a term is dropped first, so it does not bind the
 *  new clause, and an unclosed phrase is closed. An `any` clause after a bare
 *  term would join that term's OR group, so it is set apart with an explicit
 *  `AND`. */
export function appendClause(query: string, kind: ClauseKind, input: string): string {
  const add = clauseText(kind, input);
  if (!add) return query;
  const base = readyToAppend(query);
  if (!base) return add;
  return kind === "any" ? `${base} AND ${add}` : `${base} ${add}`;
}

/** The label a chip prints, and the name its × reads out. */
export function clauseLabel(c: QueryClause): string {
  const show = (t: ClauseTerm) => (t.phrase ? `“${t.text}”` : t.text);
  if (c.kind === "term") return c.term.phrase ? `Exact: ${show(c.term)}` : show(c.term);
  if (c.kind === "not") return `Exclude: ${show(c.term)}`;
  return `Any of: ${c.terms.map(show).join(", ")}`;
}
