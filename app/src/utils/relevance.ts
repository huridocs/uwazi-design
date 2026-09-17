import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { entitySearchParts } from "./librarySnippets";
import { termHit } from "./queryTokens";

/** Relevance for Library results: how well an entity answers the query.
 *
 *  It reads only what the search path has already built — the folded fields
 *  (`foldedFields`), the document's folded blob (`entityFullTextBlob`) and the
 *  connection counts `LibraryView` already holds — so ranking adds no pass over
 *  data the filter didn't touch. The one new piece of work, counting a term's
 *  occurrences in a document body, is cached per DOCUMENT (the page array's
 *  identity): CEJIL's 3,140 doc-bearing entities read ~30 distinct documents, so
 *  a query counts each of those once however many entities borrow it.
 *
 *  The score, largest part first:
 *   1. EXACT TITLE — the folded title is the query: +1000. The old tier's first
 *      rule, kept: the entity literally named what you typed comes first. A title
 *      that STARTS with the query +150, one that contains it as a run +60.
 *   2. COVERAGE — 100 per query term the entity hits anywhere. It outweighs any
 *      amount of repetition, so matching 3 of 3 terms beats matching 1 term ten
 *      times. (Under implicit AND every result hits every term; coverage decides
 *      between results of an OR.)
 *   3. PER TERM, the best field it hits in, plus a fifth of the others:
 *      field weight × (1 + log2 of its hit count), halved when no hit in that
 *      field is a whole word. Weights: title 12, property 5, the entity's own
 *      document 2, a BORROWED document 0.4 — thousands of CEJIL entities read one
 *      of a handful of stand-in judgments, so a body hit there says almost
 *      nothing about the entity itself.
 *   4. TIE-BREAKERS, under a point together, so they only order results the
 *      query already rates the same: connections (≤ 0.5) and recency (≤ 0.4).
 *      Entity type breaks exact ties in the caller's comparator. */

const EXACT_TITLE = 1000;
const TITLE_PREFIX = 150;
const TITLE_RUN = 60;
const PER_TERM_COVERAGE = 100;
const WEIGHT = { title: 12, property: 5, body: 2, borrowedBody: 0.4 } as const;
const MID_WORD = 0.5;
const SECONDARY_FIELDS = 0.2;
/** Stop counting a term in one text past this — log2 has flattened by then. */
const COUNT_CAP = 64;

export interface RelevanceBreakdown {
  score: number;
  /** Positive terms hit anywhere, of `terms`. */
  covered: number;
  terms: number;
  exactTitle: boolean;
  /** Best field per hit term, for reading a ranking by eye. */
  fields: string[];
}

interface Hits {
  count: number;
  whole: boolean;
}

const WORD = /[\p{L}\p{N}]/u;
const isWordChar = (ch: string | undefined) => !!ch && WORD.test(ch);

/** Occurrences of `term` in folded `text` (capped), and whether any is a whole word. */
function countHits(text: string, term: string): Hits {
  let count = 0;
  let whole = false;
  let from = 0;
  while (count < COUNT_CAP) {
    const hit = termHit(text, term, from);
    if (!hit) break;
    count++;
    if (!whole && !isWordChar(text[hit[0] - 1]) && !isWordChar(text[hit[1]])) whole = true;
    from = hit[1] > hit[0] ? hit[1] : hit[0] + 1;
  }
  return { count, whole };
}

/** Body hits per document per term. Keyed by the page array, which is shared by
 *  every entity reading that document and dropped with it. */
const bodyHitsCache = new WeakMap<string[], Map<string, Hits>>();
function bodyHits(pages: string[], blob: string, term: string): Hits {
  let byTerm = bodyHitsCache.get(pages);
  if (!byTerm) {
    byTerm = new Map();
    bodyHitsCache.set(pages, byTerm);
  }
  let hits = byTerm.get(term);
  if (!hits) {
    hits = countHits(blob, term);
    byTerm.set(term, hits);
  }
  return hits;
}

const fieldScore = (weight: number, h: Hits) =>
  h.count === 0 ? 0 : weight * (1 + Math.log2(h.count)) * (h.whole ? 1 : MID_WORD);

export interface RelevanceQuery {
  /** Positive terms, folded (`highlightTerms`). */
  terms: string[];
  /** The query's terms as one run, folded — what an exact title equals. */
  phrase: string;
}

export function scoreRelevance(
  entity: Entity,
  query: RelevanceQuery,
  language: Language,
  source: DataSource,
  connections: number,
  maxConnections: number,
): RelevanceBreakdown {
  const { fields, pages, blob, borrowed } = entitySearchParts(entity, language, source);
  const title = fields.find((f) => f.fieldKey === "title")?.folded ?? "";
  const terms = [...new Set(query.terms)];

  let score = 0;
  const exactTitle = !!query.phrase && title === query.phrase;
  if (exactTitle) score += EXACT_TITLE;
  else if (query.phrase && title.startsWith(query.phrase)) score += TITLE_PREFIX;
  else if (terms.length > 1 && query.phrase && title.includes(query.phrase)) score += TITLE_RUN;

  let covered = 0;
  const best: string[] = [];
  for (const term of terms) {
    const inTitle = fieldScore(WEIGHT.title, countHits(title, term));
    let propHits: Hits = { count: 0, whole: false };
    for (const f of fields) {
      if (f.fieldKey === "title") continue;
      const h = countHits(f.folded, term);
      propHits = { count: propHits.count + h.count, whole: propHits.whole || h.whole };
    }
    const inProps = fieldScore(WEIGHT.property, propHits);
    const inBody = blob
      ? fieldScore(borrowed ? WEIGHT.borrowedBody : WEIGHT.body, bodyHits(pages, blob, term))
      : 0;

    const parts = [inTitle, inProps, inBody];
    const top = Math.max(...parts);
    if (top === 0) continue;
    covered++;
    best.push(top === inTitle ? "title" : top === inProps ? "property" : borrowed ? "borrowed body" : "body");
    score += PER_TERM_COVERAGE + top + SECONDARY_FIELDS * (inTitle + inProps + inBody - top);
  }

  // Tie-breakers: together under one point.
  if (maxConnections > 0) score += (0.5 * Math.log1p(connections)) / Math.log1p(maxConnections);
  const year = entity.createdAt ? Number(entity.createdAt.slice(0, 4)) : NaN;
  if (Number.isFinite(year)) score += 0.4 * Math.min(1, Math.max(0, (year - 1950) / 80));

  return { score, covered, terms: terms.length, exactTitle, fields: best };
}
