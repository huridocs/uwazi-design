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

/** A claim's structured figure (Research's reviewed extraction): the count,
 *  what it counts, where, and the day it was stated for. */
export interface ClaimFigure {
  figure: number;
  /** Thesaurus id: killed, injured, arrested, detained, missing, damage-NPR, other. */
  unit: string;
  /** What "other" counts ("inmates escaped"). */
  unitDetail?: string;
  qualifier: "exact" | "at-least" | "about";
  scope?: string;
  /** Epoch seconds, the day the count was stated for. */
  asOf?: number;
  asOfTime?: string;
  /** stated | derived | published | unknown: a published date is a stand-in. */
  asOfBasis?: string;
  /** Other figures in the same statement, as text. */
  more?: string;
}

/** Another claim the claim cannot stand beside: one counting the same thing,
 *  at the same place, for the same day, with a figure both cannot hold; or one
 *  Research linked to it with `conflicts_with` (which may carry no figure). */
export interface FigureConflict {
  claimId: string;
  title: string;
  figure?: ClaimFigure;
}

export interface ClaimEvidence {
  claimId: string;
  figure?: ClaimFigure;
  /** Empty when the figure has no comparable day, or none disagrees. */
  conflicts: FigureConflict[];
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

const QUALIFIERS = new Set(["exact", "at-least", "about"]);

/** The claim's figure, or undefined for a claim without one. */
export function nepalClaimFigure(claimId: string): ClaimFigure | undefined {
  const md = nepalEntity(claimId)?.metadata;
  const figure = num(md?.figure?.[0]?.value);
  const unit = str(md?.unit?.[0]?.value);
  if (!md || figure === undefined || !unit) return undefined;
  const q = str(md.qualifier?.[0]?.value);
  const opt = <K extends string, V>(k: K, v: V | undefined) => (v === undefined ? {} : ({ [k]: v } as Record<K, V>));
  return {
    figure,
    unit,
    qualifier: q && QUALIFIERS.has(q) ? (q as ClaimFigure["qualifier"]) : "exact",
    ...opt("unitDetail", str(md.unit_detail?.[0]?.value)),
    ...opt("scope", str(md.scope?.[0]?.value)),
    ...opt("asOf", num(md.as_of?.[0]?.value)),
    ...opt("asOfTime", str(md.as_of_time?.[0]?.value)),
    ...opt("asOfBasis", str(md.as_of_basis?.[0]?.value)),
    ...opt("more", str(md.figure_more?.[0]?.value)),
  };
}

/** Same count, same place, same day: comparable only when the day is the
 *  one the count was stated for (stated or derived), not a publication date
 *  standing in for it, and at the same time of day (hourly tolls on one day
 *  are a running count, not a disagreement). */
function comparableKey(f: ClaimFigure): string | undefined {
  if (f.asOf === undefined || (f.asOfBasis !== "stated" && f.asOfBasis !== "derived")) return undefined;
  return [f.unit, f.unitDetail ?? "", (f.scope ?? "").toLowerCase(), f.asOf, f.asOfTime ?? ""].join("|");
}

/** Can both figures hold? "At least 17" holds beside 19; "about 1,000" beside
 *  anything within a tenth of it; exact figures only beside themselves. */
function compatible(a: ClaimFigure, b: ClaimFigure): boolean {
  if (a.figure === b.figure) return true;
  const holds = (x: ClaimFigure, y: ClaimFigure) =>
    (x.qualifier === "at-least" && y.figure >= x.figure) ||
    (x.qualifier === "about" && Math.abs(y.figure - x.figure) <= x.figure * 0.1);
  return holds(a, b) || holds(b, a);
}

let figureIndex: Map<string, string[]> | null = null;
/** Claims by comparable key, built once per load. */
function figuresByKey() {
  if (figureIndex) return figureIndex;
  figureIndex = new Map();
  for (const e of nepalCorpus()?.entities ?? []) {
    if (e.template !== "nepal_claim") continue;
    const f = nepalClaimFigure(e.sharedId);
    const key = f && comparableKey(f);
    if (!key) continue;
    const arr = figureIndex.get(key);
    if (arr) arr.push(e.sharedId);
    else figureIndex.set(key, [e.sharedId]);
  }
  return figureIndex;
}

function conflictsOf(claimId: string, f: ClaimFigure | undefined): FigureConflict[] {
  const out = new Map<string, FigureConflict>();
  const key = f && comparableKey(f);
  if (f && key)
    for (const id of figuresByKey().get(key) ?? []) {
      if (id === claimId) continue;
      const other = nepalClaimFigure(id)!;
      if (!compatible(f, other)) out.set(id, { claimId: id, title: nepalEntity(id)?.title ?? id, figure: other });
    }
  // `conflicts_with`, either direction: a dispute between claims.
  for (const r of nepalRefsByEntity().get(claimId) ?? []) {
    if (r.type !== "conflicts_with") continue;
    const id = r.from === claimId ? r.to : r.from;
    if (id === claimId || out.has(id)) continue;
    const other = nepalClaimFigure(id);
    out.set(id, { claimId: id, title: nepalEntity(id)?.title ?? id, ...(other ? { figure: other } : {}) });
  }
  return [...out.values()].sort((a, b) => (a.figure?.figure ?? Infinity) - (b.figure?.figure ?? Infinity));
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
  const figure = nepalClaimFigure(claimId);
  const out: ClaimEvidence = {
    claimId,
    ...(figure ? { figure } : {}),
    conflicts: conflictsOf(claimId, figure),
    ...(status ? { status } : {}),
    rows: sorted,
    publishers: { supports: count("supports"), disputes: count("disputes"), reports_on: count("reports_on") },
    references,
    bothSides: sorted.filter((r) => r.cells.supports.length && r.cells.disputes.length).length,
  };
  cache.set(claimId, out);
  return out;
}
