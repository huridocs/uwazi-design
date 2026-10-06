// A Nepal claim's evidence as a matrix: the sources that support it, dispute
// it or report on it, one row per independent publisher. A wire copy
// (`syndicated_from`) folds into its origin, so four papers running one AFP
// story count as one publisher. Read-only, built from the loaded corpus.
import type { Verification } from "./types";
import { nepalCorpus, nepalEntity, nepalRefsByEntity } from "./load";

export type Stance = "supports" | "disputes" | "reports_on";

export const STANCES: Stance[] = ["supports", "disputes", "reports_on"];

export const STANCE_LABEL: Record<Stance, string> = {
  supports: "Supports",
  disputes: "Disputes",
  reports_on: "Reports on",
};

/** One source's reference to the claim: the quote is the evidence. */
export interface EvidenceItem {
  refId: string;
  sourceId: string;
  sourceTitle: string;
  /** The publisher printed on the source. Differs from the row's when the
   *  source is a wire copy. */
  publisher: string;
  publisherType?: string;
  /** Publication date, epoch seconds; the access date when none is known. */
  date?: number;
  datePrecision?: "day" | "month" | "year";
  /** The source is a copy of the row's publisher (its wire origin). */
  copy: boolean;
  verification: Verification;
  quote?: string;
}

/** One independent publisher and what its sources say, by stance. */
export interface PublisherRow {
  key: string;
  publisher: string;
  publisherType?: string;
  /** Publishers whose copies of this one's material fold into the row. */
  via: string[];
  cells: Record<Stance, EvidenceItem[]>;
}

export interface ClaimEvidence {
  claimId: string;
  /** The claim's own verification status, as Research recorded it. */
  status?: Verification;
  rows: PublisherRow[];
  /** Independent publishers per stance. */
  publishers: Record<Stance, number>;
  /** References per stance. */
  references: Record<Stance, number>;
  /** Publishers on both sides (support and dispute). */
  bothSides: number;
}

const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : undefined);

const WIRES: Record<string, string> = {
  afp: "AFP",
  "agence france-presse": "AFP",
  reuters: "Reuters",
  pti: "PTI",
  ani: "ANI",
  ians: "IANS",
  "associated press": "Associated Press",
  ap: "Associated Press",
};

let publisherIndex: Map<string, { name: string; type?: string }> | null = null;
/** Every publisher named on a source, lower-cased, with its type. */
function publishers() {
  if (publisherIndex) return publisherIndex;
  publisherIndex = new Map();
  for (const e of nepalCorpus()?.entities ?? []) {
    if (e.template !== "nepal_source") continue;
    const name = str(e.metadata.publisher?.[0]?.value);
    if (!name || publisherIndex.has(name.toLowerCase())) continue;
    publisherIndex.set(name.toLowerCase(), { name, type: e.metadata.publisher_type?.[0]?.label });
  }
  return publisherIndex;
}

/** The publisher a `syndicated_from` note names, when it names exactly one
 *  that can be identified: a wire agency, or a publisher in the corpus.
 *  "AFP, ANI", "agency copy; agency not named on page" and the like name no
 *  single origin, so the source stays its own publisher. */
export function wireOrigin(note: string | undefined): string | undefined {
  if (!note) return undefined;
  const bare = note.replace(/\(.*?\)/g, "").trim().toLowerCase();
  if (!bare || /[,;/]/.test(bare)) return undefined;
  return WIRES[bare] ?? publishers().get(bare)?.name;
}

const cache = new Map<string, ClaimEvidence | null>();

/** The claim's evidence matrix, or undefined for any record that is not a
 *  Nepal claim or that no source takes a stance on. */
export function nepalClaimEvidence(claimId: string): ClaimEvidence | undefined {
  const hit = cache.get(claimId);
  if (hit !== undefined) return hit ?? undefined;
  const claim = nepalEntity(claimId);
  if (!claim || claim.template !== "nepal_claim") return undefined;

  const rows = new Map<string, PublisherRow>();
  const references: Record<Stance, number> = { supports: 0, disputes: 0, reports_on: 0 };
  for (const r of nepalRefsByEntity().get(claimId) ?? []) {
    const stance = r.type as Stance;
    if (r.to !== claimId || !STANCES.includes(stance)) continue;
    const src = nepalEntity(r.from);
    if (!src || src.template !== "nepal_source") continue;
    const md = src.metadata;
    const own = str(md.publisher?.[0]?.value) ?? src.title;
    const origin = wireOrigin(str(md.syndicated_from?.[0]?.value));
    const copy = !!origin && origin.toLowerCase() !== own.toLowerCase();
    const rowName = copy ? origin! : own;
    const key = rowName.toLowerCase();
    let row = rows.get(key);
    if (!row) {
      row = {
        key,
        publisher: rowName,
        publisherType: copy ? publishers().get(key)?.type ?? (WIRES[key] ? "News agency" : undefined) : md.publisher_type?.[0]?.label,
        via: [],
        cells: { supports: [], disputes: [], reports_on: [] },
      };
      rows.set(key, row);
    }
    if (!copy && !row.publisherType) row.publisherType = md.publisher_type?.[0]?.label;
    if (copy && !row.via.includes(own)) row.via.push(own);
    row.cells[stance].push({
      refId: `np-${r.id}`,
      sourceId: src.sharedId,
      sourceTitle: src.title,
      publisher: own,
      publisherType: md.publisher_type?.[0]?.label,
      date: num(md.published?.[0]?.value) ?? num(md.accessed?.[0]?.value),
      ...(src.datePrecision ? { datePrecision: src.datePrecision } : {}),
      copy,
      verification: r.verification,
      ...(r.quote ? { quote: r.quote } : {}),
    });
    references[stance]++;
  }
  if (rows.size === 0) {
    cache.set(claimId, null);
    return undefined;
  }

  const sorted = [...rows.values()];
  for (const row of sorted) for (const s of STANCES) row.cells[s].sort((a, b) => (a.date ?? 0) - (b.date ?? 0));
  const count = (s: Stance) => sorted.filter((r) => r.cells[s].length > 0).length;
  // Publishers on both sides first, then supporters, then disputers, then the
  // rest; within a band, by how many sources the row holds.
  const band = (r: PublisherRow) =>
    r.cells.supports.length && r.cells.disputes.length ? 0 : r.cells.supports.length ? 1 : r.cells.disputes.length ? 2 : 3;
  const size = (r: PublisherRow) => STANCES.reduce((n, s) => n + r.cells[s].length, 0);
  sorted.sort((a, b) => band(a) - band(b) || size(b) - size(a) || a.publisher.localeCompare(b.publisher));

  const status = str(claim.metadata.verification_status?.[0]?.value) as Verification | undefined;
  const out: ClaimEvidence = {
    claimId,
    ...(status ? { status } : {}),
    rows: sorted,
    publishers: { supports: count("supports"), disputes: count("disputes"), reports_on: count("reports_on") },
    references,
    bothSides: sorted.filter((r) => r.cells.supports.length && r.cells.disputes.length).length,
  };
  cache.set(claimId, out);
  return out;
}
