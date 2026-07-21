import type { Entity } from "../data/entities";
import type { Language } from "../atoms/language";
import type { DataSource } from "./libraryFacets";
import { typeHasDocument } from "../data/entityProfiles";
import { renditionsByLanguage } from "../data/documentRenditions";
import { documentsByLanguage } from "../data/document";
import { cejilFullText, cejilFilesBySid } from "../data/cejil/load";

/** Synthesizes Uwazi's per-entity search-snippets shape from the data we already
 *  hold — no backend. Mirrors `SnippetsSearchResponse`
 *  (`{ count, metadata: [{ field, texts[] }], fullText: [{ page, text }] }`) so
 *  the Results-tab UI maps 1:1 onto what the real V2 sidepanel renders.
 *
 *  Matching is **substring, case-insensitive** — deliberately the SAME test the
 *  Library's left-pane filter uses (`buildSearchIndex` → `.toLowerCase()
 *  .includes(q)`, utils/libraryFilter.ts). That keeps the two consistent: any
 *  entity in the filtered set is guaranteed ≥1 metadata snippet here. (The
 *  operator-aware engine in `searchSnippets.ts` — wildcards/phrases/AND-OR-NOT —
 *  is the follow-up for when the FILTER itself parses operators; wiring it here
 *  first would drop entities the substring filter kept.)
 *
 *  Excerpts are returned as PLAIN text (windowed, ellipsed) — NOT HTML with
 *  `<b>`. The `SnippetText` component re-derives the highlight marks from the
 *  query by string-split, so nothing renders `dangerouslySetInnerHTML`.
 *
 *  Known limitation (don't hide it): our search index is metadata-only, so an
 *  entity whose term appears ONLY in its PDF body isn't in the filtered set at
 *  all. Full-text snippets therefore surface as a bonus on entities that also
 *  matched metadata. Deep full-text indexing is a follow-up, not v1. */

export interface MetadataSnippet {
  /** Field label ("Title", or an adapter-localized `entity.fields[].label`). */
  field: string;
  /** One windowed excerpt per matched field (around the first hit). */
  texts: string[];
}

export interface FullTextSnippet {
  /** 1-based page number the excerpt came from. */
  page: number;
  text: string;
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
function entityFields(e: Entity): { field: string; text: string }[] {
  const out: { field: string; text: string }[] = [{ field: "Title", text: e.title }];
  if (e.country) out.push({ field: "Country", text: e.country });
  for (const f of e.fields ?? []) {
    if (f.value) out.push({ field: f.label, text: f.value });
  }
  if (e.descriptors?.length) {
    out.push({ field: "Descriptors", text: e.descriptors.join(", ") });
  }
  return out;
}

/** A ~`2·ctx`-word window around the first case-insensitive occurrence of
 *  `needle` (already lowercased) in `text`, whitespace collapsed to a single
 *  line, with `…` on any clipped side. Returns null if the needle isn't found. */
export function excerptAround(
  text: string,
  needle: string,
  ctx: number = CONTEXT_WORDS,
): string | null {
  const idx = text.toLowerCase().indexOf(needle);
  if (idx < 0) return null;
  const matchEnd = idx + needle.length;

  const words = [...text.matchAll(/\S+/g)].map((m) => {
    const start = m.index ?? 0;
    return { start, end: start + m[0].length };
  });
  if (words.length === 0) return text.trim() || null;

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

/** Build the snippet response for one entity against query `q`. An empty/blank
 *  query yields `count: 0` (the caller drops those). */
export function buildSnippetsFor(
  entity: Entity,
  q: string,
  language: Language,
  source: DataSource,
): EntitySnippets {
  const needle = q.trim().toLowerCase();
  const metadata: MetadataSnippet[] = [];
  const fullText: FullTextSnippet[] = [];
  if (!needle) return { count: 0, metadata, fullText };

  for (const { field, text } of entityFields(entity)) {
    if (!text.toLowerCase().includes(needle)) continue;
    const excerpt = excerptAround(text, needle);
    if (excerpt) metadata.push({ field, texts: [excerpt] });
  }

  const pages = documentPages(entity, language, source);
  for (let i = 0; i < pages.length && fullText.length < MAX_FULLTEXT; i++) {
    if (!pages[i].toLowerCase().includes(needle)) continue;
    const excerpt = excerptAround(pages[i], needle);
    if (excerpt) fullText.push({ page: i + 1, text: excerpt });
  }

  return { count: metadata.length + fullText.length, metadata, fullText };
}
