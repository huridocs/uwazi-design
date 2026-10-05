import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { typeHasDocument, getEntityProfile } from "../data/entityProfiles";
import { renditionsByLanguage } from "../data/documentRenditions";
import { documentsByLanguage } from "../data/document";
import { cejilLoaded, cejilFullText } from "../data/cejil/load";
import { cejilRenderedDoc, type BorrowedDoc } from "../data/cejil/profile";
import { nepalLoaded, nepalPrimaryDoc } from "../data/nepal/load";
import { nepalDocFileId } from "../data/nepal/profile";
import { highlightTerms, fold, foldWithMap, parseSearchQuery, termHit, termIn } from "./queryTokens";

/** Builds Uwazi's per-entity search-snippets shape (`SnippetsSearchResponse`:
 *  `{ count, metadata: [{ field, texts[] }], fullText: [{ page, text }] }`) from local data.
 *
 *  Matching uses the same terms as the Library filter and `HighlightedText`
 *  (`parseSearchQuery` / `highlightTerms` in `utils/queryTokens.ts`), case- and
 *  diacritic-insensitive, so an entity that passes the filter always gets a snippet.
 *  Excerpts are plain text; `HighlightedText` re-derives the marks, so nothing
 *  uses `dangerouslySetInnerHTML`. Only CEJIL snippets carry a page: the mock
 *  corpus's shared rendition is not page-mapped, so its snippets get `page: null`. */

export interface MetadataSnippet {
  /** Field label ("Title", or an adapter-localized `entity.fields[].label`). */
  field: string;
  /** Stable key (not the localized label) for deep-focus, matched against the
   *  drawer's `MetadataField.id`. See `entitySearchFields` for how it is chosen. */
  fieldKey: string;
  /** One windowed excerpt per matched field (around the first hit). */
  texts: string[];
  /** Query occurrences and AND groups met: the same two numbers a page carries,
   *  so fields and pages rank on one scale (`compareEvidence`). */
  hits: number;
  groupsMet: number;
}

export interface FullTextSnippet {
  /** 1-based page in the open file, or `null` when the text is not page-mapped
   *  (see `documentPages`). A null page renders no "p.N" tag and no jump. */
  page: number | null;
  text: string;
  /** Query occurrences on this page; the spine draws a counted ring when > 1. */
  hits: number;
  /** Distinct query terms on this page. Ranking uses `groupsMet`, not this. */
  termsHit: number;
  /** AND groups this page satisfies; the first key of `compareEvidence`. */
  groupsMet: number;
}

/** Ranks a passage by AND groups met, then occurrences. Every surface that orders
 *  evidence (`buildSnippetsFor`, the Passages layout, the Spine) uses this one
 *  comparator so they agree. Returns 0 on a tie so a stable sort keeps caller order. */
export function compareEvidence(
  a: { groupsMet: number; hits: number },
  b: { groupsMet: number; hits: number },
): number {
  return b.groupsMet - a.groupsMet || b.hits - a.hits;
}

/** Where one query term matched an entity. `term` is the folded token
 *  (`highlightTerms`: lowercase, accents stripped, a quoted phrase as one unit). */
export interface TermHit {
  term: string;
  title: boolean;
  /** The term hit a non-title metadata field. */
  properties: boolean;
  /** Occurrences on every matched page of the document, not only the excerpted
   *  ones. 0 = not in the document. */
  documentHits: number;
}

export type { BorrowedDoc };

export interface EntitySnippets {
  /** The connected document these passages come from when the entity does not
   *  own the file the viewer renders (a Causa reading its Sentencia). Null for an
   *  own document and for the mock corpus. Set even when `fullText` is empty. */
  borrowedFrom: BorrowedDoc | null;
  /** Which text the passages were cut from: a CEJIL file `_id`, a stand-in
   *  filename, or the mock rendition. `docKey` + page identifies a passage
   *  across results. Null with no document. */
  docKey: string | null;
  /** Metadata groups plus every matched page, not `fullText.length`, so a card
   *  can say "5 of 23" when excerpts are capped by `MAX_FULLTEXT`. */
  count: number;
  metadata: MetadataSnippet[];
  /** The excerpts built, at most `maxFullText`. */
  fullText: FullTextSnippet[];
  /** Matched pages in total; greater than `fullText.length` when excerpts were capped. */
  fullTextTotal: number;
  /** Query occurrences summed over every matched page. */
  fullTextHits: number;
  /** One entry per distinct query term, in query order. */
  termsHit: TermHit[];
}

