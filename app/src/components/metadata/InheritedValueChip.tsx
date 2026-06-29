import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import { countryFlag } from "../../utils/countryFlag";
import type { InheritedValue } from "../../utils/inheritance";

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

/** Empty inherited value — the connected entity carries no value for the
 *  inherited property. Calm, explicit, and distinct from a real value. */
export function MissingValue({ propLabel }: { propLabel?: string }) {
  return (
    <span
      title={`No ${propLabel ?? "value"} on the connected entity`}
      className="text-sm text-ink-muted italic"
    >
      no value
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
