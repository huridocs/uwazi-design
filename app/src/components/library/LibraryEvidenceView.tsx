import { memo, useEffect, useMemo, useState } from "react";
import { ChevronRight, Scale } from "lucide-react";
import type { Entity } from "../../data/entities";
import { nepalClaimEvidence, STANCES, type ClaimEvidence } from "../../data/nepal/claimEvidence";
import { ClaimEvidenceMatrix, ClaimEvidenceSummary } from "../relationships/ClaimEvidence";

type Select = (id: string, e?: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => void;

/** Claims drawn per step before "Show more". */
const STEP = 25;

/** One claim: title, status, sentence and bar; its matrix on demand. The
 *  claim-level columns sit in the head; a structured figure (figure, unit,
 *  as of) goes beside the status when the data has it. */
function ClaimEvidenceCard({
  entity,
  ev,
  selected,
  onSelect,
}: {
  entity: Entity;
  ev: ClaimEvidence;
  selected: boolean;
  onSelect: Select;
}) {
  const [open, setOpen] = useState(false);
  const sources = STANCES.reduce((n, s) => n + ev.references[s], 0);
  const matrixId = `evidence-${entity.id}`;
  return (
    <li
      data-component="ClaimEvidenceCard"
      data-selected={selected || undefined}
      className={`flex flex-col gap-3 px-1 py-3 rounded-md border border-border/60 ${selected ? "bg-parchment" : "bg-paper"}`}
    >
      <ClaimEvidenceSummary
        ev={ev}
        title={
          <h3 className="min-w-0 text-sm font-semibold text-ink">
            <button
              type="button"
              onClick={(e) => onSelect(entity.id, e)}
              aria-pressed={selected}
              className="text-left rounded-md cursor-pointer hover:underline decoration-border underline-offset-2
                focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
            >
              {entity.title}
            </button>
          </h3>
        }
        aside={
          <button
            type="button"
            onClick={() => setOpen((x) => !x)}
            aria-expanded={open}
            aria-controls={matrixId}
            className="inline-flex items-center gap-1 text-xs font-medium text-ink-secondary hover:text-ink rounded-md cursor-pointer
              focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
          >
            <ChevronRight size={12} aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`} />
            {open ? "Hide sources" : `Show ${sources === 1 ? "the source" : `${sources} sources`}`}
          </button>
        }
      />
      <div id={matrixId} hidden={!open}>
        {open && <ClaimEvidenceMatrix ev={ev} onOpen={(id) => onSelect(id)} />}
      </div>
    </li>
  );
}

/** The Library's Evidence view: every claim in the filtered set that sources
 *  take a stance on, in the Library's sort order, each with its publishers
 *  against stance. Listed in the view menu whatever the set holds, like
 *  Results; it says what to filter when there are no claims. */
export const LibraryEvidenceView = memo(function LibraryEvidenceView({
  entities,
  selectedId,
  onSelect,
}: {
  entities: Entity[];
  selectedId: string | null;
  onSelect: Select;
}) {
  const claims = useMemo(() => {
    const out: { entity: Entity; ev: ClaimEvidence }[] = [];
    for (const entity of entities) {
      const ev = nepalClaimEvidence(entity.id);
      if (ev) out.push({ entity, ev });
    }
    return out;
  }, [entities]);
  const [limit, setLimit] = useState(STEP);
  useEffect(() => setLimit(STEP), [claims]);

  if (claims.length === 0) {
    return (
      <div data-component="LibraryEvidenceView" data-part="empty" className="flex flex-col items-center justify-center py-16 text-center">
        <Scale size={36} className="text-ink-tertiary/40 mb-3" aria-hidden />
        <p className="text-sm font-medium text-ink-secondary">No claims with sources in this set</p>
        <p className="text-xs text-ink-tertiary mt-1">Filter by the Claim template to compare who supports and disputes each one.</p>
      </div>
    );
  }
  return (
    <div data-component="LibraryEvidenceView">
      <ol className="flex flex-col gap-stack">
        {claims.slice(0, limit).map(({ entity, ev }) => (
          <ClaimEvidenceCard key={entity.id} entity={entity} ev={ev} selected={selectedId === entity.id} onSelect={onSelect} />
        ))}
      </ol>
      {claims.length > limit && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setLimit((n) => n + STEP)}
            className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Show more — {(claims.length - limit).toLocaleString()} more claims
          </button>
        </div>
      )}
    </div>
  );
});
