import { Fragment, useState, type ReactNode } from "react";
import { useAtomValue } from "jotai";
import { MoreHorizontal, X } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { BarDivider } from "../shared/BarDivider";
import { Hint } from "../shared/Hint";
import { ActionsSheet } from "../library/LibrarySelectionBar";

export interface SettingsSelectionAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  /** Disabled, and why. The button stays focusable and keeps its width. */
  disabledReason?: string;
  /** Delete / Remove: seal text, after a hairline. */
  danger?: boolean;
}

export interface SettingsSelection {
  /** Rows ticked. The bar shows while this is above zero. */
  count: number;
  /** Rows the count is out of (the same rows the checkboxes cover). */
  total: number;
  actions: SettingsSelectionAction[];
  onClear: () => void;
}

/** A footer's selected state (UX2), swapped in place of its idle start
 *  group, in the same bar at the same height:
 *
 *    [n of m selected] · actions (ghost) · | · Remove/Delete (danger) · Clear
 *
 *  The count sits in a fixed-width slot and is a live region, so 9 → 10
 *  moves no button. The bar is not tinted. On phones the actions go into a
 *  sheet behind one "Actions" button. Sits inside `SettingsContent.Footer`;
 *  `SettingsListPage` and `SettingsEditor` mount it from their `selection`
 *  prop. */
export function SettingsSelectionBar({ count, total, actions, onClear }: SettingsSelection) {
  const phone = useAtomValue(breakpointAtom) === "mobile";
  const [sheet, setSheet] = useState(false);
  const readout = `${count.toLocaleString()} of ${total.toLocaleString()} selected`;
  return (
    <div data-component="SettingsSelectionBar" className="me-auto flex items-center gap-1 min-w-0">
      <span
        role="status"
        aria-live="polite"
        className="shrink-0 w-[8.5rem] text-xs font-semibold text-ink tabular-nums truncate"
      >
        {readout}
      </span>
      {phone ? (
        <button
          type="button"
          onClick={() => setSheet(true)}
          aria-haspopup="dialog"
          aria-expanded={sheet}
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs ${BAR_LEAD} rounded-md cursor-pointer`}
        >
          <MoreHorizontal size={13} className="text-ink-tertiary" aria-hidden /> Actions
        </button>
      ) : (
        actions.map((a) => (
          <Fragment key={a.id}>
            {a.danger && <BarDivider />}
            <SelectionButton action={a} />
          </Fragment>
        ))
      )}
      <button
        type="button"
        onClick={onClear}
        className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md cursor-pointer`}
      >
        <X size={13} className="text-ink-tertiary" aria-hidden /> Clear
      </button>
      {sheet && <ActionsSheet count={count} actions={actions} onClose={() => setSheet(false)} />}
    </div>
  );
}

function SelectionButton({ action: a }: { action: SettingsSelectionAction }) {
  const disabled = !!a.disabledReason;
  return (
    <Hint text={a.disabledReason ?? a.label} describe={disabled}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          data-action={a.id}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : a.onClick}
          className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
            a.danger ? BAR_DANGER : BAR_GHOST
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className={a.danger ? "" : "text-ink-tertiary"} aria-hidden>
            {a.icon}
          </span>
          {a.label}
        </button>
      )}
    </Hint>
  );
}