/** Count badge: matched pages as "passages" when the document matched, else
 *  matched fields. Fields and pages are not summed, since they are different units.
 *  The title is excluded because Results layouts drop its snippet; a title-only
 *  match reads "title match". */
export function evidenceBadge(s: EntitySnippets): { count: number; unit: string } {
  if (s.fullTextTotal > 0) {
    return { count: s.fullTextTotal, unit: s.fullTextTotal === 1 ? "passage" : "passages" };
  }
  const n = s.metadata.filter((m) => m.fieldKey !== "title").length;
  if (n === 0) return { count: 1, unit: "title match" };
  return { count: n, unit: n === 1 ? "field" : "fields" };
}

/** Words of context on each side of a hit: the minimum, used by narrow columns. */
const CONTEXT_WORDS = 6;

/** Words of context for a column `px` wide with `lines` for the excerpt. Wider
 *  columns get more context so results quoting the same sentence stay distinguishable.
 *  `CH` is the measured average character width of the row's 14px sans; the match
 *  takes ~12 characters. The 40-word cap keeps excerpts short, not for performance. */
const CH = 7.2;
export function contextWordsFor(px: number, lines = 1): number {
  if (!px) return CONTEXT_WORDS;
  const chars = (px / CH) * lines;
  const perSide = (chars - 12) / 2;
  // ~6 characters a word, space included.
  return Math.max(CONTEXT_WORDS, Math.min(40, Math.round(perSide / 6)));
}
/** Full-text excerpts a card shows before "Show all". Caps rendering only;
 *  `fullTextTotal` still counts every page. */
export const MAX_FULLTEXT = 5;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The searchable metadata fields of an entity, in display order, each with a
 *  stable key for deep-focus. Adapter entities (CEJIL) use the template property
 *  name as `key`, else a label slug; mock entities use their profile field ids.
 *
 *  This is the single definition of an entity's searchable text: `buildSearchIndex`
 *  concatenates exactly this, so filter matches and snippets always agree. */
export function entitySearchFields(
  e: Entity,
  language: Language,
): { field: string; fieldKey: string; text: string }[] {
  const out = [{ field: "Title", fieldKey: "title", text: e.title }];
  if (e.country) out.push({ field: "Country", fieldKey: "country", text: e.country });
  // Prefer `searchFields` (the full projection) over `fields` (the card summary,
  // truncated to three fields), or later properties and values are unsearchable.
  const adapterFields = e.searchFields ?? e.fields;
  if (adapterFields?.length) {
    for (const f of adapterFields) {
      // Template property name first: it matches the record cards'
      // `data-field-key`/`data-field-keys`, so a Results click lands on the right card.
      if (f.value) out.push({ field: f.label, fieldKey: f.key ?? slug(f.label), text: f.value });
    }
  } else {
    for (const f of getEntityProfile(e.id).metadata[language] ?? []) {
      if (f.type !== "relationship" && f.value) {
        out.push({ field: f.label, fieldKey: f.id, text: f.value });
      }
    }
  }
  if (e.descriptors?.length) {
    out.push({ field: "Descriptors", fieldKey: "descriptors", text: e.descriptors.join(", ") });
  }
  return out;
}

export interface FoldedField {
  field: string;
  fieldKey: string;
  /** Original text — what excerpts are cut from (accents and case intact). */
  text: string;
  /** `fold(text)`, computed once per entity+language for the life of the object. */
  folded: string;
}

/** `entitySearchFields` with every value pre-folded, memoised per entity.
 *  `matchCategories` runs thousands of times per keystroke, so folding must not repeat.
 *  Keyed by entity object in a WeakMap: an edited entity is a new object, so
 *  nothing needs invalidating and dropped entities are not retained. */
