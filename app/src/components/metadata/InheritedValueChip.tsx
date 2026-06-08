import { useSetAtom } from "jotai";
import { Link2 } from "lucide-react";
import { overlayEntityIdAtom } from "../../atoms/references";
import { EntityPill } from "../shared/EntityPill";
import type { InheritedValue } from "../../utils/inheritance";

/** Carbon-accented inline inherited value; provenance shown on hover. */
export function InheritedMarker({
  value,
  label,
  relationLabel,
}: {
  value: string;
  label?: string;
  relationLabel: string;
}) {
  return (
    <span
      title={`Inherited${label ? ` ${label}` : ""} · via ${relationLabel}`}
      className="inline-flex items-center gap-1 text-sm font-medium text-ink min-w-0"
    >
      <Link2 size={11} className="text-carbon shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}

/** Shared caption under every relationship card title: where the value comes
 *  from. `inheritCount` drives the multi-inheritance variant ("N inherited
 *  properties"); otherwise `inheritLabel` → "inherits X" and a bare relation →
 *  "linked". One caption for all three tiers keeps the provenance line identical. */
export function RelationCaption({
  relationLabel,
  inheritLabel,
  inheritCount,
}: {
  relationLabel: string;
  inheritLabel?: string;
  inheritCount?: number;
}) {
  return (
    <p className="text-[11px] text-ink-tertiary -mt-1">
      via <span className="text-carbon font-medium">{relationLabel}</span>
      {inheritCount != null ? (
        <> · {inheritCount} inherited {inheritCount === 1 ? "property" : "properties"}</>
      ) : inheritLabel ? (
        <> · inherits {inheritLabel}</>
      ) : (
        <> · linked</>
      )}
    </p>
  );
}

/** One connected entity row: an entity pill (opens the source preview) and,
 *  when the field inherits a property, the inherited value (or an em-dash). */
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
            <InheritedMarker
              value={value.inheritedValue}
              label={value.sourcePropLabel}
              relationLabel={relationLabel}
            />
          ) : (
            <span title={`No ${value.sourcePropLabel ?? "value"} on source`} className="text-sm text-ink-muted">
              —
            </span>
          )}
        </>
      )}
    </div>
  );
}
