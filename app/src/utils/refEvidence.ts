import type { RefSource, Reference, Verification } from "../data/references";

/** Lower-case words, no punctuation: how the Nepal seed compares publisher
 *  names (`merge.py` `norm`). */
const norm = (s: string | undefined) =>
  (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The publisher a source counts as: the wire or outlet it was syndicated
 *  from, else its own publisher. The seed's rule (`merge.py` `origin`), so the
 *  count here is the count the status was computed from. */
export function sourceOrigin(s: RefSource): string | undefined {
  return norm(s.syndicatedFrom) || norm(s.publisher) || undefined;
}

/** Independent publishers among `sources`: one per origin, so four papers
 *  running one AFP story count once. Sources with no publisher do not count. */
export function independentPublishers(sources: RefSource[]): number {
  return new Set(sources.map(sourceOrigin).filter(Boolean)).size;
}

/** When the sources first reported the link: the earliest publication date
 *  among them, epoch seconds. Undefined when none states one (a living page
 *  carries only the day it was read). */
export function reportedAt(ref: Reference): number | undefined {
  let at: number | undefined;
  for (const s of ref.sources ?? []) if (s.published !== undefined && (at === undefined || s.published < at)) at = s.published;
  return at;
}

/** Whether a link was reported by the end of `day` (epoch seconds at the
 *  day's UTC start, as `asOfSeconds` gives it). A link whose sources state no
 *  publication date is not ruled out and stays, as As of keeps undated links. */
export function refReportedBy(ref: Reference, day: number): boolean {
  const at = reportedAt(ref);
  return at === undefined || at < day + 86400;
}

/** The publisher facet's value for a source: its own name, as printed on it. */
export const sourcePublisher = (s: RefSource) => s.publisher ?? s.title;

/** What the evidence card shows for a set of references (one row's backing
 *  references): their sources once each, the independent count, the span of
 *  publication dates, and how many sources are wire copies. */
export interface EvidenceSummary {
  sources: RefSource[];
  independent: number;
  /** Sources that share their origin with another listed source (a second
   *  story from one outlet, a wire copy beside its origin): they add no
   *  independent publisher. */
  copies: number;
  firstReported?: number;
  lastReported?: number;
  /** Sources with no publication date (read on `accessed`). */
  undated: number;
  statuses: Verification[];
}

export function evidenceSummary(refs: Reference[]): EvidenceSummary {
  const byId = new Map<string, RefSource>();
  for (const r of refs) for (const s of r.sources ?? []) byId.set(s.id, s);
  const sources = [...byId.values()].sort(
    (a, b) => (a.published ?? Infinity) - (b.published ?? Infinity) || sourcePublisher(a).localeCompare(sourcePublisher(b)),
  );
  const dated = sources.map((s) => s.published).filter((d): d is number => d !== undefined);
  const statuses = [...new Set(refs.map((r) => r.verification).filter((v): v is Verification => !!v))];
  return {
    sources,
    independent: independentPublishers(sources),
    copies: sources.filter((s) => sourceOrigin(s)).length - independentPublishers(sources),
    ...(dated.length ? { firstReported: Math.min(...dated), lastReported: Math.max(...dated) } : {}),
    undated: sources.length - dated.length,
    statuses,
  };
}

/** Whether a reference has anything for the evidence card to show. */
export const hasEvidence = (r: Reference) => !!(r.sources?.length || r.note);

/** The sentence that says why a link has its status.
 *
 *  The Nepal seed sets confirmed at two or more independent publishers and
 *  single source below that; disputed is set by the researcher. Where the
 *  recorded status and the count agree with that rule, the sentence states
 *  the rule. Where they do not (a status set by hand, Vegas's timing checks),
 *  it states only what was recorded, and the note gives the reason. */
export function verificationBasis(status: Verification, independent: number): string {
  if (status === "disputed") return "Recorded as disputed: the sources, or other records, conflict.";
  if (status === "confirmed" && independent >= 2)
    return `Confirmed: ${independent} independent publishers report it. A\u00a0wire copy counts once.`;
  if (status === "single-source" && independent === 1) return "Single source: one independent publisher reports it.";
  return status === "confirmed" ? "Recorded as confirmed." : "Recorded as single source.";
}

const byIdCache = new WeakMap<Reference[], Map<string, Reference>>();
/** The references among `all` with the given ids, in id order: an aggregate
 *  row's backing references. The id index is built once per array. */
export function refsWithIds(all: Reference[], ids: string[]): Reference[] {
  let index = byIdCache.get(all);
  if (!index) byIdCache.set(all, (index = new Map(all.map((r) => [r.id, r]))));
  return ids.flatMap((id) => index.get(id) ?? []);
}
