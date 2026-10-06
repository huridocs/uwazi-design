import { tokenizeQuery } from "./queryTokens";

/** A search query as the Adv. Search builder shows it: one clause per chip.
 *  Read with the same rules as `parseSearchQuery` (bare terms AND, `OR` joins
 *  the positive terms either side, `NOT` binds the one term after it), so a
 *  chip is exactly one of the query's AND groups or exclusions. Writing the
 *  clauses back gives a query that parses the same; an explicit `AND`, which
 *  means nothing the bare space doesn't, is not kept. */

export interface ClauseTerm {
  /** As typed in the query: a word, or a phrase in straight quotes. */
  raw: string;
  /** What the chip prints: the word, or the phrase without its quotes. */
  text: string;
  phrase: boolean;
}

export type QueryClause =
  | { kind: "term"; term: ClauseTerm }
  | { kind: "any"; terms: ClauseTerm[] }
  | { kind: "not"; term: ClauseTerm };

export function parseClauses(query: string): QueryClause[] {
  const out: QueryClause[] = [];
  let negate = false;
  let or = false;
  let lastPositive = false;
  for (const tok of tokenizeQuery(query)) {
    if (tok.kind === "op") {
      if (tok.value === "NOT") negate = true;
      else or = tok.value === "OR";
      continue;
    }
    const term: ClauseTerm =
      tok.kind === "phrase"
        ? { raw: `"${tok.value}"`, text: tok.value, phrase: true }
        : { raw: tok.value, text: tok.value, phrase: false };
    if (negate) {
      out.push({ kind: "not", term });
      lastPositive = false;
    } else if (or && lastPositive) {
      const last = out[out.length - 1];
      if (last.kind === "any") last.terms.push(term);
      else if (last.kind === "term") out[out.length - 1] = { kind: "any", terms: [last.term, term] };
    } else {
      out.push({ kind: "term", term });
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

/** The query without clause `index`. */
export function withoutClause(query: string, index: number): string {
  return serializeClauses(parseClauses(query).filter((_, i) => i !== index));
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

/** The query with a builder clause appended. An `any` clause after a bare
 *  term would join that term's OR group, so it is set apart with an explicit
 *  `AND`, which `serializeClauses` will drop again once nothing follows it. */
export function appendClause(query: string, kind: ClauseKind, input: string): string {
  const add = clauseText(kind, input);
  if (!add) return query;
  const base = query.trim();
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
