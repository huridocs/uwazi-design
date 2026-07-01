import { Fragment } from "react";
import { useSetAtom } from "jotai";
import { CornerDownRight, Link2, Sigma } from "lucide-react";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { countryFlag } from "../../utils/countryFlag";
import type { InheritedValue, ProvenanceStep } from "../../utils/inheritance";

/** A single INHERITED value — visually distinct from a native value so it reads
 *  as "pulled from the connected entity": a carbon link glyph, an optional
 *  country flag, and the value. Provenance (which property, via which relation)
 *  on hover. Shared by the grouped table and the single-field cards so both
 *  render inherited values identically. */
export function InheritedValueTag({
  value,
  propLabel,
  relationLabel,
  hideGlyph,
}: {
  value: string;
  propLabel?: string;
  relationLabel: string;
  /** Suppress the carbon link glyph — the table column header already marks the
   *  whole column as inherited, so per-cell glyphs would be redundant there. */
  hideGlyph?: boolean;
}) {
  const flag = countryFlag(value);
  return (
    <span
      title={`Inherited${propLabel ? ` ${propLabel}` : ""} · via ${relationLabel}`}
      className="inline-flex items-center gap-1.5 min-w-0 text-sm font-medium text-ink"
    >
      {!hideGlyph && <Link2 size={11} className="text-carbon shrink-0" />}
      {flag && (
        <span aria-hidden className="shrink-0 leading-none">
          {flag}
        </span>
      )}
      <span className="truncate">{value}</span>
    </span>
  );
}

/** A rollup summary chip — the inherited column's declared reduce (distinct /
 *  count / min / max / first) computed over its values. The Notion/Airtable
 *  "calculation" made visible: a small carbon data-badge, so a derived column
 *  says what it aggregates to, not just lists. */
export function RollupChip({ summary }: { summary: { text: string; title: string } }) {
  return (
    <span
      title={summary.title}
      className="inline-flex w-fit items-center gap-1 rounded-md bg-carbon-tint px-1.5 py-0.5 text-[11px] font-medium text-carbon"
    >
      <Sigma size={10} className="shrink-0" aria-hidden />
      {summary.text}
    </span>
  );
}

/** The provenance trail under an inherited value: the intermediary nodes the
 *  value was reached through (e.g. the Sentencia a signing judge reached this
 *  Causa by). Each hop is a clickable link that opens that entity's preview, so
 *  the "how" of a derived value is inspectable rather than hidden. Renders
 *  nothing when there are no intermediaries (a plain single-hop inheritance). */
export function ProvenanceTrail({ steps, sharedLabel }: { steps: ProvenanceStep[]; sharedLabel?: string }) {
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  if (!steps.length) return null;
  return (
    <span className="flex items-center gap-1 min-w-0 text-[11px] text-ink-tertiary">
      <CornerDownRight size={10} className="shrink-0 text-ink-muted" aria-hidden />
      <span className="shrink-0">{sharedLabel ? `${sharedLabel} via` : "via"}</span>
      {steps.map((s, i) => (
        <Fragment key={s.entityId}>
          {i > 0 && <span className="shrink-0 text-ink-muted" aria-hidden>→</span>}
          <button
            onClick={() => setOverlay(s.entityId)}
            title={`${s.relationLabel ? `${s.relationLabel}: ` : ""}${s.title} — open`}
            className="min-w-0 truncate text-carbon hover:underline cursor-pointer"
          >
            {s.title}
          </button>
        </Fragment>
      ))}
    </span>
  );
}

/** Empty inherited value — the connected entity carries no value for the
 *  inherited property. A quiet em-dash (the editorial convention for "no value"
 *  in a table) rather than words; provenance stays on hover. */
export function MissingValue({ propLabel }: { propLabel?: string }) {
  return (
    <span
      title={`No ${propLabel ?? "value"} on the connected entity`}
      className="text-sm text-ink-muted select-none"
      aria-label={`No ${propLabel ?? "value"}`}
    >
      —
    </span>
  );
}

/** Shared caption under every relationship card title: where the value comes
 *  from. Multi-inheritance lists the inherited property names (`inherits
 *  Country, Role`); single-inheritance → `inherits X`; a bare relation →
 *  `linked`. One caption for all three tiers keeps the provenance line identical. */
export function RelationCaption({
  relationLabel,
  inheritLabel,
  inheritLabels,
}: {
  relationLabel: string;
  inheritLabel?: string;
  /** For multi-inheritance: every inherited property's label. */
  inheritLabels?: string[];
}) {
  return (
    <p className="text-[11px] text-ink-tertiary -mt-1">
      via <span className="text-carbon font-medium">{relationLabel}</span>
      {inheritLabels && inheritLabels.length > 0 ? (
        <> · inherits {inheritLabels.join(", ")}</>
      ) : inheritLabel ? (
        <> · inherits {inheritLabel}</>
      ) : (
        <> · linked</>
      )}
    </p>
  );
}

/** One connected entity row: an entity pill (opens the source preview) and,
 *  when the field inherits a property, the inherited value (or "no value"). */
export function InheritedValueChip({
  value,
  inherits,
  relationLabel,
}: {
  value: InheritedValue;
  inherits: boolean;
  relationLabel: string;
}) {
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        onClick={() => setOverlay(value.entityId)}
        className="shrink-0 rounded-md hover:opacity-80 transition-opacity cursor-pointer"
        title="Preview source entity"
      >
        <EntityPill typeId={value.entityTypeId} label={value.entityTitle} />
      </button>
      {inherits && (
        <>
          <span className="text-ink-muted shrink-0" aria-hidden>
            →
          </span>
          {value.inheritedValue ? (
            <InheritedValueTag
              value={value.inheritedValue}
              propLabel={value.sourcePropLabel}
              relationLabel={relationLabel}
            />
          ) : (
            <MissingValue propLabel={value.sourcePropLabel} />
          )}
        </>
      )}
    </div>
  );
}
