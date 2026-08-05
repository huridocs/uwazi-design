import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { typeHasDocument, getEntityProfile } from "../data/entityProfiles";
import { renditionsByLanguage } from "../data/documentRenditions";
import { documentsByLanguage } from "../data/document";
import { cejilLoaded, cejilFullText } from "../data/cejil/load";
import { cejilRenderedDoc, type BorrowedDoc } from "../data/cejil/profile";
import { highlightTerms, fold, foldWithMap } from "./queryTokens";

/** Synthesizes Uwazi's per-entity search-snippets shape from the data we already
 *  hold — no backend. Mirrors `SnippetsSearchResponse`
 *  (`{ count, metadata: [{ field, texts[] }], fullText: [{ page, text }] }`) so
 *  the Results-tab UI maps 1:1 onto what the real V2 sidepanel renders.
 *
 *  Matching is **per-token, case-insensitive** — the SAME tokens the left-pane
 *  filter ANDs (`highlightTerms` via `utils/queryTokens.ts`) and that
 *  `HighlightedText` marks: quoted phrases as contiguous units, bare words
 *  separately, `AND`/`OR`/`NOT` dropped. Filter, snippets, and marks therefore
 *  share ONE matching semantics — an entity that passed the filter (every token
 *  hit somewhere in its metadata index OR its full-text blob) is guaranteed a
 *  snippet here, so `count > 0` holds. (The operator-aware engine in
 *  `searchSnippets.ts` — wildcards, real AND/OR/NOT precedence — is the follow-up
 *  for when the filter parses operators as connectives, not just literal tokens.)
 *
 *  Excerpts are returned as PLAIN text (windowed, ellipsed) — NOT HTML with
 *  `<b>`. `HighlightedText` re-derives the marks from the query by string-split,
 *  so nothing renders `dangerouslySetInnerHTML`.
 *
 *  Full-text is IN the search (`entityFullTextBlob` + the filter's
 *  `fullTextSearch` guard), so an entity whose term appears only in its document
 *  body surfaces in both the left pane and here.
 *
 *  PAGE NUMBERS ARE ONLY CLAIMED WHERE THEY'RE REAL. CEJIL carries genuine
 *  per-page text, so its snippets get a page and a jump. The mock corpus shares
 *  one Velásquez rendition across every doc-bearing entity — text that isn't
 *  page-mapped and isn't even the PDF rendered next to it — so its snippets
 *  carry `page: null`: excerpt only, no "p.N", no jump. Beside the actual
 *  document a made-up page number is plainly wrong, and it was only invisible in
 *  the Library because nothing was there to contradict it. Residual limit:
 *  full-text is gated behind `q.length ≥ 3` for CEJIL-corpus perf. */

export interface MetadataSnippet {
  /** Field label ("Title", or an adapter-localized `entity.fields[].label`). */
  field: string;
  /** Stable field key (NOT the localized label) for deep-focus: matched against
   *  the drawer's `MetadataField.id`. Natural keys for the pseudo-fields
   *  (`title`/`country`/`descriptors`); adapter fields fall back to a label slug
   *  (see `entityFields`). */
  fieldKey: string;
  /** One windowed excerpt per matched field (around the first hit). */
  texts: string[];
}

export interface FullTextSnippet {
  /** 1-based page in the OPEN FILE — or `null` when the corpus can't say
   *  honestly which page this is (see `documentPages`). A null page renders
   *  without a "p.N" tag and isn't clickable: printing a number that points
   *  nowhere is worse than printing none. */
  page: number | null;
  text: string;
  /** How many times the query occurs on this page — drives the spine's
   *  counted-ring node (>1 → a counted ring, 1 → a plain dot). */
  hits: number;
}

export type { BorrowedDoc };