const foldedFieldsCache = new WeakMap<Entity, Map<Language, FoldedField[]>>();
function foldedFields(e: Entity, language: Language): FoldedField[] {
  let byLang = foldedFieldsCache.get(e);
  if (!byLang) {
    byLang = new Map();
    foldedFieldsCache.set(e, byLang);
  }
  let cached = byLang.get(language);
  if (!cached) {
    cached = entitySearchFields(e, language).map((f) => ({ ...f, folded: fold(f.text) }));
    byLang.set(language, cached);
  }
  return cached;
}

/** How many times `needle` (already folded, possibly a glob) occurs in `lowerText`. */
function countOccurrences(lowerText: string, needle: string): number {
  let n = 0;
  let from = 0;
  for (;;) {
    const hit = termHit(lowerText, needle, from);
    if (!hit) break;
    n++;
    from = hit[1];
  }
  return n;
}

/** A ~`2·ctx`-word window around the match at `[idx, idx+len)` in `text`,
 *  whitespace collapsed to a single line, with `…` on any clipped side. */
function windowAround(text: string, idx: number, len: number, ctx: number): string {
  const matchEnd = idx + len;
  const words = [...text.matchAll(/\S+/g)].map((m) => {
    const start = m.index ?? 0;
    return { start, end: start + m[0].length };
  });
  if (words.length === 0) return text.trim();

  let first = words.findIndex((w) => w.end > idx);
  if (first < 0) first = words.length - 1;
  const afterMatch = words.findIndex((w) => w.start >= matchEnd);
  const last = afterMatch < 0 ? words.length - 1 : Math.max(first, afterMatch - 1);

  const a = Math.max(0, first - ctx);
  const b = Math.min(words.length - 1, last + ctx);
  const body = text.slice(words[a].start, words[b].end).trim().replace(/\s+/g, " ");
  const prefix = a > 0 ? "… " : "";
  const suffix = b < words.length - 1 ? " …" : "";
  return `${prefix}${body}${suffix}`;
}

/** Map a folded-text match span back to the original string's indices, so the
 *  window is cut from the accented/cased source even though matching was folded. */
function originalSpan(
  /** `ArrayLike` so an `Int32Array` map works as well as a `number[]`. */
  map: ArrayLike<number>,
  textLength: number,
  from: number,
  to: number,
): { start: number; len: number } {
  const start = map[from] ?? 0;
  const end = to < map.length ? map[to] : textLength;
  return { start, len: Math.max(1, end - start) };
}

/** A window around the first occurrence of `needle`, matched case- AND
 *  diacritic-insensitively. Returns null if it isn't found. */
export function excerptAround(
  text: string,
  needle: string,
  ctx: number = CONTEXT_WORDS,
): string | null {
  const { folded, map } = foldWithMap(text);
  const f = fold(needle);
  const i = folded.indexOf(f);
  if (i < 0) return null;
  const { start, len } = originalSpan(map, text.length, i, i + f.length);
  return windowAround(text, start, len, ctx);
}

/** A window around the earliest occurrence of any of `terms` (already folded). */
function excerptAroundTerms(
  text: string,
  terms: string[],
  ctx: number = CONTEXT_WORDS,
  /** A cached `foldWithMap(text)` (see `pageFoldWithMap`). Must be the fold of
   *  `text` itself, or the window is cut at another string's indices. */
  pre?: { folded: string; map: ArrayLike<number> },
): string | null {
  const { folded, map } = pre ?? foldWithMap(text);
  let best = -1;
  let bestEnd = 0;
  for (const t of terms) {
    const hit = termHit(folded, t);
    if (hit && (best < 0 || hit[0] < best)) {
      [best, bestEnd] = hit;
    }
  }
  if (best < 0) return null;
  const { start, len } = originalSpan(map, text.length, best, bestEnd);
  return windowAround(text, start, len, ctx);
}

/** The document's text split for excerpting, and whether the splits are real pages.
 *   - CEJIL (`paged: true`): real per-page text, so index + 1 is the viewer's page.
 *   - mock (`paged: false`): one shared Velásquez rendition, not page-mapped. It is
 *     chunked so excerpts spread across the document, but chunks get no page or jump.
 */
