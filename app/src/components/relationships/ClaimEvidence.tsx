import { useState, type ReactNode } from "react";
import { useSetAtom } from "jotai";
import { previewEntityIdAtom } from "../../atoms/entityPreview";
import {
  STANCES,
  STANCE_LABEL,
  type ClaimEvidence,
  type ClaimFigure,
  type EvidenceItem,
  type PublisherRow,
  type Stance,
} from "../../data/nepal/claimEvidence";
import { formatAtPrecision } from "../../utils/dateFormat";
import { noWidow } from "../../utils/typography";
import { SectionLabel } from "../shared/SectionLabel";
import { RefStatus } from "./rows/RefStatus";

/** Stance colours, on F1's status tones: support reads as the confirmed
 *  green, dispute as the disputed amber, a report without a side as neutral. */
const STANCE_FILL: Record<Stance, string> = {
  supports: "var(--success)",
  disputes: "var(--warning)",
  reports_on: "var(--border-primary)",
};

/** The strength bar's length per independent publisher, in rem, and the
 *  count past which it stops growing. */
const BAR_UNIT = 1.5;
const BAR_CAP = 16;

/** Items a cell shows before "and N more". */
const CELL_CAP = 3;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Supported by 4 independent publishers, disputed by 3." and what follows:
 *  publishers on both sides, reports without a side, folded wire copies. */
export function evidenceSentence(ev: ClaimEvidence): string {
  const { supports: s, disputes: d, reports_on: r } = ev.publishers;
  const parts: string[] = [];
  if (s && d) parts.push(`Supported by ${plural(s, "independent publisher")}, disputed by ${d}.`);
  else if (s) parts.push(`Supported by ${plural(s, "independent publisher")}; none disputes it.`);
  else if (d) parts.push(`Disputed by ${plural(d, "independent publisher")}; none supports it.`);
  if (ev.bothSides) parts.push(`${plural(ev.bothSides, "publisher")} ${ev.bothSides === 1 ? "appears" : "appear"} on both sides.`);
  if (r) parts.push(`${plural(r, "publisher")} ${r === 1 ? "reports" : "report"} on it without taking a side.`);
  const folded = ev.rows.filter((x) => x.via.length).map((x) => `${x.via.join(", ")} under ${x.publisher}`);
  if (folded.length) parts.push(`Wire copies count once: ${folded.join("; ")}.`);
  // A sentence's first word is bound to the next, so none is left alone at
  // the end of a line after a full stop.
  return parts.map((x, i) => (i ? x.replace(" ", "\u00a0") : x)).join(" ");
}

const UNIT_WORD: Record<string, string> = {
  killed: "killed",
  injured: "injured",
  arrested: "arrested",
  detained: "detained",
  missing: "missing",
};

/** "At least 76", "About 2,000", "NPR 11 billion". Amounts of a million or
 *  more are written in words, as the sources write them, and fit the figure
 *  column ("NPR 3,000,000,000,000" ran into the title). */
export function figureValue(f: ClaimFigure): string {
  const n =
    f.unit === "damage-NPR" && f.figure >= 1e6
      ? // "3 trillion" stays together on a wrap.
        f.figure.toLocaleString("en", { notation: "compact", compactDisplay: "long", maximumSignificantDigits: 4 }).replace(" ", "\u00a0")
      : f.figure.toLocaleString("en");
  const value = f.unit === "damage-NPR" ? `NPR ${n}` : n;
  return f.qualifier === "at-least" ? `At least ${value}` : f.qualifier === "about" ? `About ${value}` : value;
}

/** What the figure counts: "killed", "inmates escaped", "damage or loss". */
export function figureUnit(f: ClaimFigure): string {
  if (f.unit === "damage-NPR") return "damage or loss";
  return UNIT_WORD[f.unit] ?? f.unitDetail ?? f.unit;
}

