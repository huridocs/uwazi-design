// What a case exports: one entry per pinned record, each with the passages
// that support it. Pure: callers pass the entities and the corpus's
// references, so the Case panel, the exports and the stories share it.
import type { Entity } from "../data/entities";
import { getEntity, getEntityType } from "../data/entities";
import { selectionPage, type Reference, type Verification } from "../data/references";
import { formatAtPrecision } from "./dateFormat";
import { VERIFICATION_LABEL } from "./relationships";
import { isNepalEntity } from "../data/nepal/profile";
import { nepalDoc, nepalEntity, nepalRefsByEntity } from "../data/nepal/load";
import { nepalSourceLink } from "../data/nepal/sourceLink";
import { isCejilEntity } from "../data/cejil/profile";
import { STANCES, STANCE_LABEL, type Stance } from "../data/nepal/claimEvidence";

/** Where a record can be read and who put it there. */
export interface RecordSource {
  url?: string;
  publisher?: string;
  /** "Published 2025/07/29", "Accessed …", or the record's own date. */
  date?: string;
}

/** One cited passage: the record it is quoted from, its stance, and the
 *  link's status. */
export interface Citation {
  /** The record the quote is from. */
  sourceId: string;
  sourceTitle: string;
  url?: string;
  publisher?: string;
  date?: string;
  /** The link's status where the collection records one. */
  status?: string;
  /** Whether the quote supports or disputes the claim it is cited for, or
   *  reports on it without a side (Nepal's `supports` / `disputes` /
   *  `reports_on` links). Absent for links that take no stance. */
  stance?: Stance;
  /** The claim the stance is about, when it is not the cited record itself
   *  (a pinned source's quote supports some other record). */
  stanceOn?: string;
  quote: string;
  /** "p. 14", where the quote was found on a page of a document. */
  page?: string;
}

export interface CaseEntry {
  id: string;
  title: string;
  template: string;
  /** The record's verification, else its publishing status. */
  status?: string;
  /** The status as a key, for the tone (`confirmed`, `single-source`, …). */
  statusKey?: string;
  source: RecordSource;
  citations: Citation[];
  /** False when the record is no longer in the collection (deleted since). */
  found: boolean;
}

const STATUS_LONG: Record<string, string> = {
  ...VERIFICATION_LABEL,
  misattributed: "Misattributed",
  unverified: "Unverified",
};

const CEJIL_PUBLISHER = "CEJIL";
const CEJIL_ORIGIN = "https://summa.cejil.org";

function recordDate(e: Entity): string | undefined {
  if (!e.createdAt) return undefined;
  const d = new Date(e.createdAt);
  if (Number.isNaN(d.getTime())) return undefined;
  return formatAtPrecision(d, e.datePrecision ?? "day");
}

/** The record's status: Nepal's verification, else published or restricted. */
function statusOf(e: Entity): { status?: string; statusKey?: string } {
  if (isNepalEntity(e.id)) {
    const n = nepalEntity(e.id);
    const v = (n?.metadata.verification ?? n?.metadata.verification_status)?.[0]?.value;
    if (typeof v === "string" && STATUS_LONG[v]) return { status: STATUS_LONG[v], statusKey: v };
  }
  if (e.published === undefined) return {};
  return e.published ? { status: "Published", statusKey: "published" } : { status: "Restricted", statusKey: "restricted" };
}

/** Where a record is published. Nepal: a source's web page, or the
 *  government PDF a record carries. CEJIL: the record on summa.cejil.org,
 *  which this corpus was taken from. Other collections have no address. */
export function recordSource(id: string): RecordSource {
  const e = getEntity(id);
  if (isNepalEntity(id)) {
    const link = nepalSourceLink(id);
    if (link) return { url: link.url, publisher: link.publisher, date: link.dateLine };
    const docId = nepalEntity(id)?.docs?.[0];
    const doc = docId ? nepalDoc(docId) : undefined;
    if (doc)
      return {
        url: doc.sourceUrl,
        publisher: doc.publisher,
        date: doc.published ? `Published ${formatAtPrecision(new Date(doc.published * 1000), "day")}` : e && recordDate(e),
      };
    return { date: e && recordDate(e) };
  }
  if (isCejilEntity(id)) return { url: `${CEJIL_ORIGIN}/entity/${id}`, publisher: CEJIL_PUBLISHER, date: e && recordDate(e) };
  return { date: e && recordDate(e) };
}

/** The quoted passages behind a record. Nepal: every reference with a quote
 *  that touches the record, cited to the record the quote is from (the
 *  reference's `from`), with its stance, the link's status and the PDF page
 *  where the quote was found. Other collections: the record's anchored
 *  references, quoted from the record's own document. */
function citationsOf(id: string, refs: readonly Reference[]): Citation[] {
  const out: Citation[] = [];
  if (isNepalEntity(id)) {
    for (const r of nepalRefsByEntity().get(id) ?? []) {
      if (!r.quote) continue;
      const src = recordSource(r.from);
      const stance = (STANCES as string[]).includes(r.type) ? (r.type as Stance) : undefined;
      out.push({
        sourceId: r.from,
        sourceTitle: getEntity(r.from)?.title ?? r.from,
        url: src.url,
        publisher: src.publisher,
        date: src.date,
        status: STATUS_LONG[r.verification],
        ...(stance ? { stance, ...(r.to !== id ? { stanceOn: getEntity(r.to)?.title ?? r.to } : {}) } : {}),
        quote: r.quote,
        page: r.file && r.page ? `p. ${r.page}` : undefined,
      });
    }
    return dedupe(out);
  }
  const src = recordSource(id);
  const title = getEntity(id)?.title ?? id;
  for (const r of refs) {
    const quote = r.sourceSelection?.text;
    if (!quote) continue;
    const page = selectionPage(r.sourceSelection);
    out.push({
      sourceId: id,
      sourceTitle: title,
      url: src.url,
      publisher: src.publisher,
      date: src.date,
      status: r.verification ? STATUS_LONG[r.verification as Verification] : undefined,
      quote,
      page: page ? `p. ${page}` : undefined,
    });
  }
  return dedupe(out);
}

