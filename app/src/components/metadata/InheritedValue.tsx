import { Fragment } from "react";
import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { EntityPill } from "../shared/EntityPill";
import { ProvenanceLine } from "../shared/ProvenanceLine";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { countryFlag } from "../../utils/countryFlag";
import type { InheritedValue, ProvenanceStep } from "../../utils/inheritance";
import { previewEntityIdAtom } from "../../atoms/entityPreview";

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
      data-component="InheritedValueTag"
      title={`Inherited${propLabel ? ` ${propLabel}` : ""} · via ${relationLabel}`}
      className="inline-flex items-center gap-1.5 min-w-0 text-sm font-medium text-ink"
    >
      {!hideGlyph && <Link2 size={11} className="text-carbon shrink-0" />}
      {flag && (
        <span aria-hidden className="shrink-0 leading-none">
          {flag}
        </span>
      )}
      {/* Nested thesaurus values keep their group context in the inherited
          cell too ("Americas › Central America"); other values are unchanged. */}
      <span data-part="value" className="truncate min-w-0">
        <ThesaurusValueLabel value={value} />
      </span>
    </span>
  );
}

/** The provenance trail under an inherited value: the intermediary nodes the
 *  value was reached through (e.g. the Sentencia a signing judge reached this
 *  Causa by). Each hop is a clickable link that opens that entity's preview, so
 *  the "how" of a derived value is inspectable rather than hidden. Renders
 *  nothing when there are no intermediaries (a plain single-hop inheritance). */
export function ProvenanceTrail({ steps }: { steps: ProvenanceStep[] }) {
  const setOverlay = useSetAtom(previewEntityIdAtom);
  if (!steps.length) return null;
  return (
    // The shared `↳ …` line, the one every provenance statement rides, so they
    // can't drift apart.
    <ProvenanceLine label="via">
      {steps.map((s, i) => (
        <Fragment key={s.entityId}>
          {i > 0 && <span className="shrink-0 text-ink-muted" aria-hidden>→</span>}
          <button
            type="button"
            data-part="step"
            onClick={() => setOverlay(s.entityId)}
            title={`${s.relationLabel ? `${s.relationLabel}: ` : ""}${s.title} — open`}
            className="min-w-0 truncate text-ink-secondary underline decoration-carbon decoration-2 underline-offset-2 hover:text-ink cursor-pointer"
          >
            {s.title}
          </button>
        </Fragment>
      ))}
    </ProvenanceLine>
  );
}

/** Empty inherited value — the connected entity carries no value for the
 *  inherited property. A quiet em-dash (the editorial convention for "no value"
 *  in a table) rather than words; provenance stays on hover. */
export function MissingValue({ propLabel }: { propLabel?: string }) {
  return (
    <span
      data-component="MissingValue"
      title={`No ${propLabel ?? "value"} on the connected entity`}
      className="text-sm text-ink-tertiary select-none"
      aria-label={`No ${propLabel ?? "value"}`}
    >
      —
    </span>
  );
}

/** Shared caption under every relationship card title: where the values come
 *  from, on one line. The relationship, then (when every row was reached
 *  through the same records, `through`) "of" those records, then what is
 *  inherited: `via Firmantes of Salvador Chiriboga. Sentencia… · inherits
 *  País`. Multi-inheritance lists the inherited property names (`inherits
 *  Country, Role`); a bare relation reads `linked`. The records are the only
 *  links (each opens its preview and is the only part that truncates, its full
 *  name in the title); the relationship's name is plain text. When rows reach
 *  their values through different records, `through` is left out and each row
 *  keeps its own `↳ via` trail. */
export function RelationCaption({
  relationLabel,
  inheritLabel,
  inheritLabels,
  through,
}: {
  relationLabel: string;
  inheritLabel?: string;
  /** For multi-inheritance: every inherited property's label. */
  inheritLabels?: string[];
  /** The records every row's value was reached through, hoisted from the rows. */
  through?: ProvenanceStep[];
}) {
  const setOverlay = useSetAtom(previewEntityIdAtom);
  const inherits = inheritLabels && inheritLabels.length > 0 ? inheritLabels.join(", ") : inheritLabel;
  return (
    <p data-component="RelationCaption" className="flex items-baseline gap-1 min-w-0 text-meta text-ink-tertiary -mt-1">
      <span className="shrink-0">
        via <span data-part="relation" className="font-medium text-ink-secondary">{relationLabel}</span>
      </span>
      {/* The {" "} are the text's own spaces (copy, screen readers); the flex
          gap draws them. */}
      {through && through.length > 0 && (
        <>
          {" "}
          <span className="shrink-0">of</span>
          {through.map((s, i) => (
            <Fragment key={s.entityId}>
              {" "}
              {i > 0 && (
                <>
                  <span className="shrink-0 text-ink-muted" aria-hidden>→</span>{" "}
                </>
              )}
              <button
                type="button"
                data-part="step"
                onClick={() => setOverlay(s.entityId)}
                title={`${s.title} — open`}
                className="min-w-0 truncate text-ink-secondary underline decoration-carbon decoration-2 underline-offset-2 hover:text-ink cursor-pointer"
              >
                {s.title}
              </button>
            </Fragment>
          ))}
        </>
      )}
      {" "}
      <span className="shrink-0">{inherits ? `· inherits ${inherits}` : "· linked"}</span>
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
  const setOverlay = useSetAtom(previewEntityIdAtom);
  return (
    <div data-component="InheritedValueChip" className="flex items-center gap-2 min-w-0">
      <button
        type="button"
        data-part="entity"
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
