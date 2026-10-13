import { FileText, Play } from "lucide-react";
import type { GroupBy } from "../../atoms/filters";
import { getEntity, getEntityType } from "../../data/entities";
import { selectionPage, type Reference, type Verification } from "../../data/references";
import { relationLabel } from "../../utils/inheritance";
import { VERIFICATION_LABEL, countOf } from "../../utils/relationships";
import { reportedAt } from "../../utils/refEvidence";
import { DirectionGlyph } from "./DirectionGlyph";

/** What a group of references is, read without opening it: who is at the
 *  other end, how well the links are sourced, when they held, where they sit
 *  in the document and which way they run. Every part self-hides where the
 *  collection records nothing for it (the Sample and CEJIL have no status,
 *  period or sources). Numbers stay in the tooltips and the accessible name:
 *  the tab count is the surface's only printed figure. */
export interface GroupShape {
  /** The other ends, in first-seen order: the group's members. For a group
   *  that is itself an entity, its link types instead (`kinds`). */
  members: { id: string; title: string; color?: string }[];
  kinds: string[];
  status: Record<Verification, number>;
  /** Epoch seconds. `held`: the links' periods; `reported`: their sources'
   *  publication dates, where no link is dated. */
  span?: { from: number; to: number; basis: "held" | "reported" };
  anchored: number;
  firstPage?: number;
  /** Anchored to a recording, not a page. */
  media: number;
  direction?: "outgoing" | "incoming" | "both";
  total: number;
}

const ENTITY_GROUPS: GroupBy[] = ["target-entity", "source-entity"];

export function groupShape(refs: Reference[], by: GroupBy): GroupShape {
  const seen = new Map<string, GroupShape["members"][number]>();
  const kinds: string[] = [];
  const status: Record<Verification, number> = { confirmed: 0, "single-source": 0, disputed: 0 };
  let heldFrom = Infinity;
  let heldTo = -Infinity;
  let repFrom = Infinity;
  let repTo = -Infinity;
  let anchored = 0;
  let media = 0;
  let firstPage: number | undefined;
  const dirs = new Set<string>();
  for (const r of refs) {
    // The other end: a source-side grouping lists the targets as well, since
    // the source is the record the panel is about.
    const other = by === "target-entity" ? undefined : r.targetEntityId;
    if (other && !seen.has(other)) {
      const e = getEntity(other);
      seen.set(other, { id: other, title: e?.title ?? "Unknown entity", color: e ? getEntityType(e.typeId)?.color : undefined });
    }
    const kind = relationLabel(r.relationType);
    if (!kinds.includes(kind)) kinds.push(kind);
    if (r.verification) status[r.verification] += 1;
    if (r.period) {
      if (r.period.from !== null) heldFrom = Math.min(heldFrom, r.period.from);
      if (r.period.to !== null) heldTo = Math.max(heldTo, r.period.to);
      if (r.period.from !== null && r.period.to === null) heldTo = Math.max(heldTo, r.period.from);
      if (r.period.to !== null && r.period.from === null) heldFrom = Math.min(heldFrom, r.period.to);
    }
    const at = reportedAt(r);
    if (at !== undefined) {
      repFrom = Math.min(repFrom, at);
      repTo = Math.max(repTo, at);
    }
    const page = selectionPage(r.sourceSelection);
    if (page !== undefined) {
      anchored += 1;
      if (firstPage === undefined || page < firstPage) firstPage = page;
    } else if (r.mediaAnchor) {
      anchored += 1;
      media += 1;
    }
    dirs.add(r.direction ?? "outgoing");
  }
  const span =
    heldFrom <= heldTo
      ? { from: heldFrom, to: heldTo, basis: "held" as const }
      : repFrom <= repTo
        ? { from: repFrom, to: repTo, basis: "reported" as const }
        : undefined;
  return {
    members: [...seen.values()],
    kinds,
    status,
    span,
    anchored,
    firstPage,
    media,
    direction: by === "direction" ? undefined : dirs.size > 1 ? "both" : (dirs.values().next().value as "outgoing" | "incoming"),
    total: refs.length,
  };
}

/** The time axis every group's span is drawn on: the panel's whole span, so
 *  two groups' bars compare. */
export function spanDomain(shapes: GroupShape[]): { from: number; to: number } | undefined {
  let from = Infinity;
  let to = -Infinity;
  for (const s of shapes)
    if (s.span) {
      from = Math.min(from, s.span.from);
      to = Math.max(to, s.span.to);
    }
  return from <= to ? { from, to } : undefined;
}

const year = (t: number) => new Date(t * 1000).getUTCFullYear();
const day = (t: number) => new Date(t * 1000).toISOString().slice(0, 10).replace(/-/g, "/");

function spanText(span: NonNullable<GroupShape["span"]>, short: boolean) {
  if (span.basis === "reported") {
    const a = day(span.from);
    const b = day(span.to);
    if (a === b) return a;
    // Inside one year the days carry it; across years the years do.
    if (year(span.from) === year(span.to)) return short ? `${a.slice(5)}–${b.slice(5)}` : `${a}–${b.slice(5)}`;
    return `${year(span.from)}–${year(span.to)}`;
  }
  return year(span.from) === year(span.to) ? String(year(span.from)) : `${year(span.from)}–${String(year(span.to)).slice(short ? 2 : 0)}`;
}

const STATUS_ORDER: Verification[] = ["confirmed", "single-source", "disputed"];
const STATUS_FILL: Record<Verification, string> = {
  confirmed: "var(--success)",
  "single-source": "var(--text-muted)",
  disputed: "var(--warning)",
};

