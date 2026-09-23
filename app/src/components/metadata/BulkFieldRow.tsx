import type { ReactNode } from "react";
import { RotateCcw } from "lucide-react";

/** One property in the bulk edit form: its label row and its editor.
 *
 *  The label row carries the field's state, and it is always mounted, so a
 *  state change moves nothing below it:
 *   - shared — every entity holds the same value (nothing extra on the row);
 *   - mixed — values differ: "Mixed · 4 values", the editor starts empty;
 *   - will change — the user edited it: a carbon dot, "Will change", and a
 *     Revert that returns it to shared or mixed. The `ListeningChip` shape:
 *     carbon is the accent that means "the system is holding this for you".
 *  A field left untouched is not written. */
export type BulkFieldState = "shared" | "mixed" | "changed";

export function BulkFieldRow({
  label,
  htmlFor,
  state,
  distinct,
  onRevert,
  action,
  children,
}: {
  label: string;
  htmlFor?: string;
  state: BulkFieldState;
  /** How many different values the entities hold (mixed). */
  distinct?: number;
  onRevert: () => void;
  /** A quiet control at the row's end ("Add value"). */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-component="BulkFieldRow" data-state={state} className="space-y-1.5">
      <div className="flex items-center gap-2 min-h-4">
        {htmlFor ? (
          <label htmlFor={htmlFor} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
        ) : (
          <span className="text-xs font-medium text-ink-secondary">{label}</span>
        )}
        {state === "mixed" && (
          <span data-part="mixed" className="text-meta text-ink-tertiary tabular-nums">
            Mixed{distinct ? ` · ${distinct} values` : ""}
          </span>
        )}
        {state === "changed" && (
          <span
            data-part="changed"
            className="inline-flex items-center gap-1.5 h-4 ps-1.5 pe-0.5 rounded-md bg-warm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-carbon shrink-0" aria-hidden />
            <span className="text-meta leading-none text-ink-tertiary">Will change</span>
            <button
              type="button"
              onClick={onRevert}
              aria-label={`Revert ${label}`}
              title={`Revert ${label}`}
              className="flex items-center justify-center w-4 h-4 rounded text-ink-muted
                hover:text-ink hover:bg-parchment transition-colors cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/40"
            >
              <RotateCcw size={10} />
            </button>
          </span>
        )}
        {action && <span className="ms-auto">{action}</span>}
      </div>
      {children}
    </div>
  );
}