export interface EntitySnippets {
  /** The connected document these passages were quoted from, when the entity
   *  doesn't own the file the viewer renders (a Causa reading its Sentencia).
   *  Null for an entity's own document, and for the mock corpus. It describes
   *  the DOCUMENT, not the match, so it's set whether or not `fullText` is
   *  empty; surfaces render it beside document passages. */
  borrowedFrom: BorrowedDoc | null;
  /** metadata groups + **every** matched page — NOT `fullText.length`. The
   *  excerpt list is capped (`MAX_FULLTEXT`); this count isn't, so a card can say
   *  "5 of 23" instead of quietly presenting 5 as the whole story. */
  count: number;
  metadata: MetadataSnippet[];
  /** The excerpts actually built — at most `maxFullText` of them. */
  fullText: FullTextSnippet[];
  /** How many document pages matched in total. `≥ fullText.length`; strictly
   *  greater means the rest were counted but not excerpted (see
   *  `buildSnippetsFor`'s `maxFullText`). */
  fullTextTotal: number;
}

/** Words of context on each side of a hit — ~12-word windows. */
const CONTEXT_WORDS = 6;
/** How many full-text excerpts a card shows before "Show all" — a cap on what's
 *  RENDERED, never on what's counted (`fullTextTotal` always sees every page). */
export const MAX_FULLTEXT = 5;

/** The searchable metadata fields of an entity, in display order — the same
 *  parts `buildSearchIndex` concatenates (title, country, adapter fields,
 *  descriptors), kept per-field with labels because snippets need the field
 *  granularity the flat index throws away. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The searchable + snippet-able metadata fields of an entity, each with a stable
 *  key for deep-focus. Adapter entities (CEJIL) carry their scalars in `fields`
 *  (label/value, no id — slug the label); mock entities carry theirs in the
 *  PROFILE, whose fields have real ids matching the drawer's `MetadataField.id`,
 *  so `country`/`definition`/etc. deep-focus cleanly and localization-safely. */
