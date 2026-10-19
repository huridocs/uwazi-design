import { Fragment, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare, ListChecks, MoreHorizontal, SquareMinus, X } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  clearSelectionAtom,
  deselectIdsAtom,
  libraryOpenEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
  librarySelectionListAskedAtom,
  selectIdsAtom,
} from "../../atoms/library";
import type { Corpus } from "../../data/entityChanges";
import { SelectionDialogs, useSelectionActions, type SelectionAction } from "./selectionActions";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { BarDivider } from "../shared/BarDivider";
import { Hint } from "../shared/Hint";
import { useFooterFold } from "./footerFold";
import { SelectAllBox } from "./SelectAllBox";

/** The Library footer's SELECTED state — swapped in place of the baseline
 *  actions, in the same bar at the same height. It shows for a selection
 *  started from the view (Cmd/Ctrl or Shift + click, a long press) and for
 *  the bar's Select mode, which may start with nothing picked.
 *
 *  Order: the actions (`useSelectionActions` — the same list the phone sheet
 *  and the selection drawer's menu show), then the end group, in the three
 *  scopes a selection has: the "This page · 30" box, the readout (a live
 *  region in a fixed slot, its second line saying how much of the selection
 *  is off this page), "Select all N" for every result across pages, and
 *  Clear. Below a 56rem bar every action keeps only its icon and its name.
 *
 *  This component subscribes to the selection; the view around it does not. */