interface DocPages {
  pages: string[];
  paged: boolean;
  /** The connected entity this document was borrowed from (see `cejilRenderedDoc`).
   *  Null when the entity owns its file, and always null for the mock corpus, whose
   *  shared rendition has no connected document entity to name. */
  borrowedFrom: BorrowedDoc | null;
  /** See `EntitySnippets.docKey`. */
  docKey: string | null;
  /** The file `_id` the pages were cut from (CEJIL only; see `cejilRenderedDoc`). */
  fileId: string | null;
}

/** No document. A single shared instance, so the page-keyed caches below don't
 *  add an entry per document-less entity. */
const NO_PAGES: DocPages = { pages: [], paged: false, borrowedFrom: null, docKey: null, fileId: null };

/** Mock pages, chunked once per language. Every mock entity shares one page
 *  array, which is the identity the fold caches below key on. */
const mockPagesCache = new Map<Language, DocPages>();

/** `documentPages`, memoised per entity. On CEJIL, `cejilRenderedDoc` may walk
 *  the entity's relationships to borrow a Sentencia, and a País hub has thousands. */
const docPagesCache = new Map<string, DocPages>();

function documentPages(e: Entity, language: Language, source: DataSource): DocPages {
  switch (source) {
    case "cejil": {
      // Don't cache before the corpus loads: the empty result would outlive the
      // load and disable full-text search.
      if (!cejilLoaded()) return NO_PAGES;
      const key = `cejil:${e.id}`;
      let hit = docPagesCache.get(key);
      if (!hit) {
        const { pages, borrowedFrom, docKey, fileId } = cejilRenderedDoc(e.id);
        // Entities that borrow the same file get the same array instance, so the
        // per-document fold caches are shared across them.
        hit = pages.length ? { pages, paged: true, borrowedFrom, docKey, fileId } : NO_PAGES;
        docPagesCache.set(key, hit);
      }
      return hit;
    }
    case "nepal": {
      // The bundled PDFs' OCR text, page by page: real pages, so a passage
      // jumps. Most records have no document.
      if (!nepalLoaded()) return NO_PAGES;
      const key = `nepal:${e.id}`;
      let hit = docPagesCache.get(key);
      if (!hit) {
        const doc = nepalPrimaryDoc(e.id);
        // A source and the action it records share one document, and so one
        // page array: the fold caches below are shared between them.
        hit = doc ? { pages: doc.text, paged: true, borrowedFrom: null, docKey: doc.id, fileId: nepalDocFileId(doc.id) } : NO_PAGES;
        docPagesCache.set(key, hit);
      }
      return hit;
    }
    case "artworks":
    case "travesia":
      // No document bodies — nothing for full-text search to scan.
      return NO_PAGES;
    case "mock": {
      if (!typeHasDocument(e.typeId)) return NO_PAGES;
      let hit = mockPagesCache.get(language);
      if (!hit) {
        const rendition = renditionsByLanguage[language] ?? renditionsByLanguage.EN;
        const pageCount = (documentsByLanguage[language] ?? documentsByLanguage.EN).pages;
        hit = {
          pages: paginate(rendition.plainText, pageCount),
          paged: false,
          borrowedFrom: null,
          docKey: `mock-rendition:${language}`,
          fileId: null,
        };
        mockPagesCache.set(language, hit);
      }
      return hit;
    }
    default: {
      const _exhaustive: never = source;
      void _exhaustive;
      return NO_PAGES;
    }
  }
}

/** Every page of a document, folded, keyed by the page array rather than the entity.
 *  Thousands of CEJIL entities borrow the same few documents, so per-entity folding
 *  repeated the same work on every keystroke. A WeakMap on the array means a
 *  reloaded corpus's new arrays miss the cache and nothing needs invalidating. */
const foldedPagesCache = new WeakMap<string[], string[]>();
function foldedPages(pages: string[]): string[] {
  let folded = foldedPagesCache.get(pages);
  if (!folded) {
    folded = pages.map(fold);
    foldedPagesCache.set(pages, folded);
  }
  return folded;
}

/** `foldWithMap` for one document page, built lazily and cached. The folded-to-
 *  original index map is the most expensive fold, needed only to slice excerpts
 *  from the original text. Sparse on purpose: only excerpted pages build a map. */
