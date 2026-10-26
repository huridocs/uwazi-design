import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { EntityPill } from "../shared/EntityPill";
import { ThesaurusValueLabel } from "../shared/ThesaurusValueLabel";
import { countryFlag } from "../../utils/countryFlag";
import type { InheritedValue } from "../../utils/inheritance";
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

/** The line under every relationship field's title: the link icon and the
 *  relationship type ("🔗 Firmantes"). The title above it sits where every
 *  other field's title sits, with nothing before it. The inherited property
 *  names are not repeated here (they are the table's column headers and the
 *  narrow cards' labels), and a trail every row shares is not hoisted here:
 *  depending on where a value is inherited from it is one record or twenty.
 *  Rows carry no trail either: each shows its entity and the values.
 *  The type is plain text; the icon is the only mark, hidden from screen
 *  readers, which hear "Relationship: Firmantes".
 *
 *  Left out (nothing drawn, no line reserved) when the type says what the
 *  title already says ("PAÍS" / "País"): compared trimmed, ignoring case and
 *  accents, so the field reads as title and value like any other. */
export function RelationCaption({ relationLabel, fieldLabel }: { relationLabel: string; fieldLabel?: string }) {
  if (fieldLabel !== undefined && sameLabel(relationLabel, fieldLabel)) return null;
  return (
    <p data-component="RelationCaption" className="flex items-center gap-1 min-w-0 text-meta text-ink-tertiary -mt-1">
      <Link2 size={11} className="shrink-0 text-carbon" aria-hidden />
      <span className="sr-only">Relationship: </span>
      <span data-part="relation" title={relationLabel} className="min-w-0 truncate">
        {relationLabel}
      </span>
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

/** Two labels that read as the same word: trimmed, case- and accent-blind
 *  (`País`, `PAÍS` and `Pais` match). The title is drawn uppercase, so case
 *  never tells them apart on screen, and an accent alone does not make a
 *  different relationship. */
function sameLabel(a: string, b: string): boolean {
  return a.trim().localeCompare(b.trim(), undefined, { sensitivity: "base" }) === 0;
}
