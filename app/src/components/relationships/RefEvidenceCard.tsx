import { useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import {
  selectionPage,
  type ContestClaim,
  type ContestLink,
  type RefContest,
  type RefSource,
  type Reference,
  type SourceQuote,
} from "../../data/references";
import { getEntity, getEntityType } from "../../data/entities";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import { breakpointAtom } from "../../atoms/viewport";
import { formatAtPrecision, formatTime } from "../../utils/dateFormat";
import { periodLabel } from "../../utils/relationships";
import { relationDisplayLabel } from "../../utils/inheritance";
import { evidenceSummary, sourcePublisher, verificationBasis } from "../../utils/refEvidence";
import { Modal } from "../shared/Modal";
import { SectionLabel } from "../shared/SectionLabel";
import { PageTag } from "../shared/PageTag";
import { TimeTag } from "../shared/TimeTag";
import { RefStatus } from "./rows/RefStatus";
import { figureContext, figureUnit, figureValue } from "./ClaimEvidence";
import { signedSeconds } from "../metadata/VegasSyncCard";

const day = (s: number, precision: "day" | "month" | "year" = "day") => formatAtPrecision(new Date(s * 1000), precision);

/** The id of the record a reference's quote is from: the stored `from` end. */
const quotedFrom = (r: Reference) => ((r.direction ?? "outgoing") === "outgoing" ? r.sourceEntityId : r.targetEntityId);

/** The evidence behind one row of the Relationships panel: a reference, or the
 *  references an aggregate collapses. Opened from the row's status chip.
 *
 *  What it shows, each part only where the references carry it: the status
 *  and the rule it rests on, the counts (sources, independent publishers with
 *  wire copies once, the dates the sources were published), Research's note,
 *  then every source with its publisher, type, date and address and the
 *  passages it gives about the link's ends. A quote from a record that is not
 *  among the sources, and a time in a recording, come last.
 *
 *  What contests the link follows (`ContestSection`): the links on the other
 *  side and on its own, the figures other claims contradict, a clock off its
 *  moment; then what a claim at its ends replaces.
 *
 *  This card may print counts: the Relationships surface otherwise shows only
 *  the tab count, but the number of independent publishers is the evidence. */
export function RefEvidenceCard({ refs, onClose }: { refs: Reference[]; onClose: () => void }) {
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const setPreview = useSetAtom(previewEntityIdAtom);
  const first = refs[0];
  const target = first ? getEntity(first.targetEntityId) : undefined;
  const summary = evidenceSummary(refs);
  const status = summary.statuses.length === 1 ? summary.statuses[0] : undefined;
  const notes = [...new Set(refs.map((r) => r.note).filter((n): n is string => !!n))];
  const periods = [...new Set(refs.flatMap((r) => (r.period ? [periodLabel(r.period)] : [])))];
  const sourceIds = new Set(summary.sources.map((s) => s.id));

  // Quotes by the source that gives them: the link's own quote where its
  // `from` end is one of the sources, and the sources' other passages.
  const quotesBySource = new Map<string, { text: string; page?: number }[]>();
  const add = (id: string, q: { text: string; page?: number }) => {
    const arr = quotesBySource.get(id) ?? [];
    if (!arr.some((x) => x.text === q.text)) arr.push(q);
    quotesBySource.set(id, arr);
  };
  const looseQuotes: { from: string; text: string; page?: number }[] = [];
  for (const r of refs) {
    if (r.sourceSelection) {
      const from = quotedFrom(r);
      const q = { text: r.sourceSelection.text, page: selectionPage(r.sourceSelection) };
      if (sourceIds.has(from)) add(from, q);
      else if (!looseQuotes.some((x) => x.text === q.text)) looseQuotes.push({ from, ...q });
    }
    for (const q of r.sourceQuotes ?? []) add(q.sourceId, q);
  }
  const anchors = refs.flatMap((r) => (r.mediaAnchor ? [r.mediaAnchor] : []));

  const open = (id: string) => {
    onClose();
    setPreview(id);
  };

  const n = summary.sources.length;
  const facts = [
    n ? `${n} ${n === 1 ? "source" : "sources"}` : "",
    n ? `${summary.independent} independent ${summary.independent === 1 ? "publisher" : "publishers"}` : "",
    summary.copies ? `${summary.copies} from a publisher already counted` : "",
    refs.length > 1 ? `${refs.length} references` : "",
  ].filter(Boolean);
  const reported =
    summary.firstReported === undefined
      ? ""
      : summary.firstReported === summary.lastReported ||
          day(summary.firstReported) === day(summary.lastReported!)
        ? `Reported ${day(summary.firstReported)}`
        : `Reported ${day(summary.firstReported)} to ${day(summary.lastReported!)}`;
  const undated = summary.undated ? `${summary.undated} with no publication date` : "";

  return (
    <Modal
      component="RefEvidenceCard"
      size={phone ? "sm" : "md"}
      portal={false}
      onClose={onClose}
      title="Evidence"
      subtitle={[first ? relationDisplayLabel(first.relationType) : "", target?.title ?? ""].filter(Boolean).join(" · ")}
      bodyClassName="py-4 space-y-4 overflow-y-auto"
    >
      <section data-part="status" aria-label="Status" className="space-y-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {summary.statuses.map((s) => (
            <RefStatus key={s} verification={s} />
          ))}
          {periods.length > 0 && (
            <span className="text-meta text-ink-tertiary tabular-nums">Held {periods.join(", ")}</span>
          )}
        </div>
        {status && <p className="text-xs text-ink-secondary">{verificationBasis(status, summary.independent)}</p>}
        {(facts.length > 0 || reported) && (
          <p data-part="facts" className="text-xs text-ink-tertiary tabular-nums">
            {[...facts, reported, undated].filter(Boolean).join(" · ")}
          </p>
        )}
      </section>

      {notes.length > 0 && (
        <section data-part="notes" className="space-y-1.5">
          <SectionLabel>{notes.length === 1 ? "Note" : "Notes"}</SectionLabel>
          {notes.map((note) => (
            <p key={note} className="text-xs text-ink-secondary leading-relaxed">
              {note}
            </p>
          ))}
        </section>
      )}

      <ContestSection refs={refs} onOpen={open} />
      <SuccessionSection refs={refs} onOpen={open} />

      {n > 0 && (
        <section data-part="sources" className="space-y-1.5">
          <SectionLabel>Sources</SectionLabel>
          <ul className="space-y-3">
            {summary.sources.map((s) => (
              <SourceItem key={s.id} source={s} quotes={quotesBySource.get(s.id) ?? []} onOpen={open} />
            ))}
          </ul>
        </section>
      )}

      {(looseQuotes.length > 0 || anchors.length > 0) && (
        <section data-part="passages" className="space-y-1.5">
          <SectionLabel>{anchors.length > 0 && looseQuotes.length === 0 ? "In the recording" : "Passages"}</SectionLabel>
          <ul className="space-y-2">
            {looseQuotes.map((q) => (
              <li key={q.text} className="space-y-1">
                <Quote text={q.text} page={q.page} />
                <RecordLink id={q.from} onOpen={open} />
              </li>
            ))}
            {anchors.map((a) => (
              <li key={`${a.recordingId}-${a.offset}`} className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-0.5">
                  {(a.label || a.clock !== undefined) && (
                    <p className="text-xs text-ink-secondary">
                      {[a.label, a.clock !== undefined ? formatTime(a.clock) : ""]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                  <RecordLink id={a.recordingId} onOpen={open} />
                </div>
                <TimeTag anchor={a} recordingTitle={getEntity(a.recordingId)?.title} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Modal>
  );
}

/** Every contest of `refs`, merged: one list per side, each link once. */
function mergeContests(refs: Reference[]) {
  const own = new Set(refs.map((r) => r.id));
  const opposing = new Map<string, ContestLink>();
  const paired = new Map<string, ContestLink>();
  const figures = new Map<string, RefContest["figures"][number]>();
  const competing = new Map<string, ContestClaim>();
  const notes = new Set<string>();
  const missing = new Set<string>();
  const clocks: (NonNullable<RefContest["clock"]> & { refId: string })[] = [];
  const contested = refs.filter((r) => r.contest);
  for (const r of contested) {
    const c = r.contest!;
    for (const l of c.opposing) if (!own.has(l.refId)) opposing.set(l.refId, l);
    for (const l of c.paired) if (!own.has(l.refId) && !opposing.has(l.refId)) paired.set(l.refId, l);
    for (const f of c.figures) if (!figures.has(f.claim.claimId)) figures.set(f.claim.claimId, f);
    for (const x of c.competing) competing.set(x.claimId, x);
    if (c.note) notes.add(c.note);
    if (c.missing) missing.add(c.missing);
    if (c.clock) clocks.push({ ...c.clock, refId: r.id });
  }
  return {
    any: contested.length > 0,
    // The dispute is the claim's when every contested link inherits it.
    claimInherited: contested.length > 0 && contested.every((r) => r.contest!.claimInherited),
    disputed: refs.some((r) => r.verification === "disputed"),
    opposing: [...opposing.values()],
    paired: [...paired.values()],
    figures: [...figures.values()],
    competing: [...competing.values()],
    notes: [...notes],
    missing: [...missing],
    clocks,
  };
}

/** What contests the row's links. The heading says how: "Contested by" on a
 *  disputed link, "Disputed by" on a link that is not disputed itself but
 *  has something against it, "Claim contested" where the dispute is the
 *  claim's at its end and not the link's. */
function ContestSection({ refs, onOpen }: { refs: Reference[]; onOpen: (id: string) => void }) {
  const c = mergeContests(refs);
  if (!c.any) return null;
  const heading = c.claimInherited ? "Claim contested" : c.disputed ? "Contested by" : "Disputed by";
  const ends = new Set(refs.flatMap((r) => [r.sourceEntityId, r.targetEntityId]));
  return (
    <section data-part="contest" aria-label={heading} className="space-y-2">
      <SectionLabel>{heading}</SectionLabel>
      {c.notes.map((note) => (
        <p key={note} className="text-xs text-ink-secondary leading-relaxed">
          {note}
        </p>
      ))}
      {c.missing.map((m) => (
        <p key={m} data-part="contest-missing" className="text-xs text-ink-tertiary leading-relaxed">
          No reason recorded. {m.replace(" ", "\u00a0")}
        </p>
      ))}
      {c.clocks.map((k) => (
        <p key={k.refId} data-part="contest-clock" className="text-xs text-ink-secondary">
          <span aria-hidden className="inline-block w-1.5 h-1.5 mr-1.5 mb-px rounded-full" style={{ backgroundColor: "var(--warning)" }} />
          This recording's clock is <span className="tabular-nums">{signedSeconds(k.deviation)}</span> from the
          moment's median across recordings, <span className="tabular-nums">{formatTime(k.median)}</span>. The&nbsp;sync
          check allows 2&nbsp;s.
        </p>
      ))}
      {c.figures.map((f) => (
        <div key={f.claim.claimId} data-part="contest-figures" className="space-y-1">
          <ClaimLine claim={f.claim} onOpen={onOpen} />
          <p className="text-meta text-ink-tertiary">Conflicts with</p>
          <ul className="space-y-1">
            {f.conflicts.map((x) => (
              <li key={x.claimId}>
                <ClaimLine claim={x} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {c.competing.length > 0 && (
        <div data-part="contest-competing" className="space-y-1">
          <p className="text-meta text-ink-tertiary">Conflicting claims</p>
          <ul className="space-y-1">
            {c.competing.map((x) => (
              <li key={x.claimId}>
                <ClaimLine claim={x} onOpen={onOpen} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <ContestList caption="Other side" links={c.opposing} ends={ends} onOpen={onOpen} />
      <ContestList caption="Same side" links={c.paired} ends={ends} onOpen={onOpen} />
    </section>
  );
}

/** A side of the contest, grouped by what each link says and about which
 *  record: "Disputes · <claim>". */
function ContestList({
  caption,
  links,
  ends,
  onOpen,
}: {
  caption: string;
  links: ContestLink[];
  ends: Set<string>;
  onOpen: (id: string) => void;
}) {
  if (!links.length) return null;
  const groups = new Map<string, ContestLink[]>();
  for (const l of links) {
    const key = `${l.relationType}\u0000${l.aboutId}`;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return (
    <div data-part="contest-side" className="space-y-1.5">
      <p className="text-meta font-medium text-ink-secondary">{caption}</p>
      {[...groups.values()].map((group) => {
        const { relationType, aboutId } = group[0];
        const about = ends.has(aboutId) ? "" : (getEntity(aboutId)?.title ?? aboutId);
        const label = relationDisplayLabel(relationType);
        return (
          <div key={`${relationType}-${aboutId}`} className="space-y-2">
            <p className="text-meta text-ink-tertiary">
              <span className="capitalize">{label}</span>
              {about ? ` · ${about}` : ""}
            </p>
            <ul className="space-y-3">
              {group.map((l) =>
                l.source ? (
                  <SourceItem
                    key={l.refId}
                    source={l.source}
                    quotes={l.quote ? [{ text: l.quote }] : []}
                    status={l.verification}
                    onOpen={onOpen}
                  />
                ) : (
                  <li key={l.refId} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <RecordLink id={l.recordId} onOpen={onOpen} />
                      {l.verification && <RefStatus verification={l.verification} />}
                    </div>
                    {l.quote && <Quote text={l.quote} />}
                  </li>
                ),
              )}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/** A claim, its figure where it has one, and where and when it counts. */
function ClaimLine({ claim, onOpen }: { claim: ContestClaim; onOpen: (id: string) => void }) {
  const f = claim.figure;
  return (
    <div className="space-y-0.5">
      <RecordLink id={claim.claimId} label={claim.title} onOpen={onOpen} />
      {f && (
        <p className="ps-3.5 text-xs">
          <span className="font-medium text-ink tabular-nums">
            {figureValue(f)} {figureUnit(f)}
          </span>
          <span className="text-ink-tertiary"> · {figureContext(f)}</span>
        </p>
      )}
    </div>
  );
}

/** What a claim at the link's ends replaces (Vegas `supersedes`): a later
 *  count, not a dispute. */
function SuccessionSection({ refs, onOpen }: { refs: Reference[]; onOpen: (id: string) => void }) {
  const pairs = new Map<string, NonNullable<Reference["succession"]>[number]>();
  for (const r of refs) for (const p of r.succession ?? []) pairs.set(`${p.newer.claimId}>${p.older.claimId}`, p);
  if (!pairs.size) return null;
  return (
    <section data-part="succession" className="space-y-1.5">
      <SectionLabel>Replaces</SectionLabel>
      <ul className="space-y-2">
        {[...pairs.values()].map((p) => (
          <li key={`${p.newer.claimId}>${p.older.claimId}`} className="space-y-1">
            <ClaimLine claim={p.newer} onOpen={onOpen} />
            <p className="text-meta text-ink-tertiary">replaces</p>
            <ClaimLine claim={p.older} onOpen={onOpen} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceItem({
  source: s,
  quotes,
  status,
  onOpen,
}: {
  source: RefSource;
  quotes: Pick<SourceQuote, "text" | "page">[];
  /** The status of the source's link, where the item stands for one. */
  status?: Reference["verification"];
  onOpen: (id: string) => void;
}) {
  const copyOf = s.syndicatedFrom && s.syndicatedFrom.toLowerCase() !== (s.publisher ?? "").toLowerCase() ? s.syndicatedFrom : "";
  const date =
    s.published !== undefined
      ? day(s.published, s.datePrecision ?? "day")
      : s.accessed !== undefined
        ? `Read ${day(s.accessed)}, no publication date`
        : "";
  return (
    <li data-part="source" className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 text-xs">
          <span className="font-medium text-ink">{sourcePublisher(s)}</span>
          {s.publisherType && <span className="text-ink-tertiary"> · {s.publisherType}</span>}
        </p>
        <span className="shrink-0 flex items-center gap-1.5">
          {status && <RefStatus verification={status} />}
          {date && <span className="text-meta text-ink-tertiary tabular-nums">{date}</span>}
        </span>
      </div>
      <div className="flex items-start gap-1.5">
        <RecordLink id={s.id} label={s.title} onOpen={onOpen} />
        {s.url && (
          <a
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${s.title} at its source (opens in a new tab)`}
            className="shrink-0 p-0.5 rounded text-ink-tertiary hover:text-ink cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            <ExternalLink size={12} aria-hidden />
          </a>
        )}
      </div>
      {copyOf && (
        // As the source states it: a wire name, "with inputs from Reuters, PTI",
        // "agency copy; agency not named on page".
        <p data-part="syndication" className="text-meta text-ink-tertiary">
          Syndication: {copyOf}
        </p>
      )}
      {quotes.map((q) => (
        <Quote key={q.text} text={q.text} page={q.page} />
      ))}
    </li>
  );
}

/** A record named in the card: a button that opens it in the preview. */
function RecordLink({ id, label, onOpen }: { id: string; label?: string; onOpen: (id: string) => void }) {
  const e = getEntity(id);
  const color = e ? getEntityType(e.typeId)?.color : undefined;
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="min-w-0 flex items-baseline gap-1.5 text-left text-xs text-ink-secondary hover:text-ink hover:underline cursor-pointer rounded
        focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
    >
      <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0 translate-y-px" style={{ backgroundColor: color ?? "var(--text-muted)" }} />
      <span className="line-clamp-2">{label ?? e?.title ?? id}</span>
    </button>
  );
}

function Quote({ text, page }: { text: string; page?: number }) {
  return (
    <div data-part="quote" className="flex items-start justify-between gap-2 px-2 py-1.5 bg-warm/50 rounded">
      <p className="min-w-0 text-xs text-ink-secondary leading-relaxed italic">{text}</p>
      {page !== undefined && <PageTag page={page} />}
    </div>
  );
}