/** The sentence a screen reader hears for the header, and its tooltip. */
export function groupShapeLabel(title: string, s: GroupShape, by: GroupBy): string {
  const parts = [`${title}, ${countOf(s.total, "reference")}`];
  if (s.members.length) {
    const names = s.members.slice(0, 3).map((m) => m.title);
    const more = s.members.length - names.length;
    parts.push(`with ${names.join(", ")}${more > 0 ? ` and ${more.toLocaleString()} more` : ""}`);
  } else if (ENTITY_GROUPS.includes(by)) parts.push(s.kinds.join(", "));
  const st = STATUS_ORDER.filter((v) => s.status[v]).map((v) => `${s.status[v]} ${VERIFICATION_LABEL[v].toLowerCase()}`);
  if (st.length) parts.push(st.join(", "));
  if (s.span) parts.push(`${s.span.basis === "held" ? "held" : "reported"} ${spanText(s.span, false)}`);
  if (s.anchored)
    parts.push(
      `${s.anchored === s.total ? "all" : `${s.anchored} of ${s.total}`} anchored${
        s.firstPage !== undefined ? `, first on page ${s.firstPage}` : s.media ? " in a recording" : ""
      }`,
    );
  if (s.direction) parts.push(s.direction === "both" ? "both directions" : s.direction);
  return parts.join("; ");
}

/** The title line's end: the evidence mix and the direction. A fixed slot, so
 *  the titles' ends line up down the list. */
export function GroupShapeEnd({ shape }: { shape: GroupShape }) {
  const rated = STATUS_ORDER.reduce((n, v) => n + shape.status[v], 0);
  const mix = STATUS_ORDER.filter((v) => shape.status[v])
    .map((v) => `${shape.status[v]} ${VERIFICATION_LABEL[v].toLowerCase()}`)
    .join(", ");
  return (
    <span data-part="shape-end" aria-hidden className="ms-auto shrink-0 flex items-center gap-2">
      {rated > 0 && (
        <span
          data-part="evidence-mix"
          title={`${mix}${rated < shape.total ? `; ${shape.total - rated} without a status` : ""}`}
          className="flex w-12 h-1.5 rounded-full overflow-hidden bg-vellum"
        >
          {STATUS_ORDER.map((v) =>
            shape.status[v] ? (
              <span key={v} data-status={v} style={{ width: `${(shape.status[v] / shape.total) * 100}%`, backgroundColor: STATUS_FILL[v] }} />
            ) : null,
          )}
        </span>
      )}
      {shape.direction && <DirectionGlyph direction={shape.direction} />}
    </span>
  );
}

/** The header's second line: the members (or, for an entity, its link
 *  types), then when and where. One line at a fixed height; the members
 *  truncate first. */
export function GroupShapeLine({
  shape,
  by,
  domain,
  compact = false,
}: {
  shape: GroupShape;
  by: GroupBy;
  domain?: { from: number; to: number };
  /** Phones: no time track, the years alone. */
  compact?: boolean;
}) {
  const names = shape.members.slice(0, 6);
  const width = domain && shape.span ? Math.max(1, domain.to - domain.from) : 1;
  return (
    <span data-part="shape-line" aria-hidden className="flex items-center gap-3 h-4 min-w-0 text-meta text-ink-tertiary">
      <span data-part="members" className="min-w-0 flex-1 truncate text-start" title={shape.members.map((m) => m.title).join("\n") || undefined}>
        {names.length
          ? names.map((m, i) => (
              <span key={m.id} className="whitespace-nowrap">
                {i > 0 && <span className="text-ink-muted"> · </span>}
                {m.color && (
                  <span
                    className="inline-block w-1.5 h-1.5 me-1 rounded-[2px] align-middle -translate-y-px"
                    style={{ backgroundColor: m.color }}
                  />
                )}
                {m.title}
              </span>
            ))
          : ENTITY_GROUPS.includes(by)
            ? shape.kinds.join(" · ")
            : null}
      </span>
      {shape.span && (
        <span
          data-part="span"
          title={`${shape.span.basis === "held" ? "Held" : "Reported"} ${spanText(shape.span, false)}`}
          className="shrink-0 flex items-center gap-1.5 tabular-nums whitespace-nowrap"
        >
          {!compact && domain && (
            <span className="relative w-12 h-1 rounded-full bg-vellum">
              <span
                className={`absolute inset-y-0 rounded-full ${shape.span.basis === "held" ? "bg-ink-tertiary" : "bg-ink-muted"}`}
                style={{
                  insetInlineStart: `${((shape.span.from - domain.from) / width) * 100}%`,
                  width: `max(0.25rem, ${((shape.span.to - shape.span.from) / width) * 100}%)`,
                }}
              />
            </span>
          )}
          {spanText(shape.span, compact)}
        </span>
      )}
      {shape.anchored > 0 && (
        <span
          data-part="anchor"
          title={`${shape.anchored === shape.total ? "All" : `${shape.anchored} of ${shape.total}`} anchored${
            shape.firstPage !== undefined ? `; first on page ${shape.firstPage}` : " in a recording"
          }`}
          className={`shrink-0 inline-flex items-center gap-0.5 tabular-nums whitespace-nowrap ${
            shape.anchored === shape.total ? "" : "opacity-70"
          }`}
        >
          {shape.firstPage !== undefined ? <FileText size={11} /> : <Play size={10} />}
          {shape.firstPage !== undefined && `p. ${shape.firstPage}`}
        </span>
      )}
    </span>
  );
}
