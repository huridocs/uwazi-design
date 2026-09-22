import { Fragment, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { MoreHorizontal, X } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  clearSelectionAtom,
  librarySelectedEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
  selectIdsAtom,
} from "../../atoms/library";
import type { Corpus } from "../../data/entityOverlay";
import { SelectionDialogs, useSelectionActions, type SelectionAction } from "./selectionActions";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { BarDivider } from "../shared/BarDivider";
import { Hint } from "../shared/Hint";

/** The Library footer's SELECTED state — swapped in place of the four
 *  baseline actions, in the same bar at the same height.
 *
 *  Order: one fixed slot holding the readout (a live region, so 9 → 10 → 100
 *  moves no button) and, under it, its one offer ("Select all N", else "N not
 *  shown"), then the actions (`useSelectionActions` — the same list the phone sheet and
 *  the selection drawer's menu show) and Clear. Below a 56rem bar every action
 *  keeps only its icon and its name.
 *
 *  This component subscribes to the selection; the view around it does not. */
export function LibrarySelectionBar({
  filteredIds,
  loadedIds,
  corpus,
}: {
  /** Every id the current results hold (filters, query, match types). */
  filteredIds: readonly string[];
  /** The ids "Show more" has loaded. */
  loadedIds: readonly string[];
  corpus: Corpus;
}) {
  const selection = useAtomValue(librarySelectionAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const openDrawer = useSetAtom(librarySelectionDrawerOpenAtom);
  const setPreview = useSetAtom(librarySelectedEntityIdAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  // On a phone the bar's action buttons don't fit (they are `hidden sm:flex`),
  // and the selection drawer isn't rendered — so the bar there is the count,
  // an Actions button opening a sheet of the same actions, and Clear.
  const isMobile = useAtomValue(breakpointAtom) === "mobile";

  const n = selection.size;
  const inView = new Set(filteredIds);
  let notInView = 0;
  for (const id of selection) if (!inView.has(id)) notInView++;
  // Selected but not DRAWN — filtered out, or past what "Show more" has
  // loaded. After "Select all 4,398" and the box unticked, 4,278 stay
  // selected; this is where that is said, not left silent.
  const drawn = new Set(loadedIds);
  let notShown = 0;
  for (const id of selection) if (!drawn.has(id)) notShown++;
  const allLoaded = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const moreToSelect = allLoaded && filteredIds.length > loadedIds.length && filteredIds.some((id) => !selection.has(id));

  const showList = () => {
    if (isMobile) return setSheetOpen(true);
    setPreview(null);
    openDrawer(true);
  };
  const actions = useSelectionActions({ order: filteredIds, corpus, isMobile });

  return (
    <>
      {/* The count and its one offer share a FIXED slot. The count sits on
          the bar's midline, level with the select-all box and the buttons;
          the offer ("Select all 1,084", else "3 not shown") hangs under it,
          out of flow, so it comes and goes without moving the count. The
          offer used to flow after Clear and, short of room, painted under the
          "1 filter" button (the click hit the filter at 1440); in the slot it
          has its own line at every width, and nothing else moves. */}
      <span className="relative shrink-0 w-[7.5rem] flex items-center text-xs tabular-nums leading-tight">
        <span role="status" aria-live="polite" className="flex min-w-0">
          <button
            type="button"
            onClick={showList}
            className="font-semibold text-ink hover:underline cursor-pointer rounded-sm truncate
              focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
          >
            {n.toLocaleString()} selected
          </button>
        </span>
        <span aria-live="polite" className="hidden sm:flex absolute start-0 top-full -mt-0.5 text-meta leading-none">
          {moreToSelect ? (
            <button
              type="button"
              onClick={() => selectIds(filteredIds)}
              className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
            >
              Select all {filteredIds.length.toLocaleString()}
            </button>
          ) : notShown > 0 ? (
            <button
              type="button"
              onClick={showList}
              className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
            >
              {notShown.toLocaleString()} not shown
            </button>
          ) : null}
        </span>
      </span>
      {/* Three groups, split by hairlines: the selection (count, Clear), the
          work on it (Edit leads, filled; the rest are ghosts), and Delete on
          its own. Only Edit carries a fill, so the bar keeps the idle bar's
          weight when a selection starts. */}
      <BarButton icon={<X size={13} />} label="Clear" onClick={() => clear()} />
      <BarDivider className="hidden sm:block" />
      {actions.map((a) => (
        <Fragment key={a.id}>
          {a.danger && <BarDivider className="hidden sm:block" />}
          <BarButton
            icon={a.icon}
            label={a.label}
            onClick={a.onClick}
            disabledReason={a.disabledReason}
            tone={a.id === "edit" ? "lead" : a.danger ? "danger" : "ghost"}
          />
        </Fragment>
      ))}
      {/* Phone: the same actions, reachable. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md cursor-pointer`}
      >
        <MoreHorizontal size={13} className="text-ink-tertiary" aria-hidden /> Actions
      </button>
      <button
        type="button"
        onClick={() => clear()}
        className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${BAR_GHOST} rounded-md cursor-pointer`}
      >
        <X size={13} className="text-ink-tertiary" aria-hidden /> Clear
      </button>
      {sheetOpen && (
        <ActionsSheet
          count={n}
          onClose={() => setSheetOpen(false)}
          actions={actions}
        />
      )}
      <SelectionDialogs corpus={corpus} notInView={notInView} />
    </>
  );
}

/** A footer action. Disabled ones stay focusable (`aria-disabled`) and keep
 *  their width, and say why. Below a 56rem bar the label hides and the name
 *  stays as `aria-label`. */
function BarButton({
  icon,
  label,
  onClick,
  disabledReason,
  tone = "ghost",
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabledReason?: string;
  /** Weight on the bar's ladder (`warmButton.ts`). */
  tone?: "lead" | "ghost" | "danger";
}) {
  const disabled = !!disabledReason;
  return (
    <Hint text={disabledReason ?? label} describe={disabled}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          aria-label={label}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : onClick}
          className={`hidden sm:flex shrink-0 items-center gap-1.5 px-2.5 @[56rem]:px-3 py-1.5 text-xs font-medium ${
            tone === "lead" ? BAR_LEAD : tone === "danger" ? BAR_DANGER : BAR_GHOST
          } rounded-md transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className={tone === "danger" ? "" : "text-ink-tertiary"}>{icon}</span>
          <span className="hidden @[56rem]:inline">{label}</span>
        </button>
      )}
    </Hint>
  );
}

/** The selection's actions as a bottom sheet — the phone's version of the
 *  bar's buttons. Portalled, focus-trapped, Escape and the scrim close it; an
 *  action closes it too. Disabled actions stay listed, saying why. */
export function ActionsSheet({
  count,
  heading,
  actions,
  onClose,
}: {
  count?: number;
  /** The sheet's first line; "N selected" by default. */
  heading?: string;
  actions: { label: string; icon: ReactNode; onClick?: () => void; disabledReason?: string; danger?: boolean }[];
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  return createPortal(
    <div
      data-component="SelectionActionsSheet"
      className="fixed inset-0 z-50 flex items-end bg-ink/20"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={heading ?? `Actions for ${count} selected`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full rounded-t-lg bg-paper border-t border-border shadow-lg p-2 pb-4"
      >
        <p className="px-3 py-2 text-meta text-ink-tertiary tabular-nums">
          {heading ?? `${(count ?? 0).toLocaleString()} selected`}
        </p>
        <ul className="flex flex-col">
          {actions.map((a) => (
            <li key={a.label}>
              <button
                type="button"
                aria-disabled={a.disabledReason ? true : undefined}
                onClick={() => {
                  if (a.disabledReason) return;
                  onClose();
                  a.onClick?.();
                }}
                className={`w-full flex items-center gap-3 px-3 py-3 text-start text-sm rounded-md ${
                  a.disabledReason ? "text-ink-muted cursor-not-allowed" : "text-ink hover:bg-warm cursor-pointer"
                }`}
              >
                <span className="text-ink-tertiary" aria-hidden>
                  {a.icon}
                </span>
                <span className={`flex-1 ${a.danger && !a.disabledReason ? "text-seal-label" : ""}`}>{a.label}</span>
                {a.disabledReason && <span className="text-meta text-ink-muted">{a.disabledReason}</span>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