export function LibrarySelectionBar({
  filteredIds,
  loadedIds,
  paged = true,
  corpus,
  filtersSlot,
}: {
  /** Every id the current results hold (filters, query, match types). */
  filteredIds: readonly string[];
  /** The ids the view in front draws (a page of Cards or List). */
  loadedIds: readonly string[];
  /** The view pages its results, so "shown" is "this page". */
  paged?: boolean;
  corpus: Corpus;
  /** The active-filters readout, placed after the actions and before the
   *  end group. */
  filtersSlot?: ReactNode;
}) {
  const selection = useAtomValue(librarySelectionAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const openDrawer = useSetAtom(librarySelectionDrawerOpenAtom);
  const askList = useSetAtom(librarySelectionListAskedAtom);
  const setPreview = useSetAtom(libraryOpenEntityIdAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  // On a phone the bar's action buttons don't fit (they are `hidden sm:flex`),
  // and the selection drawer isn't rendered — so the bar there is the count,
  // an Actions button opening a sheet of the same actions, and Clear.
  const isMobile = useAtomValue(breakpointAtom) === "mobile";

  const n = selection.size;
  const deselect = useSetAtom(deselectIdsAtom);
  const pageAllPicked = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const inView = new Set(filteredIds);
  let notInView = 0;
  for (const id of selection) if (!inView.has(id)) notInView++;
  // Selected but not DRAWN — filtered out, or on another page. After "Select all 4,398" and the box unticked, 4,278 stay
  // selected; this is where that is said, not left silent.
  const drawn = new Set(loadedIds);
  let notShown = 0;
  for (const id of selection) if (!drawn.has(id)) notShown++;
  const total = filteredIds.length;
  // More results than the view draws: the whole-library scope exists. It
  // depends on the results, not the selection, so its slot comes and goes
  // only with a page change, never with a tick.
  const acrossPages = total > loadedIds.length;
  const moreToSelect = acrossPages && filteredIds.some((id) => !selection.has(id));
  const fold = useFooterFold();
  const where = paged ? "on this page" : "shown";
  // The readout's second line: always whether any of the selection is off
  // this page (another page, or filtered out).
  const placement =
    n === 0
      ? "Click records to add them"
      : notShown === 0
        ? paged
          ? "All on this page"
          : "All shown"
        : notShown === n
          ? paged
            ? "None on this page"
            : "None shown"
          : `${notShown.toLocaleString()} not ${where}`;
  const selectEvery = () => selectIds(filteredIds);

  const showList = () => {
    if (isMobile) return setSheetOpen(true);
    setPreview(null);
    openDrawer(true);
    askList(true);
  };
  const actions = useSelectionActions({ order: filteredIds, corpus, isMobile });

  return (
    <>
      {/* The work on the selection first, at the bar's START where the idle
          bar keeps its own actions: Edit leads, the rest are ghosts, Delete
          sits past a hairline. */}
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
      {filtersSlot}
      {/* The selection itself at the bar's logical END (it flips under RTL),
          from the narrowest scope to the widest: this page, the count, every
          result, Clear. `ms-auto` pins the group to the end, so nothing at
          the start moves. Every part keeps a fixed slot: the count and its
          second line change inside theirs, and the "Select all N" slot is
          there whenever the results run past the page, holding the offer or,
          once taken, "All N results". */}
      <span data-part="selection-end" data-fold-push className="hidden sm:flex ms-auto shrink-0 items-center gap-1">
        <span className="inline-flex shrink-0 me-1">
          <SelectAllBox loadedIds={loadedIds} paged={paged} compact={fold >= 4} />
        </span>
        <span className="shrink-0 w-[9rem] flex flex-col justify-center text-xs tabular-nums leading-tight">
          <span role="status" aria-live="polite" className="flex flex-col min-w-0">
            <button
              type="button"
              onClick={showList}
              aria-label={`${n.toLocaleString()} selected, ${placement.toLowerCase()}. Show the selection`}
              className="self-start max-w-full font-semibold text-ink hover:underline cursor-pointer rounded-sm truncate
                focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
            >
              {n.toLocaleString()} selected
            </button>
            <span aria-hidden data-part="placement" className="text-meta text-ink-tertiary truncate">
              {placement}
            </span>
          </span>
        </span>
        {acrossPages && (
          <span data-part="select-every" className={`shrink-0 inline-flex ${fold >= 4 ? "w-[5.75rem]" : "w-[8.75rem]"}`}>
            {moreToSelect ? (
              <BarButton
                icon={<ListChecks size={13} />}
                label={fold >= 4 ? `All ${total.toLocaleString()}` : `Select all ${total.toLocaleString()}`}
                name={`Select all ${total.toLocaleString()} results, across every page`}
                hint={`Select every result of this search and its filters: ${total.toLocaleString()} records on every page.`}
                keepLabel
                onClick={selectEvery}
              />
            ) : (
              <span className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium text-ink-secondary tabular-nums whitespace-nowrap">
                <ListChecks size={13} className="text-ink-tertiary" aria-hidden />
                {fold >= 4 ? `All ${total.toLocaleString()}` : `All ${total.toLocaleString()} results`}
              </span>
            )}
          </span>
        )}
        <BarButton icon={<X size={13} />} label="Clear" name={n === 0 ? "Stop selecting" : "Clear the selection"} onClick={() => clear()} />
      </span>
      {/* Phone: the count and its second line; the scopes are in the Actions
          sheet, which has the room to name them. */}
      <span role="status" aria-live="polite" className="sm:hidden shrink-0 me-auto flex flex-col leading-tight tabular-nums">
        <span className="text-xs font-semibold text-ink">{n.toLocaleString()} selected</span>
        <span className="text-meta text-ink-tertiary">{placement}</span>
      </span>
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
          heading={`${n.toLocaleString()} selected · ${placement}`}
          onClose={() => setSheetOpen(false)}
          scopes={[
            pageAllPicked
              ? {
                  label: `Deselect ${paged ? "this page" : "all shown"} (${loadedIds.length.toLocaleString()})`,
                  icon: <SquareMinus size={14} />,
                  onClick: () => deselect(loadedIds),
                }
              : {
                  label: `Select ${paged ? "this page" : "all shown"} (${loadedIds.length.toLocaleString()})`,
                  icon: <CheckSquare size={14} />,
                  onClick: () => selectIds(loadedIds),
                  disabledReason: loadedIds.length === 0 ? "Nothing shown" : undefined,
                },
            ...(acrossPages
              ? [
                  moreToSelect
                    ? { label: `Select all ${total.toLocaleString()} results`, icon: <ListChecks size={14} />, onClick: selectEvery }
                    : {
                        label: `All ${total.toLocaleString()} results selected`,
                        icon: <ListChecks size={14} />,
                        done: true,
                      },
                ]
              : []),
          ]}
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
  name,
  hint: hintText,
  keepLabel = false,
  onClick,
  disabledReason,
  tone = "ghost",
}: {
  icon: ReactNode;
  label: string;
  /** The accessible name, when it says more than the label. */
  name?: string;
  /** The tooltip, when it says more than the label. */
  hint?: string;
  /** Keep the words on a folded bar (they carry a count). */
  keepLabel?: boolean;
  onClick?: () => void;
  disabledReason?: string;
  /** Weight on the bar's ladder (`warmButton.ts`). */
  tone?: "lead" | "ghost" | "danger";
}) {
  const disabled = !!disabledReason;
  // From the bar's first fold the label goes; the hint then names the action.
  const fold = useFooterFold();
  const iconOnly = !keepLabel && fold >= 1;
  return (
    <Hint text={disabledReason ?? hintText ?? label} describe={disabled} muted={!disabled && !iconOnly && !hintText}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          aria-label={name ?? label}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : onClick}
          className={`hidden sm:flex shrink-0 items-center gap-1.5 ${iconOnly ? "px-2.5" : "px-3"} py-1.5 text-xs font-medium ${
            tone === "lead" ? BAR_LEAD : tone === "danger" ? BAR_DANGER : BAR_GHOST
          } rounded-md transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className={tone === "danger" ? "" : "text-ink-tertiary"}>{icon}</span>
          {!iconOnly && <span>{label}</span>}
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
  scopes,
  actions,
  onClose,
}: {
  count?: number;
  /** The sheet's first line; "N selected" by default. */
  heading?: string;
  /** What the selection covers (this page, every result), listed above the
   *  actions and apart from them. */
  scopes?: SheetItem[];
  actions: SheetItem[];
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
        {scopes && scopes.length > 0 && (
          <>
            <SheetList items={scopes} onClose={onClose} />
            <div role="separator" className="mx-3 my-1 h-px bg-border-soft" />
          </>
        )}
        <SheetList items={actions} onClose={onClose} />
      </div>
    </div>,
    document.body,
  );
}

interface SheetItem {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabledReason?: string;
  danger?: boolean;
  /** A state already reached ("All 4,398 results selected"): read, not pressed. */
  done?: boolean;
}

function SheetList({ items, onClose }: { items: SheetItem[]; onClose: () => void }) {
  return (
    <ul className="flex flex-col">
      {items.map((a) => (
        <li key={a.label}>
          {a.done ? (
            <p className="w-full flex items-center gap-3 px-3 py-3 text-sm text-ink-secondary tabular-nums">
              <span className="text-ink-tertiary" aria-hidden>
                {a.icon}
              </span>
              {a.label}
            </p>
          ) : (
            <button
              type="button"
              aria-disabled={a.disabledReason ? true : undefined}
              onClick={() => {
                if (a.disabledReason) return;
                onClose();
                a.onClick?.();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 text-start text-sm tabular-nums rounded-md ${
                a.disabledReason ? "text-ink-muted cursor-not-allowed" : "text-ink hover:bg-warm cursor-pointer"
              }`}
            >
              <span className="text-ink-tertiary" aria-hidden>
                {a.icon}
              </span>
              <span className={`flex-1 ${a.danger && !a.disabledReason ? "text-seal-label" : ""}`}>{a.label}</span>
              {a.disabledReason && <span className="text-meta text-ink-tertiary">{a.disabledReason}</span>}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