const pageFoldMapCache = new WeakMap<string[], ({ folded: string; map: ArrayLike<number> } | undefined)[]>();
function pageFoldWithMap(pages: string[], i: number): { folded: string; map: ArrayLike<number> } {
  let byPage = pageFoldMapCache.get(pages);
  if (!byPage) {
    byPage = new Array(pages.length);
    pageFoldMapCache.set(pages, byPage);
  }
  let hit = byPage[i];
  if (!hit) {
    hit = foldWithMap(pages[i]);
    byPage[i] = hit;
  }
  return hit;
}

/** One document's folded pages, computed off the main thread; `folded[i]` is
 *  `fold(pages[i])`. Folds only, no index maps: maps are needed just for excerpted
 *  pages, and priming them for every page held ~20MB of `Int32Array`.
 *  `pageFoldWithMap` builds them lazily. */
export interface DocumentFolds {
  folded: string[];
}

/** Installs folds computed by `searchScan.worker.ts` into the caches above, so the
 *  query path stays synchronous and every surface keeps using `buildSnippetsFor`.
 *  Keys are whatever `cejilFullText()` keys by (file `_id` or legacy filename, see
 *  `docPagesOf`). Before the corpus loads, or for an unknown key, this is a no-op
 *  and the main thread folds lazily. Idempotent. */
export function primeDocumentFolds(byDocKey: Record<string, DocumentFolds>): void {
  if (!cejilLoaded()) return;
  const byKey = cejilFullText();
  for (const [key, { folded }] of Object.entries(byDocKey)) {
    const pages = byKey[key];
    // A page-count mismatch means the corpus changed under the worker; skip it
    // rather than pair page i with another page's fold.
    if (!pages || pages.length !== folded.length) continue;
    foldedPagesCache.set(pages, folded);
    // Not `pageFoldMapCache`: index maps stay lazy (see `DocumentFolds`).
    blobByPages.set(pages, folded.join("\n"));
  }
}

/** Evenly bucket a text's paragraphs into `pageCount` pages by cumulative
 *  length. Approximate — good enough to give the mock rendition page numbers. */
function paginate(text: string, pageCount: number): string[] {
  const paras = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (pageCount <= 1 || paras.length <= 1) return [text];

  const target = text.length / pageCount;
  const pages: string[] = [];
  let cur: string[] = [];
  let curLen = 0;
  for (const p of paras) {
    cur.push(p);
    curLen += p.length + 1;
    if (curLen >= target && pages.length < pageCount - 1) {
      pages.push(cur.join("\n"));
      cur = [];
      curLen = 0;
    }
  }
  if (cur.length) pages.push(cur.join("\n"));
  return pages;
}

/** The file a passage's page number refers to: the one its text was cut from.
 *  Null for the mock corpus or with no document. A page jump opens this file, which
 *  for a CEJIL entity can differ from the one the reading language would pick. */
export function passageFileId(e: Entity, language: Language, source: DataSource): string | null {
  return documentPages(e, language, source).fileId;
}

/** Build the snippet response for one entity against query `q`, using the same
 *  terms the filter and `HighlightedText` use. A termless query yields `count: 0`.
 *
 *  `perPassage` applies the full boolean query to each field or page (the entity
 *  drawer's Search tab); otherwise the entity is already gated by `matchesSearch`
 *  and any term hit counts.
 *
 *  Every page is scanned; `maxFullText` caps only the excerpts built, so
 *  `fullTextTotal` stays exact (pass `Infinity` for Show all). `order: "best"`
 *  excerpts pages by `compareEvidence` then page order; `"page"` keeps reading order. */