/** A quote cited twice from one record (two links resting on one sentence)
 *  is one citation, unless the two links take different stances. */
function dedupe(list: Citation[]): Citation[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = `${c.sourceId}\u0000${c.quote}\u0000${c.page ?? ""}\u0000${c.stance ?? ""}\u0000${c.stanceOn ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/** The case's entries, in pin order. `refsOf` gives a record's references
 *  (`referencesFor`); only non-Nepal records read it. */
export function buildCaseEntries(ids: readonly string[], refsOf: (id: string) => readonly Reference[]): CaseEntry[] {
  return ids.map((id) => {
    const e = getEntity(id);
    if (!e) return { id, title: id, template: "", source: {}, citations: [], found: false };
    return {
      id,
      title: e.title,
      template: getEntityType(e.typeId)?.name ?? "",
      ...statusOf(e),
      source: recordSource(id),
      citations: citationsOf(id, refsOf(id)),
      found: true,
    };
  });
}

/* ── Exports ────────────────────────────────────────────────────────────── */

const mdEscape = (s: string) => s.replace(/([\\`*_[\]])/g, "\\$1");

/** "Disputes", or "Supports “19 killed in Kathmandu”" when the claim is
 *  another record. */
export function stanceText(c: Citation): string | undefined {
  if (!c.stance) return undefined;
  return c.stanceOn ? `${STANCE_LABEL[c.stance]} “${c.stanceOn}”` : STANCE_LABEL[c.stance];
}

/** One citation as a sentence: Stance: “quote” — Source, Publisher, date. URL. Status. p. N */
function citationParts(c: Citation): { stance?: string; quote: string; rest: string[] } {
  const where = [c.sourceTitle, c.publisher, c.date].filter(Boolean).join(", ");
  return { stance: stanceText(c), quote: c.quote, rest: [where, c.url, c.status, c.page].filter(Boolean) as string[] };
}

function headLine(e: CaseEntry): string[] {
  return [e.template, e.status, e.source.publisher, e.source.date].filter(Boolean) as string[];
}

/** The citation list as Markdown: a heading per record, its address, then its
 *  passages as a list. */
export function citationsMarkdown(name: string, collection: string, entries: CaseEntry[], notes = ""): string {
  const lines: string[] = [`# ${mdEscape(name)}`, "", `${collection} · exported ${new Date().toISOString().slice(0, 10)}`, ""];
  entries.forEach((e, i) => {
    lines.push(`## ${i + 1}. ${mdEscape(e.title)}`, "");
    const head = headLine(e);
    if (head.length) lines.push(head.join(" · "));
    if (e.source.url) lines.push(`<${e.source.url}>`);
    if (head.length || e.source.url) lines.push("");
    if (!e.found) lines.push("_No longer in the collection._", "");
    for (const c of e.citations) {
      const { stance, quote, rest } = citationParts(c);
      const [where, ...more] = rest;
      const url = c.url ? ` <${c.url}>` : "";
      const tail = more.filter((x) => x !== c.url);
      const lead = stance ? `**${mdEscape(stance)}:** ` : "";
      lines.push(`- ${lead}“${mdEscape(quote)}” — ${mdEscape(where)}.${url}${tail.length ? ` ${tail.join(" · ")}` : ""}`);
    }
    if (e.citations.length) lines.push("");
  });
  if (notes.trim()) lines.push("## Notes", "", notes.trim(), "");
  return lines.join("\n");
}

/** The same list as plain text, for pasting into a document or an e-mail. */
export function citationsText(name: string, collection: string, entries: CaseEntry[]): string {
  const lines: string[] = [name, `${collection} · exported ${new Date().toISOString().slice(0, 10)}`, ""];
  entries.forEach((e, i) => {
    lines.push(`${i + 1}. ${e.title}`);
    const head = headLine(e);
    if (head.length) lines.push(`   ${head.join(" · ")}`);
    if (e.source.url) lines.push(`   ${e.source.url}`);
    for (const c of e.citations) {
      const { stance, quote, rest } = citationParts(c);
      lines.push(`   – ${stance ? `${stance}: ` : ""}“${quote}” — ${rest.join(" · ")}`);
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd() + "\n";
}

/** A CSV cell, RFC 4180, with spreadsheet formulas neutralised (as
 *  `exportCsv.ts` does). */
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** The pinned records as CSV: one row each, with where they are published and
 *  how many passages the citation list quotes for them. */
export function caseCsv(entries: CaseEntry[], pinnedAt: (id: string) => number | undefined): string {
  const head = ["Title", "Template", "Status", "Date", "Publisher", "Source URL", "Quoted passages", "Pinned", "Id"];
  const rows = entries.map((e) => {
    const at = pinnedAt(e.id);
    return [
      e.title,
      e.template,
      e.status ?? "",
      e.source.date ?? "",
      e.source.publisher ?? "",
      e.source.url ?? "",
      String(e.citations.length),
      at ? new Date(at).toISOString().slice(0, 10) : "",
      e.id,
    ];
  });
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}
