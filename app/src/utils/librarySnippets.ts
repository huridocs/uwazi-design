import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { typeHasDocument, getEntityProfile } from "../data/entityProfiles";
import { renditionsByLanguage } from "../data/documentRenditions";
import { documentsByLanguage } from "../data/document";
import { cejilLoaded } from "../data/cejil/load";
import { cejilDocPagesFor } from "../data/cejil/profile";
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

export interface EntitySnippets {
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
  map: number[],
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
): string | null {
  const { folded, map } = foldWithMap(text);
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
function documentPages(
  e: Entity,
  language: Language,
  source: DataSource,
): { pages: string[]; paged: boolean } {
  if (source === "cejil") {
    // The pages of the file the VIEWER renders — see `cejilDocPagesFor`.
    return { pages: cejilDocPagesFor(e.id), paged: true };
  }
  if (!typeHasDocument(e.typeId)) return { pages: [], paged: false };
  const rendition = renditionsByLanguage[language] ?? renditionsByLanguage.EN;
  const pageCount = (documentsByLanguage[language] ?? documentsByLanguage.EN).pages;
  return { pages: paginate(rendition.plainText, pageCount), paged: false };
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
  if (terms.length === 0) return { count: 0, metadata, fullText, fullTextTotal: 0 };

  for (const { field, fieldKey, text } of entityFields(entity, language)) {
    const lower = fold(text);
    if (!terms.some((t) => lower.includes(t))) continue;
    const excerpt = excerptAroundTerms(text, terms);
    if (excerpt) metadata.push({ field, fieldKey, texts: [excerpt] });
  }

  const { pages, paged } = documentPages(entity, language, source);
  // No early break: the loop used to stop at the cap, which is exactly why the
  // total was unknowable. Folding every page is the same work the search filter
  // already does for this entity (`entityFullTextBlob` folds the whole doc), so
  // the honest count costs the windowing pass, not a second scan.
  let fullTextTotal = 0;
  for (let i = 0; i < pages.length; i++) {
    const lower = fold(pages[i]);
    const hits = terms.reduce((n, t) => n + countOccurrences(lower, t), 0);
    if (hits === 0) continue;
    fullTextTotal++; // counted whether or not it gets excerpted below
    if (fullText.length >= maxFullText) continue;
    const excerpt = excerptAroundTerms(pages[i], terms);
    if (excerpt) fullText.push({ page: paged ? i + 1 : null, text: excerpt, hits });
  }

  return { count: metadata.length + fullTextTotal, metadata, fullText, fullTextTotal };
}

export interface MatchCategories {
  /** The query hit the entity's title. */
  title: boolean;
  /** The query hit a non-title metadata field (country / adapter / profile). */
  properties: boolean;
  /** The query hit the entity's document body. */
  document: boolean;
}

/** Where a query matched an entity — for the Results tab's match-type chips.
 *  Uses the SAME sources as the filter/snippets so the categories agree with
 *  what surfaces. */
export function matchCategories(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
): MatchCategories {
  const terms = highlightTerms(q); // already folded (lowercase + de-accented)
  if (terms.length === 0) return { title: false, properties: false, document: false };
  const hit = (text: string) => {
    const lower = fold(text);
    return terms.some((t) => lower.includes(t));
  };

  let title = false;
  let properties = false;
  for (const f of entityFields(entity, language)) {
    if (!hit(f.text)) continue;
    if (f.fieldKey === "title") title = true;
    else properties = true;
  }
  const blob = entityFullTextBlob(entity, language, source);
  const document = terms.some((t) => blob.includes(t));

  return { title, properties, document };
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
  for (const f of entityFields(entity, language)) {
    if (visible.has(f.fieldKey)) continue;
    const lower = fold(f.text);
    if (!terms.some((t) => lower.includes(t))) continue;
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

/** Per-entity lowercase full-text blob (all its document pages joined), for the
 *  library search predicate to scan alongside the metadata index. Lazily built
 *  and MEMOIZED so the CEJIL corpus is walked once on the first full-text search,
 *  not per keystroke. A CEJIL entity queried before its corpus loads returns an
 *  empty blob that is NOT cached, so the real text is picked up once `cejilReady`
 *  flips. Keyed by source+language+entity because the mock rendition is
 *  language-specific. */
const fullTextBlobCache = new Map<string, string>();
export function entityFullTextBlob(
  entity: Entity,
  language: Language,
  source: DataSource,
): string {
  const key = `${source}:${language}:${entity.id}`;
  const cached = fullTextBlobCache.get(key);
  if (cached !== undefined) return cached;

  const blob = fold(documentPages(entity, language, source).pages.join("\n"));
  if (source === "cejil" && !cejilLoaded()) return blob; // "" — don't wedge the cache
  fullTextBlobCache.set(key, blob);
  return blob;
}