/** Where, and when: ["Nationwide", "as of 2025/09/08, night"]. A
 *  publication date standing in for the count's day says so. The words of the
 *  when are bound with no-break spaces, so "as of" never ends a line. */
export function figureContextParts(f: ClaimFigure): string[] {
  const parts: string[] = [];
  if (f.scope) parts.push(f.scope === "national" ? "Nationwide" : f.scope);
  if (f.asOf !== undefined) {
    const day = formatAtPrecision(new Date(f.asOf * 1000), "day");
    const when = f.asOfTime ? `${day}, ${f.asOfTime}` : day;
    parts.push(f.asOfBasis === "published" ? `reported\u00a0${when}` : `as\u00a0of\u00a0${when}`);
  } else parts.push("date not known");
  return parts;
}

/** The same on one line: "Nationwide · as of 2025/09/08". The separator's
 *  space after the dot does not break, so a wrap leaves "Nationwide" at the
 *  line end, never "Nationwide ·". */
export function figureContext(f: ClaimFigure): string {
  return figureContextParts(f).join(" ·\u00a0");
}

/** Other claims counting the same thing, place and day with a figure both
 *  cannot hold. Each opens its claim. */
function FigureConflicts({ ev, onOpen }: { ev: ClaimEvidence; onOpen: (id: string) => void }) {
  if (!ev.conflicts.length) return null;
  return (
    <p data-part="figure-conflicts" className="text-xs text-ink-secondary">
      <span aria-hidden className="inline-block w-1.5 h-1.5 mr-1.5 mb-px rounded-full" style={{ backgroundColor: "var(--warning)" }} />
      Disagrees with{" "}
      {ev.conflicts.map((c, i) => (
        <span key={c.claimId}>
          <button
            type="button"
            onClick={() => onOpen(c.claimId)}
            className="inline text-left text-ink rounded-md cursor-pointer hover:underline decoration-border underline-offset-2
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            {c.title}
          </button>
          {c.figure && <span className="text-ink-tertiary tabular-nums"> ({figureValue(c.figure).toLowerCase()})</span>}
          {i < ev.conflicts.length - 1 ? ", " : ""}
        </span>
      ))}
    </p>
  );
}

/** The claim's figure as one line: value and unit, then where and when. */
function FigureLine({ f, className = "" }: { f: ClaimFigure; className?: string }) {
  return (
    <p data-part="figure" className={`flex flex-wrap items-baseline gap-x-1.5 min-w-0 ${className}`}>
      <span className="text-sm font-semibold text-ink tabular-nums">
        {figureValue(f)} {figureUnit(f)}
      </span>
      <span className="text-xs text-ink-tertiary">{figureContext(f)}</span>
    </p>
  );
}

/** The figure column's cell in the Library: the number on top, so a column of
 *  claims reads as a column of counts. */
export function FigureCell({ f }: { f?: ClaimFigure }) {
  if (!f)
    return (
      <span className="text-sm text-ink-tertiary" aria-label="No figure">
        —
      </span>
    );
  return (
    <div data-part="figure-cell" className="flex flex-col min-w-0">
      <span className="text-sm font-semibold text-ink tabular-nums">{figureValue(f)}</span>
      <span className="text-xs text-ink-secondary">{figureUnit(f)}</span>
      {/* Narrow: where and when on lines of their own. */}
      {figureContextParts(f).map((part) => (
        <span key={part} className="text-meta text-ink-tertiary">
          {part}
        </span>
      ))}
    </div>
  );
}

