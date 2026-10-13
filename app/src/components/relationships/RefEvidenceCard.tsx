import { useAtomValue, useSetAtom } from "jotai";
import { ExternalLink } from "lucide-react";
import { selectionPage, type RefSource, type Reference, type SourceQuote } from "../../data/references";
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

function SourceItem({
  source: s,
  quotes,
  onOpen,
}: {
  source: RefSource;
  quotes: Pick<SourceQuote, "text" | "page">[];
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
        {date && <span className="shrink-0 text-meta text-ink-tertiary tabular-nums">{date}</span>}
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
