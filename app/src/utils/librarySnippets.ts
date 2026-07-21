import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { typeHasDocument } from "../data/entityProfiles";
import { renditionsByLanguage } from "../data/documentRenditions";
import { documentsByLanguage } from "../data/document";
import { cejilFullText, cejilFilesBySid, cejilLoaded } from "../data/cejil/load";
import { highlightTerms } from "./queryTokens";

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
 *  Full-text is now IN the search (`entityFullTextBlob` + the filter's
 *  `fullTextSearch` guard), so an entity whose term appears only in its document
 *  body surfaces in both the left pane and here, with its page snippets. Residual
 *  limits (named follow-ups, not v1): full-text is gated behind `q.length ≥ 3`
 *  for CEJIL-corpus perf, and the mock rendition's page numbers are approximate
 *  (the extracted text isn't page-mapped). */

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
  /** 1-based page number the excerpt came from. */
  page: number;
  text: string;
  /** How many times the query occurs on this page — drives the spine's
   *  counted-ring node (>1 → a counted ring, 1 → a plain dot). */
  hits: number;
}

export interface EntitySnippets {
  /** metadata groups + fullText hits. */
  count: number;
  metadata: MetadataSnippet[];
  fullText: FullTextSnippet[];
}

/** Words of context on each side of a hit — ~12-word windows. */
const CONTEXT_WORDS = 6;
/** Cap full-text excerpts per document so a long doc doesn't flood one card. */
const MAX_FULLTEXT = 5;

/** The searchable metadata fields of an entity, in display order — the same
 *  parts `buildSearchIndex` concatenates (title, country, adapter fields,
 *  descriptors), kept per-field with labels because snippets need the field
 *  granularity the flat index throws away. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function entityFields(e: Entity): { field: string; fieldKey: string; text: string }[] {
  const out = [{ field: "Title", fieldKey: "title", text: e.title }];
  if (e.country) out.push({ field: "Country", fieldKey: "country", text: e.country });
  for (const f of e.fields ?? []) {
    // Adapter fields carry no stable key — slug the label as a best-effort match
    // for deep-focus (localization-safe keying needs a data-layer field id).
    if (f.value) out.push({ field: f.label, fieldKey: slug(f.label), text: f.value });
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

/** A window around the first case-insensitive occurrence of `needle`. Returns
 *  null if it isn't found. */
export function excerptAround(
  text: string,
  needle: string,
  ctx: number = CONTEXT_WORDS,
): string | null {
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return null;
  return windowAround(text, idx, needle.length, ctx);
}

/** A window around the EARLIEST occurrence of any of `terms` (already
 *  lowercased) — so a multi-token query excerpts wherever it first hits. */
function excerptAroundTerms(
  text: string,
  terms: string[],
  ctx: number = CONTEXT_WORDS,
): string | null {
  const lower = text.toLowerCase();
  let best = -1;
  let bestLen = 0;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i >= 0 && (best < 0 || i < best)) {
      best = i;
      bestLen = t.length;
    }
  }
  if (best < 0) return null;
  return windowAround(text, best, bestLen, ctx);
}

/** The document's per-page text, or `[]` when the entity has no parsed body.
 *   - CEJIL: real per-page arrays keyed by the primary file's name (page = index+1).
 *   - mock: doc-bearing types share the one Velásquez rendition, which is a single
 *     unpaginated blob — split into the doc's page count so excerpts carry a
 *     plausible page number. The jump is therefore APPROXIMATE for the mock
 *     corpus (the rendition text isn't page-mapped); CEJIL page jumps are exact. */
function documentPages(e: Entity, language: Language, source: DataSource): string[] {
  if (source === "cejil") {
    const ft = cejilFullText();
    for (const f of cejilFilesBySid().get(e.id) ?? []) {
      const pages = ft[f.filename];
      if (pages?.length) return pages;
    }
    return [];
  }
  if (!typeHasDocument(e.typeId)) return [];
  const rendition = renditionsByLanguage[language] ?? renditionsByLanguage.EN;
  const pageCount = (documentsByLanguage[language] ?? documentsByLanguage.EN).pages;
  return paginate(rendition.plainText, pageCount);
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
 *  those). */
export function buildSnippetsFor(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
): EntitySnippets {
  const terms = highlightTerms(q).map((t) => t.toLowerCase());
  const metadata: MetadataSnippet[] = [];
  const fullText: FullTextSnippet[] = [];
  if (terms.length === 0) return { count: 0, metadata, fullText };

  for (const { field, fieldKey, text } of entityFields(entity)) {
    const lower = text.toLowerCase();
    if (!terms.some((t) => lower.includes(t))) continue;
    const excerpt = excerptAroundTerms(text, terms);
    if (excerpt) metadata.push({ field, fieldKey, texts: [excerpt] });
  }

  const pages = documentPages(entity, language, source);
  for (let i = 0; i < pages.length && fullText.length < MAX_FULLTEXT; i++) {
    const lower = pages[i].toLowerCase();
    const hits = terms.reduce((n, t) => n + countOccurrences(lower, t), 0);
    if (hits === 0) continue;
    const excerpt = excerptAroundTerms(pages[i], terms);
    if (excerpt) fullText.push({ page: i + 1, text: excerpt, hits });
  }

  return { count: metadata.length + fullText.length, metadata, fullText };
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

  const blob = documentPages(entity, language, source).join("\n").toLowerCase();
  if (source === "cejil" && !cejilLoaded()) return blob; // "" — don't wedge the cache
  fullTextBlobCache.set(key, blob);
  return blob;
}
