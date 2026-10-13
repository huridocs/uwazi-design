// A reference's sources as the evidence card shows them: the Source records of
// a collection that stores them in Uwazi's metadata shape (Nepal, Vegas). Each
// adapter passes its own record lookup; nothing here knows a corpus.
import type { QuoteDoc, RefSource, SourceQuote } from "./references";

interface SourceRecord {
  sharedId: string;
  title: string;
  datePrecision?: string;
  metadata: Record<string, { value: unknown; label?: string }[]>;
}

/** A reference as the corpus files store it: the ends, the sources, a quote
 *  from `from` and, in Nepal, the bundled PDF page it sits on. */
interface StoredRef {
  from: string;
  to: string;
  sources?: string[];
  quote?: string;
  file?: string;
  page?: number;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

const sourceCache = new WeakMap<SourceRecord, RefSource>();

/** One Source record as a `RefSource`, built once per record. */
export function refSourceFrom(e: SourceRecord): RefSource {
  const hit = sourceCache.get(e);
  if (hit) return hit;
  const md = e.metadata;
  const link = md.url?.[0]?.value as { url?: string } | undefined;
  const opt = <K extends string, V>(k: K, v: V | undefined) => (v === undefined ? {} : ({ [k]: v } as Record<K, V>));
  const out: RefSource = {
    id: e.sharedId,
    title: e.title,
    ...opt("publisher", str(md.publisher?.[0]?.value)),
    ...opt("publisherType", md.publisher_type?.[0]?.label ?? str(md.publisher_type?.[0]?.value)),
    ...opt("syndicatedFrom", str(md.syndicated_from?.[0]?.value)),
    ...opt("url", str(link?.url)),
    ...opt("published", num(md.published?.[0]?.value)),
    ...opt("accessed", num(md.accessed?.[0]?.value)),
    ...opt("datePrecision", e.datePrecision === "month" || e.datePrecision === "year" ? e.datePrecision : undefined),
  };
  sourceCache.set(e, out);
  return out;
}

/** The link's sources and what they quote about its ends.
 *
 *  `sources` resolves the ids the reference lists; an id the collection does
 *  not hold is skipped (the builds stop on one, so none should). `quotes` are
 *  the quotes on the sources' own references to either end, besides the
 *  reference's own quote, each at most once; `pageOf` keeps a PDF page only
 *  where the caller can show it. */
export function refEvidenceFrom(
  ref: StoredRef,
  recordOf: (id: string) => SourceRecord | undefined,
  refsOf: (id: string) => StoredRef[] | undefined,
  pageOf: (r: StoredRef) => number | undefined,
  /** The PDF and page a quote was found in, whichever record is focused. */
  docOf?: (r: StoredRef) => QuoteDoc | undefined,
): { sources?: RefSource[]; sourceQuotes?: SourceQuote[] } {
  const ids = ref.sources ?? [];
  if (ids.length === 0) return {};
  const sources: RefSource[] = [];
  const quotes: SourceQuote[] = [];
  const seen = new Set(ref.quote ? [ref.quote] : []);
  for (const id of ids) {
    const rec = recordOf(id);
    if (!rec) continue;
    sources.push(refSourceFrom(rec));
    for (const r of refsOf(id) ?? []) {
      if (r.from !== id || !r.quote || seen.has(r.quote)) continue;
      if (r.to !== ref.from && r.to !== ref.to) continue;
      seen.add(r.quote);
      const page = pageOf(r);
      const doc = docOf?.(r);
      quotes.push({ sourceId: id, text: r.quote, ...(page ? { page } : {}), ...(doc ? { doc } : {}) });
    }
  }
  return {
    ...(sources.length ? { sources } : {}),
    ...(quotes.length ? { sourceQuotes: quotes } : {}),
  };
}