function entityFields(
  e: Entity,
  language: Language,
): { field: string; fieldKey: string; text: string }[] {
  const out = [{ field: "Title", fieldKey: "title", text: e.title }];
  if (e.country) out.push({ field: "Country", fieldKey: "country", text: e.country });
  if (e.fields?.length) {
    for (const f of e.fields) {
      if (f.value) out.push({ field: f.label, fieldKey: slug(f.label), text: f.value });
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

interface FoldedField {
  field: string;
  fieldKey: string;
  /** Original text — what excerpts are cut from (accents and case intact). */
  text: string;
  /** `fold(text)`, computed once per entity+language for the life of the object. */
  folded: string;
}

/** `entityFields`, with every value pre-folded and MEMOISED per entity.
 *
 *  Folding is `normalize("NFD")` + a regex strip + `toLowerCase()` over every
 *  field of every entity — and it was being redone on every call of
 *  `matchCategories`, which the Library invokes thousands of times per keystroke
 *  for a single query. The text doesn't change between those calls; only the
 *  query does. So fold once per corpus and reuse.
 *
 *  Keyed by the ENTITY OBJECT (a WeakMap), not by id: an edited entity is a new
 *  object, so its cache entry is simply never found again — no staleness to
 *  invalidate, and no retention of entities the corpus has dropped. */
const foldedFieldsCache = new WeakMap<Entity, Map<Language, FoldedField[]>>();
function foldedFields(e: Entity, language: Language): FoldedField[] {
  let byLang = foldedFieldsCache.get(e);
  if (!byLang) {
    byLang = new Map();
    foldedFieldsCache.set(e, byLang);
  }
  let cached = byLang.get(language);
  if (!cached) {
    cached = entityFields(e, language).map((f) => ({ ...f, folded: fold(f.text) }));
    byLang.set(language, cached);
  }
  return cached;
}

/** How many times `needle` (already lowercased) occurs in `lowerText`. */
function countOccurrences(lowerText: string, needle: string): number {
  let n = 0;
  let from = 0;
  for (;;) {
    const i = lowerText.indexOf(needle, from);
    if (i < 0) break;
    n++;
    from = i + needle.length;
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

/** Map a folded-text match span back to the ORIGINAL string's indices, so the
 *  window is cut from the accented/cased source even though matching was folded. */
function originalSpan(
  /** `ArrayLike`, not `number[]`: the worker ships its maps as `Int32Array`
   *  (transferable, and half the memory), and they're read exactly the same. */
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

/** A window around the EARLIEST occurrence of any of `terms` (already folded) —
 *  so a multi-token query excerpts wherever it first hits. */
function excerptAroundTerms(
  text: string,
  terms: string[],
  ctx: number = CONTEXT_WORDS,
  /** A cached `foldWithMap(text)` when the caller has one (document pages do —
   *  see `pageFoldWithMap`). Must be the fold OF `text`, or the window is cut at
   *  indices belonging to another string. */
  pre?: { folded: string; map: ArrayLike<number> },
): string | null {
  const { folded, map } = pre ?? foldWithMap(text);
  let best = -1;
  let bestEnd = 0;
  for (const t of terms) {
    const i = folded.indexOf(t);
    if (i >= 0 && (best < 0 || i < best)) {
      best = i;
      bestEnd = i + t.length;
    }
  }
  if (best < 0) return null;
  const { start, len } = originalSpan(map, text.length, best, bestEnd);
  return windowAround(text, start, len, ctx);
}

/** The document's text, split for excerpting, plus whether those splits are the
 *  REAL pages of the file on screen.
 *   - CEJIL (`paged: true`): genuine per-page arrays keyed by the primary file's
 *     name, so index+1 IS the page the viewer shows.
 *   - mock (`paged: false`): doc-bearing types share one Velásquez rendition
 *     whose text isn't page-mapped — and isn't even the PDF rendered beside it.
 *     We still chunk it so excerpts come from across the document, but those
 *     chunks are NOT pages, so they carry no page number and no jump.
 */
interface DocPages {
  pages: string[];
  paged: boolean;
  /** The connected entity this document was borrowed from — see
   *  `cejilRenderedDoc`. Null when the entity owns its file.
   *
   *  The mock corpus borrows too, in its way (every doc-bearing type shares one
   *  Velásquez rendition), but there is no connected DOCUMENT ENTITY to name —
   *  the sharing is a seed-data shortcut, not a relationship the data records —
   *  so it stays null rather than inventing an attribution. Its snippets already
   *  carry no page for the same reason. */
  borrowedFrom: BorrowedDoc | null;
}

/** No document. ONE instance, so the page-keyed caches below don't accumulate a
 *  distinct entry per document-less entity (and `[] !== []` doesn't defeat them). */
const NO_PAGES: DocPages = { pages: [], paged: false, borrowedFrom: null };

/** `paginate` is deterministic in (rendition, pageCount), so the mock corpus's
 *  chunking is done once per language rather than per entity per keystroke —
 *  and, more importantly, every mock entity then shares ONE page array, which is
 *  the identity the fold caches below key on. */
const mockPagesCache = new Map<Language, DocPages>();

/** `documentPages`, memoised per entity. The lookup itself is not free on CEJIL:
 *  `cejilDocPagesFor` resolves the entity's own PDF or borrows one from a
 *  connected Sentencia, which walks that entity's relationships — and a País hub
 *  has thousands. That walk was being redone on every call, i.e. per entity per
 *  keystroke, to arrive at the same array every time. */
const docPagesCache = new Map<string, DocPages>();

function documentPages(e: Entity, language: Language, source: DataSource): DocPages {
  if (source === "cejil") {
    // Before the corpus lands every entity has no pages; caching that would
    // outlive the load and permanently blind full-text search (same rule as
    // `entityFullTextBlob`'s).
    if (!cejilLoaded()) return NO_PAGES;
    const key = `cejil:${e.id}`;
    let hit = docPagesCache.get(key);
    if (!hit) {
      // The file the VIEWER renders, and whether it came from a connected
      // document — one resolver, one relationship walk (see `cejilRenderedDoc`).
      const { pages, borrowedFrom } = cejilRenderedDoc(e.id);
      // Entities that borrow the SAME file get the same array instance back, so
      // the per-document fold cache below is shared across all of them.
      hit = pages.length ? { pages, paged: true, borrowedFrom } : NO_PAGES;
      docPagesCache.set(key, hit);
    }
    return hit;
  }
  if (!typeHasDocument(e.typeId)) return NO_PAGES;
  let hit = mockPagesCache.get(language);
  if (!hit) {
    const rendition = renditionsByLanguage[language] ?? renditionsByLanguage.EN;
    const pageCount = (documentsByLanguage[language] ?? documentsByLanguage.EN).pages;
    hit = { pages: paginate(rendition.plainText, pageCount), paged: false, borrowedFrom: null };
    mockPagesCache.set(language, hit);
  }
  return hit;
}

/** Every page of a document, FOLDED — keyed by the PAGE ARRAY ITSELF, not by the
 *  entity that asked for it.
 *
 *  This is where the search was spending its time. `fold` is an NFD normalise, a
 *  `\p{Diacritic}` regex strip and a lowercase over the whole text, and the
 *  corpus has ~4,400 entities sharing ~80 documents: an entity with no PDF of its
 *  own borrows a connected Sentencia's, so the SAME judgment was folded once per
 *  entity that pointed at it — thousands of times — and then again on the next
 *  keystroke, because nothing kept the result. Keyed by document, each one folds
 *  once for the life of the corpus.
 *
 *  A WeakMap on the array (the same idiom as `foldedFieldsCache`): a reloaded
 *  corpus hands out new arrays, so stale entries are simply never found again and
 *  nothing has to be invalidated. */
const foldedPagesCache = new WeakMap<string[], string[]>();
function foldedPages(pages: string[]): string[] {
  let folded = foldedPagesCache.get(pages);
  if (!folded) {
    folded = pages.map(fold);
    foldedPagesCache.set(pages, folded);
  }
  return folded;
}

/** `foldWithMap` for a document page, computed lazily per page and kept.
 *
 *  The excerpt cutter matches on folded text but must slice the ORIGINAL, so it
 *  needs the folded→original index map — the most expensive fold we do (a
 *  per-character loop building an array as long as the page). It was being redone
 *  for every excerpt on every keystroke; once `foldedPages` landed it was ALL the
 *  remaining scan time. Same key as the fold above, so a document pays for its
 *  map once.
 *
 *  Sparse on purpose: only pages that actually get excerpted (`maxFullText` of
 *  them per entity) ever build a map, so a long document doesn't pay for pages
 *  nobody reads. */
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

/** One document's folded pages, as computed off the main thread. `folded[i]` is
 *  `fold(pages[i])`.
 *
 *  Folds ONLY — no folded→original index maps. The maps are what the excerpt
 *  cutter needs, and it needs them for the handful of pages it actually cuts
 *  (`maxFullText` per entity, memoised in `pageFoldMapCache`), whereas the folded
 *  text is read for EVERY page on every scan. Priming maps eagerly meant
 *  computing and retaining an `Int32Array` per character of the corpus for pages
 *  nobody reads: measured at 20.4MB of live buffers for the 26 recovered
 *  documents (5.36M chars), on top of a transient `number[]` several times that
 *  inside the worker. `pageFoldWithMap` builds them lazily instead — which is
 *  what it already did for every document the prime didn't reach. */
export interface DocumentFolds {
  folded: string[];
}

/** Install pre-computed folds for the CEJIL documents, by document key.
 *
 *  This is the ONLY way scan work gets off the main thread here: the caches above
 *  are the whole cost of a search, so a worker that fills them (see
 *  `searchScan.worker.ts`) leaves the query path itself synchronous — every
 *  Results layout, `MatchOrigin` and the document search stay on the one
 *  `buildSnippetsFor` data path, with no async plumbed through six render trees
 *  to buy what is, by then, a cache hit.
 *
 *  Keying on the wire is whatever `cejilFullText()` keys by — a file `_id` for a
 *  recovered document, the legacy filename for one still pointing at a stand-in
 *  (see `docPagesOf`) — and by PAGE-ARRAY IDENTITY in the caches. The worker only
 *  echoes back the keys it was handed, so it never has to know which is which.
 *  Called before the corpus lands, or with a key it doesn't know, this is a no-op
 *  — priming is an optimisation, and a miss just means the main thread folds that
 *  document lazily, as it always did. Idempotent: re-priming overwrites with
 *  identical values. */
export function primeDocumentFolds(byDocKey: Record<string, DocumentFolds>): void {
  if (!cejilLoaded()) return;
  const byKey = cejilFullText();
  for (const [key, { folded }] of Object.entries(byDocKey)) {
    const pages = byKey[key];
    // A document whose page count doesn't match what we folded is a corpus that
    // changed under the worker — drop it rather than pair page i with fold j.
    if (!pages || pages.length !== folded.length) continue;
    foldedPagesCache.set(pages, folded);
    // NOT `pageFoldMapCache` — see `DocumentFolds`. The maps are per-excerpt and
    // built on demand; priming them cost 20MB of live Int32Array for pages no
    // excerpt ever cuts.
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

/** Build the snippet response for one entity against query `q`. Matching is
 *  per-TOKEN (`highlightTerms`: quoted phrases as units, bare words separately,
 *  operators dropped) — the SAME tokens the filter ANDs and `HighlightedText`
 *  marks, so an entity that matched via any token is guaranteed a snippet here
 *  (count > 0). An empty/termless query yields `count: 0` (the caller drops
 *  those).
 *
 *  EVERY page is scanned, always. `maxFullText` caps only how many excerpts get
 *  BUILT — pages past the cap are still counted into `fullTextTotal`, which is
 *  what lets a card offer "5 of 23 · Show all" instead of implying 5 is all
 *  there is. Pass `Infinity` to excerpt them all (what Show-all re-builds with);
 *  the extra work is the windowing pass, so it stays off the default path. */
export function buildSnippetsFor(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
  { maxFullText = MAX_FULLTEXT }: { maxFullText?: number } = {},
): EntitySnippets {
  const terms = highlightTerms(q); // already folded (lowercase + de-accented)
  const metadata: MetadataSnippet[] = [];
  const fullText: FullTextSnippet[] = [];
  if (terms.length === 0) {
    return { count: 0, metadata, fullText, fullTextTotal: 0, borrowedFrom: null };
  }

  // `foldedFields`, not `entityFields`: the same per-entity fold the categoriser
  // uses, so a card that is both ranked and excerpted folds its fields once, not
  // twice — and not again on the next keystroke.
  for (const { field, fieldKey, text, folded } of foldedFields(entity, language)) {
    if (!terms.some((t) => folded.includes(t))) continue;
    const excerpt = excerptAroundTerms(text, terms);
    if (excerpt) metadata.push({ field, fieldKey, texts: [excerpt] });
  }

  const { pages, paged, borrowedFrom } = documentPages(entity, language, source);
  // No early break: the loop used to stop at the cap, which is exactly why the
  // total was unknowable. Folding every page is the same work the search filter
  // already does for this entity (`entityFullTextBlob` folds the whole doc), so
  // the honest count costs the windowing pass, not a second scan.
  let fullTextTotal = 0;
  // Folded ONCE per document (see `foldedPages`), not per entity per keystroke.
  const lowerPages = foldedPages(pages);
  for (let i = 0; i < pages.length; i++) {
    const lower = lowerPages[i];
    const hits = terms.reduce((n, t) => n + countOccurrences(lower, t), 0);
    if (hits === 0) continue;
    fullTextTotal++; // counted whether or not it gets excerpted below
    if (fullText.length >= maxFullText) continue;
    const excerpt = excerptAroundTerms(pages[i], terms, CONTEXT_WORDS, pageFoldWithMap(pages, i));
    if (excerpt) fullText.push({ page: paged ? i + 1 : null, text: excerpt, hits });
  }

  return { count: metadata.length + fullTextTotal, metadata, fullText, fullTextTotal, borrowedFrom };
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

/** Where a query matched an entity, given ALREADY-TOKENIZED terms.
 *
 *  The terms are a property of the QUERY, not of the entity, so tokenizing them
 *  per entity was pure repetition — one `highlightTerms` parse per call, times
 *  thousands of calls, for one query. Callers that categorise a corpus hoist the
 *  parse and pass it in; `matchCategories` below keeps the one-shot signature. */
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
    if (!terms.some((t) => f.folded.includes(t))) continue;
    if (f.fieldKey === "title") title = true;
    else properties = true;
    // Both flags set — no later field can change the answer.
    if (title && properties) break;
  }
  const blob = entityFullTextBlob(entity, language, source);
  const document = terms.some((t) => blob.includes(t));

  return { title, properties, document };
}

/** Where a query matched an entity — for the Results tab's match-type chips.
 *  Uses the SAME sources as the filter/snippets so the categories agree with
 *  what surfaces. Prefer `matchCategoriesWithTerms` in a loop over the corpus. */
export function matchCategories(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
): MatchCategories {
  return matchCategoriesWithTerms(entity, highlightTerms(q), language, source);
}

/** Where a query matched an entity that THE ROW ITSELF cannot show.
 *
 *  A list row or a spine line renders a title (marked) and — in the table — a
 *  country column (also marked). Those matches are self-evident: the mark IS the
 *  evidence. A hit in an unrendered property, or in the document body, leaves the
 *  row looking like it matched nothing, which is the whole problem in a result set
 *  of thousands. This is what the row's match marker names.
 *
 *  `visibleFieldKeys` are the field keys the surface already renders WITH marks
 *  (list: `title` + `country` when that column is on; spine: `title` only).
 *  Anything matched outside that set is hidden evidence.
 *
 *  Only the FIRST hidden property is returned, plus how many more there were: the
 *  marker names one place and routes there; the drawer's Results card is where the
 *  full account lives, and duplicating it in a 4rem column would be noise.
 *
 *  Full text is gated on `q.length ≥ 3`, exactly like the library filter's
 *  `fullTextSearch` — a marker for a body hit the filter never made would be an
 *  affordance the data can't back. */
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
  const terms = highlightTerms(q); // already folded — one tokenizer, see §4.3
  if (terms.length === 0) return empty;

  const visible = new Set(visibleFieldKeys);
  let property: HiddenMatchOrigin["property"] = null;
  let moreProperties = 0;
  // `foldedFields`, not `entityFields` + `fold`: this runs per RENDERED ROW per
  // keystroke (every row of the list and the spine carries a match marker), and
  // it was re-folding each row's fields from scratch every time.
  for (const f of foldedFields(entity, language)) {
    if (visible.has(f.fieldKey)) continue;
    if (!terms.some((t) => f.folded.includes(t))) continue;
    if (property) moreProperties++;
    else property = { field: f.field, fieldKey: f.fieldKey };
  }

  const document =
    q.trim().length >= 3 &&
    (() => {
      const blob = entityFullTextBlob(entity, language, source);
      return terms.some((t) => blob.includes(t));
    })();

  return { property, moreProperties, document };
}

/** Lowercase full-text blob (all of a document's pages joined), for the library
 *  search predicate to scan alongside the metadata index.
 *
 *  Keyed by the DOCUMENT, not the entity. It used to be `source:language:id`,
 *  which meant the corpus's ~80 judgments were folded — and then stored — once
 *  per entity that reads them, and thousands of entities read a borrowed one. The
 *  fold is shared with `buildSnippetsFor` through `foldedPages`, so a document
 *  that has been excerpted is already folded for the filter, and vice versa.
 *
 *  A CEJIL entity queried before its corpus loads has no pages, so it returns ""
 *  WITHOUT caching and picks up the real text once `cejilReady` flips.
 *
 *  Joining the folded pages is the same string as folding the joined pages:
 *  `fold` is per-character apart from `toLowerCase`, whose one context-sensitive
 *  case (Greek final sigma) turns on adjacent letters — and the "\n" separator is
 *  a word boundary either way. Asserted over the real corpus, not assumed. */
const blobByPages = new WeakMap<string[], string>();
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