export function buildSnippetsFor(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
  {
    maxFullText = MAX_FULLTEXT,
    contextWords = CONTEXT_WORDS,
    perPassage = false,
    order = "best",
  }: {
    maxFullText?: number;
    contextWords?: number;
    perPassage?: boolean;
    order?: "best" | "page";
  } = {},
): EntitySnippets {
  const terms = highlightTerms(q); // already folded (lowercase + de-accented)
  const { groups, exclude } = parseSearchQuery(q);
  /** Does this (folded) passage belong in the results? */
  const passes = perPassage
    ? (text: string) =>
        groups.every((g) => g.some((t) => termIn(text, t))) &&
        !exclude.some((t) => termIn(text, t))
    : (text: string) => terms.some((t) => termIn(text, t));
  const metadata: MetadataSnippet[] = [];
  const fullText: FullTextSnippet[] = [];
  if (terms.length === 0) {
    return {
      count: 0,
      metadata,
      fullText,
      fullTextTotal: 0,
      fullTextHits: 0,
      termsHit: [],
      borrowedFrom: null,
      docKey: null,
    };
  }
  // Distinct terms only: `a b OR a` flattens to [a, b, a], which would double-count `a`.
  const uniqueTerms = [...new Set(terms)];
  const termsHit: TermHit[] = uniqueTerms.map((term) => ({
    term,
    title: false,
    properties: false,
    documentHits: 0,
  }));

  // `foldedFields`, not `entitySearchFields`: reuses the memoised fold shared with
  // `matchCategoriesWithTerms`.
  for (const { field, fieldKey, text, folded } of foldedFields(entity, language)) {
    if (!passes(folded)) continue;
    let fieldHits = 0;
    const inField = new Set<string>();
    for (const th of termsHit) {
      const n = countOccurrences(folded, th.term);
      if (n === 0) continue;
      fieldHits += n;
      inField.add(th.term);
      if (fieldKey === "title") th.title = true;
      else th.properties = true;
    }
    const excerpt = excerptAroundTerms(text, terms, contextWords);
    if (excerpt) {
      metadata.push({
        field,
        fieldKey,
        texts: [excerpt],
        hits: Math.max(1, fieldHits),
        groupsMet: groups.reduce((n, g) => (g.some((t) => inField.has(t)) ? n + 1 : n), 0),
      });
    }
  }

  const { pages, paged, borrowedFrom, docKey } = documentPages(entity, language, source);
  // No early break at the cap: every page is counted so `fullTextTotal` is exact.
  // The folds are cached and shared with the filter, so this adds no second scan.
  let fullTextHits = 0;
  // Every matching page, in page order, with the counts the ranking needs.
  const matched: { i: number; hits: number; termsHit: number; groupsMet: number }[] = [];
  const onPage = new Set<string>();
  const lowerPages = foldedPages(pages);
  for (let i = 0; i < pages.length; i++) {
    const lower = lowerPages[i];
    if (!passes(lower)) continue;
    let hits = 0;
    onPage.clear();
    for (const th of termsHit) {
      const n = countOccurrences(lower, th.term);
      if (n === 0) continue;
      hits += n;
      onPage.add(th.term);
      th.documentHits += n;
    }
    if (hits === 0) continue;
    fullTextHits += hits;
    // Rank on AND groups met, not distinct terms: for `a OR b c`, a page with a
    // and b would otherwise tie a page with a and c, which meets the AND.
    const groupsMet = groups.reduce((n, g) => (g.some((t) => onPage.has(t)) ? n + 1 : n), 0);
    matched.push({ i, hits, termsHit: onPage.size, groupsMet });
  }
  if (order === "best") {
    matched.sort((a, b) => compareEvidence(a, b) || a.i - b.i);
  }
  for (const m of matched) {
    if (fullText.length >= maxFullText) break;
    const excerpt = excerptAroundTerms(pages[m.i], terms, contextWords, pageFoldWithMap(pages, m.i));
    if (excerpt) {
      fullText.push({
        page: paged ? m.i + 1 : null,
        text: excerpt,
        hits: m.hits,
        termsHit: m.termsHit,
        groupsMet: m.groupsMet,
      });
    }
  }
  const fullTextTotal = matched.length;

  return {
    count: metadata.length + fullTextTotal,
    metadata,
    fullText,
    fullTextTotal,
    fullTextHits,
    termsHit,
    borrowedFrom,
    docKey,
  };
}

export interface MatchCategories {
  /** The query hit the entity's title. */
  title: boolean;
  /** The query hit a non-title metadata field (country / adapter / profile). */
  properties: boolean;
  /** The query hit the entity's document body. */
  document: boolean;
}

const NO_MATCH: MatchCategories = { title: false, properties: false, document: false };

/** Where a query matched an entity, given already-tokenized terms. Callers that
 *  loop over the corpus parse the query once and pass the terms in. */