/** Independent publishers per stance as one bar, in the stance colours. */
export function EvidenceStrengthBar({ ev, className = "" }: { ev: ClaimEvidence; className?: string }) {
  const total = STANCES.reduce((n, s) => n + ev.publishers[s], 0);
  const label = STANCES.filter((s) => ev.publishers[s])
    .map((s) => `${STANCE_LABEL[s]} ${ev.publishers[s]}`)
    .join(", ");
  return (
    <div
      data-component="EvidenceStrengthBar"
      role="img"
      aria-label={`Independent publishers: ${label}`}
      className={`flex h-1.5 gap-0.5 rounded-full overflow-hidden shrink-0 ${className}`}
      // A fixed length per publisher, so two claims' bars compare: eight
      // publishers draw twice the length of four. Capped at sixteen.
      style={{ width: `min(${Math.min(total, BAR_CAP) * BAR_UNIT}rem, 100%)` }}
    >
      {STANCES.map((s) =>
        ev.publishers[s] ? (
          <span
            key={s}
            data-stance={s}
            className="h-full"
            style={{ flexGrow: ev.publishers[s] / total, backgroundColor: STANCE_FILL[s] }}
          />
        ) : null,
      )}
    </div>
  );
}

function StanceDot({ stance }: { stance: Stance }) {
  return <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STANCE_FILL[stance] }} />;
}

function itemDate(item: EvidenceItem) {
  return item.date ? formatAtPrecision(new Date(item.date * 1000), item.datePrecision ?? "day") : "";
}

function EvidenceCellItem({ item, onOpen }: { item: EvidenceItem; onOpen: (id: string) => void }) {
  const date = itemDate(item);
  return (
    <li data-part="evidence-item" className="min-w-0">
      <button
        type="button"
        onClick={() => onOpen(item.sourceId)}
        aria-label={`Open source: ${item.sourceTitle}`}
        className="text-left text-xs leading-snug rounded-md cursor-pointer hover:underline decoration-border underline-offset-2
          focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
      >
        {item.quote ? (
          <span className="text-ink">“{noWidow(item.quote)}”</span>
        ) : (
          <span className="text-ink-secondary">{item.sourceTitle}</span>
        )}
      </button>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-meta text-ink-tertiary">
        {item.copy && <span>{item.publisher} copy</span>}
        {item.copy && date && <span aria-hidden>·</span>}
        {date && <span className="tabular-nums">{date}</span>}
        <RefStatus verification={item.verification} />
      </div>
    </li>
  );
}

function EvidenceCell({
  items,
  expanded,
  onOpen,
}: {
  items: EvidenceItem[];
  expanded: boolean;
  onOpen: (id: string) => void;
}) {
  const shown = expanded ? items : items.slice(0, CELL_CAP);
  return (
    <ul className="flex flex-col gap-2 min-w-0">
      {shown.map((item) => (
        <EvidenceCellItem key={item.refId} item={item} onOpen={onOpen} />
      ))}
    </ul>
  );
}

function PublisherRowView({
  row,
  stances,
  columns,
  onOpen,
}: {
  row: PublisherRow;
  stances: Stance[];
  columns: string;
  onOpen: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = stances.reduce((n, s) => n + Math.max(0, row.cells[s].length - CELL_CAP), 0);
  const both = row.cells.supports.length > 0 && row.cells.disputes.length > 0;
  return (
    <li
      data-part="publisher-row"
      data-both-sides={both || undefined}
      className={`grid gap-x-4 gap-y-2 px-2 py-2.5 rounded-md ${both ? "bg-warm/60" : ""}
        grid-cols-1 @2xl/evidence:[grid-template-columns:var(--ev-cols)]`}
      style={{ ["--ev-cols" as string]: columns }}
    >
      <div className="min-w-0">
        <h4 className="text-sm font-medium text-ink">{row.publisher}</h4>
        <p className="text-xs text-ink-tertiary">
          {row.publisherType ?? "Publisher type not recorded"}
          {both && <> · on both sides</>}
        </p>
        {row.via.length > 0 && <p className="text-xs text-ink-tertiary">Copies in {row.via.join(", ")}</p>}
        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((x) => !x)}
            aria-expanded={expanded}
            className="mt-1 text-xs font-medium text-ink-secondary hover:text-ink rounded-md cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            {expanded ? "Show fewer" : `and ${hidden} more`}
          </button>
        )}
      </div>
      {stances.map((s) => (
        <div key={s} data-stance={s} className={`min-w-0 ${row.cells[s].length ? "" : "hidden @2xl/evidence:block"}`}>
          {/* The stance names the cell where the header row is not drawn. */}
          <SectionLabel as="h5" icon={<StanceDot stance={s} />} className="mb-1 @2xl/evidence:sr-only">
            {STANCE_LABEL[s]}
          </SectionLabel>
          <EvidenceCell items={row.cells[s]} expanded={expanded} onOpen={onOpen} />
        </div>
      ))}
    </li>
  );
}