export function matchCategoriesWithTerms(
  entity: Entity,
  terms: string[],
  language: Language,
  source: DataSource,
): MatchCategories {
  if (terms.length === 0) return NO_MATCH;

  let title = false;
  let properties = false;
  for (const f of foldedFields(entity, language)) {
    if (!terms.some((t) => termIn(f.folded, t))) continue;
    if (f.fieldKey === "title") title = true;
    else properties = true;
    if (title && properties) break;
  }
  const blob = entityFullTextBlob(entity, language, source);
  const document = terms.some((t) => termIn(blob, t));

  return { title, properties, document };
}

/** Where a query matched an entity, for the Results match-type chips. Uses the
 *  same sources as the filter and snippets. In a corpus loop, use `matchCategoriesWithTerms`. */
export function matchCategories(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
): MatchCategories {
  return matchCategoriesWithTerms(entity, highlightTerms(q), language, source);
}

/** Where a query matched an entity outside what the row already shows, for the
 *  row's match marker. `visibleFieldKeys` are the fields the row renders with marks
 *  (list: `title`, plus `country` when shown; spine: `title`). Returns only the first
 *  hidden property and a count of the rest; the drawer's Results card lists them all.
 *  Full text is gated on `q.length ≥ 3`, like the filter's `fullTextSearch`, so the
 *  marker never claims a body hit the filter did not make. */
export interface HiddenMatchOrigin {
  /** First matched metadata field the row doesn't already display. */
  property: { field: string; fieldKey: string } | null;
  /** Further hidden property fields beyond `property`. */
  moreProperties: number;
  /** The query hit the document body. */
  document: boolean;
}

export function hiddenMatchOrigin(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
  visibleFieldKeys: readonly string[],
): HiddenMatchOrigin {
  const empty: HiddenMatchOrigin = { property: null, moreProperties: 0, document: false };
  const terms = highlightTerms(q); // already folded
  if (terms.length === 0) return empty;

  const visible = new Set(visibleFieldKeys);
  let property: HiddenMatchOrigin["property"] = null;
  let moreProperties = 0;
  // `foldedFields`, not `entitySearchFields` + `fold`: this runs for every
  // rendered row on every keystroke.
  for (const f of foldedFields(entity, language)) {
    if (visible.has(f.fieldKey)) continue;
    if (!terms.some((t) => termIn(f.folded, t))) continue;
    if (property) moreProperties++;
    else property = { field: f.field, fieldKey: f.fieldKey };
  }

  const document =
    q.trim().length >= 3 &&
    (() => {
      const blob = entityFullTextBlob(entity, language, source);
      return terms.some((t) => termIn(blob, t));
    })();

  return { property, moreProperties, document };
}

/** Folded full-text blob per document (keyed by page array, not entity), scanned
 *  by the Library filter and shared with `buildSnippetsFor` via `foldedPages`.
 *  A CEJIL entity queried before load gets "" uncached, so text appears once
 *  `cejilReady` flips. Joining folded pages equals folding joined pages: `fold` is
 *  per-character except Greek final sigma, and "\n" is a word boundary either way. */
const blobByPages = new WeakMap<string[], string>();
/** What a ranker needs, read from the caches the filter and snippets already fill:
 *  folded fields (title included), the page array (a cache key shared by every
 *  entity borrowing that document), the folded blob, and whether it is borrowed. */
export function entitySearchParts(
  entity: Entity,
  language: Language,
  source: DataSource,
): { fields: FoldedField[]; pages: string[]; blob: string; borrowed: boolean } {
  const doc = documentPages(entity, language, source);
  return {
    fields: foldedFields(entity, language),
    pages: doc.pages,
    blob: entityFullTextBlob(entity, language, source),
    borrowed: doc.borrowedFrom != null,
  };
}

export function entityFullTextBlob(
  entity: Entity,
  language: Language,
  source: DataSource,
): string {
  const { pages } = documentPages(entity, language, source);
  if (pages.length === 0) return "";
  let blob = blobByPages.get(pages);
  if (blob === undefined) {
    blob = foldedPages(pages).join("\n");
    blobByPages.set(pages, blob);
  }
  return blob;
}