/** Publishers against stance. Wide: a grid with a header row. Narrow (a phone,
 *  a slim pane): each publisher stacks its stances under a label.
 *  The columns are the stance list plus the publisher; a later column (a
 *  claim's structured figure per source) goes in `columns` and the cell. */
export function ClaimEvidenceMatrix({ ev, onOpen }: { ev: ClaimEvidence; onOpen: (id: string) => void }) {
  // A stance no source takes is not a column.
  const stances = STANCES.filter((s) => ev.references[s] > 0);
  const columns = `minmax(8rem, 0.8fr) ${stances.map(() => "minmax(0, 1fr)").join(" ")}`;
  return (
    <div data-component="ClaimEvidenceMatrix" className="@container/evidence">
      <div
        aria-hidden
        className="hidden @2xl/evidence:grid gap-x-4 px-2 pb-1.5 mb-1 border-b border-border-soft"
        style={{ gridTemplateColumns: columns }}
      >
        <SectionLabel as="span">Publisher</SectionLabel>
        {stances.map((s) => (
          <SectionLabel key={s} as="span" icon={<StanceDot stance={s} />}>
            {STANCE_LABEL[s]}
          </SectionLabel>
        ))}
      </div>
      <ol className="flex flex-col gap-px">
        {ev.rows.map((row) => (
          <PublisherRowView key={row.key} row={row} stances={stances} columns={columns} onOpen={onOpen} />
        ))}
      </ol>
    </div>
  );
}

/** The claim's head: status chip, the sentence and the bar. */
export function ClaimEvidenceSummary({
  ev,
  title,
  aside,
  onOpen,
  figureLineClass = "",
}: {
  ev: ClaimEvidence;
  title?: ReactNode;
  aside?: ReactNode;
  onOpen: (id: string) => void;
  /** Where a figure column shows the figure (the Library), hides the line
   *  at the widths that draw the column. */
  figureLineClass?: string;
}) {
  return (
    <div data-part="evidence-summary" className="flex flex-col gap-1.5 min-w-0 px-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0">
        {title ?? <SectionLabel as="h3">Evidence</SectionLabel>}
        <RefStatus verification={ev.status} />
      </div>
      {ev.figure && <FigureLine f={ev.figure} className={figureLineClass} />}
      <FigureConflicts ev={ev} onOpen={onOpen} />
      <p className="text-xs text-ink-secondary">{evidenceSentence(ev)}</p>
      <div className="flex items-center gap-3 min-w-0">
        <EvidenceStrengthBar ev={ev} />
        {aside}
      </div>
    </div>
  );
}

/** The Claim record's first Relationships block. Renders nothing for a record
 *  no source takes a stance on (every CEJIL and Sample record). */
export function ClaimEvidenceBlock({ ev }: { ev: ClaimEvidence }) {
  const setPreview = useSetAtom(previewEntityIdAtom);
  return (
    <section
      data-component="ClaimEvidenceBlock"
      aria-label="Evidence"
      className="flex flex-col gap-3 px-1 py-3 mb-stack rounded-md border border-border/60 bg-paper"
    >
      <ClaimEvidenceSummary ev={ev} onOpen={setPreview} />
      <ClaimEvidenceMatrix ev={ev} onOpen={setPreview} />
    </section>
  );
}
