import { Fragment, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom } from "jotai";
import { CheckSquare, ChevronUp, MousePointerClick, PanelRight, SquareMinus, X } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  clearSelectionAtom,
  enterSelectModeAtom,
  deselectIdsAtom,
  libraryOpenEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
  librarySelectionListAskedAtom,
  librarySelectModeAtom,
  selectIdsAtom,
} from "../../atoms/library";
import type { Corpus } from "../../data/entityChanges";
import { SelectionDialogs, useSelectionActions } from "./selectionActions";
import { SelectionActionsMenu } from "./SelectionActionsMenu";
import { MOD_KEY, SelectionScopeMenu, type ScopeItem } from "./SelectionScopeMenu";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../shared/warmButton";
import { BarDivider } from "../shared/BarDivider";
import { Hint } from "../shared/Hint";

/** The bulk actions the bar keeps in view, as icons; the rest are in its
 *  Actions menu. Delete sits apart, past a hairline. */
const IN_VIEW = new Set(["edit", "export", "delete"]);

/** The Library footer's SELECTED state — swapped in place of the baseline
 *  actions, in the same bar at the same height. It shows for a selection
 *  started from the view (Cmd/Ctrl or Shift + click, a long press) and for
 *  select mode, which may start with nothing picked.
 *
 *  Three things: the bulk actions at the bar's start (Edit, Export and
 *  Delete as icons, the rest in Actions; `useSelectionActions`, the same
 *  list the phone sheet and the selection drawer show), and at its end the
 *  selection control (`SelectionScopeMenu`, "652 selected ▾", which holds
 *  every scope and says where the selection sits) and Clear.
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
  const selectMode = useAtomValue(librarySelectModeAtom);
  const enterSelectMode = useSetAtom(enterSelectModeAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const openDrawer = useSetAtom(librarySelectionDrawerOpenAtom);
  const askList = useSetAtom(librarySelectionListAskedAtom);
  const setPreview = useSetAtom(libraryOpenEntityIdAtom);
  const [sheetOpen, setSheetOpen] = useState(false);
  // On a phone the bar's action buttons don't fit (they are `hidden sm:flex`),
  // and the selection drawer isn't rendered: the bar there is the count, which
  // opens a sheet of the scopes and the actions, and Clear.
  const isMobile = useAtomValue(breakpointAtom) === "mobile";

  const n = selection.size;
  const pageAllPicked = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  // Where each selected record is: drawn here, in the results on another
  // page (or, in a view that draws a subset, not drawn), or hidden by the
  // filters. Ids, never a count kept aside, so a filter change moves them
  // between the three and drops none: clearing the filters brings the hidden
  // ones back as selected.
  const inResults = new Set(filteredIds);
  const drawn = new Set(loadedIds);
  let onPage = 0;
  let offPage = 0;
  const hiddenIds: string[] = [];
  for (const id of selection) {
    if (drawn.has(id)) onPage++;
    else if (inResults.has(id)) offPage++;
    else hiddenIds.push(id);
  }
  const hidden = hiddenIds.length;
  const where = paged ? "on this page" : "shown";
  const elsewhere = paged ? "on other pages" : "not shown";
  const fmt = (x: number) => x.toLocaleString();

  // Where the selection sits, for the menu's top and the accessible names.
  const lines =
    n === 0
      ? ["Click records to add them."]
      : [
          onPage === n ? `All ${fmt(n)} ${where}` : onPage > 0 ? `${fmt(onPage)} ${where}` : "",
          offPage > 0 ? `${fmt(offPage)} ${elsewhere}` : "",
          hidden === n ? `All ${fmt(n)} hidden by filters` : hidden > 0 ? `${fmt(hidden)} hidden by filters` : "",
        ].filter(Boolean);
  // The bar's one line under the count: only what needs saying.
  const note = n === 0 ? "Click records to add them" : hidden > 0 ? `${fmt(hidden)} hidden by filters` : "";
  const name = `${fmt(n)} selected${n > 0 ? `: ${lines.join(", ")}` : ""}. Selection menu`;

  const showList = () => {
    setPreview(null);
    openDrawer(true);
    askList(true);
  };
  const pageCount = fmt(loadedIds.length);
  const scopes: ScopeItem[] = [
    ...(!selectMode
      ? [{ label: "Cherrypick", icon: <MousePointerClick size={14} />, help: `Click records to add them. ${MOD_KEY} + click works anytime.`, onClick: () => enterSelectMode() }]
      : []),
    ...(loadedIds.length > 0
      ? [
          pageAllPicked
            ? { label: paged ? "Deselect this page" : "Deselect all shown", icon: <SquareMinus size={14} />, onClick: () => deselect(loadedIds) }
            : { label: paged ? `Select this page (${pageCount})` : `Select all shown (${pageCount})`, icon: <CheckSquare size={14} />, onClick: () => selectIds(loadedIds) },
        ]
      : []),
    ...(hidden > 0 ? [{ label: `Drop ${fmt(hidden)} hidden by filters`, icon: <SquareMinus size={14} />, onClick: () => deselect(hiddenIds) }] : []),
    ...(n > 0 && !isMobile ? [{ label: "Show the selected records", icon: <PanelRight size={14} />, onClick: showList }] : []),
    { label: n === 0 ? "Stop selecting" : "Clear selection", onClick: () => clear(), apart: true },
  ];
  const actions = useSelectionActions({ order: filteredIds, corpus, isMobile, visibleIds: filteredIds });
  const inView = actions.filter((a) => IN_VIEW.has(a.id));
  const more = actions.filter((a) => !IN_VIEW.has(a.id));

  return (
    <>
      {/* The work on the selection first, at the bar's START where the idle
          bar keeps its own actions: Edit leads, Export beside it, the rest in
          Actions, Delete past a hairline. */}
      {inView.map((a) => (
        <Fragment key={a.id}>
          {a.danger && (
            <>
              <span className="hidden sm:block">
                <SelectionActionsMenu actions={more} align="start" />
              </span>
              <BarDivider className="hidden sm:block" />
            </>
          )}
          <BarButton
            icon={a.icon}
            label={a.id === "export" ? "Export CSV of the selection" : `${a.label} the selection`}
            hint={a.label}
            onClick={a.onClick}
            disabledReason={a.disabledReason}
            tone={a.id === "edit" ? "lead" : a.danger ? "danger" : "ghost"}
          />
        </Fragment>
      ))}
      {/* Phones carry Filters in the end menu. */}
      <span className="hidden sm:contents">{filtersSlot}</span>
      {/* The selection itself at the bar's logical END (it flips under RTL),
          where the idle bar keeps Select: the count, its menu and Clear.
          `ms-auto` pins the group to the end, so nothing at the start moves;
          the count's slot is fixed. */}
      <span data-part="selection-end" data-fold-push className="hidden sm:flex ms-auto shrink-0 self-stretch items-center gap-1">
        <span role="status" aria-live="polite" className="sr-only">
          {`${fmt(n)} selected${note ? `, ${note}` : ""}`}
        </span>
        <SelectionScopeMenu
          count={n}
          note={note}
          name={name}
          summary={{ head: `${fmt(n)} selected`, lines }}
          items={scopes}
        />
        <BarButton icon={<X size={13} />} label={n === 0 ? "Stop selecting" : "Clear the selection"} hint="Clear" onClick={() => clear()} />
      </span>
      {/* Phone: the count opens a sheet with where the selection sits, the
          scopes and the actions. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        aria-label={`${name.replace(/\. Selection menu$/, "")}. Scopes and actions`}
        className={`sm:hidden shrink-0 me-auto flex flex-col items-start px-2 py-1 leading-tight tabular-nums ${BAR_GHOST} rounded-md cursor-pointer`}
      >
        <span className="flex items-center gap-1 text-xs font-semibold text-ink whitespace-nowrap">
          <span><bdi>{fmt(n)} selected</bdi></span>
          <ChevronUp size={12} className="text-ink-tertiary" aria-hidden />
        </span>
        <span className="text-meta text-ink-tertiary truncate"><bdi>{note || "\u00a0"}</bdi></span>
      </button>
      <span role="status" aria-live="polite" className="sr-only sm:hidden">
        {`${fmt(n)} selected${note ? `, ${note}` : ""}`}
      </span>
      <button
        type="button"
        onClick={() => clear()}
        aria-label={n === 0 ? "Stop selecting" : "Clear the selection"}
        className={`sm:hidden shrink-0 inline-flex items-center justify-center w-9 h-9 ${BAR_GHOST} rounded-md cursor-pointer`}
      >
        <X size={15} className="text-ink-tertiary" aria-hidden />
      </button>
      {sheetOpen && (
        <ActionsSheet
          heading={`${fmt(n)} selected`}
          lines={lines}
          onClose={() => setSheetOpen(false)}
          scopes={scopes
            .filter((s) => !s.apart)
            .map((s) => ({ label: s.label, icon: s.icon, onClick: s.onClick }))}
          actions={actions}
          end={[{ label: n === 0 ? "Stop selecting" : "Clear selection", icon: <X size={14} />, onClick: () => clear() }]}
        />
      )}
      <SelectionDialogs corpus={corpus} notInView={hidden} />
    </>
  );
}

/** A selection action on the bar: an icon with a Hint that names it. Disabled
 *  ones stay focusable (`aria-disabled`) and say why. */
function BarButton({
  icon,
  label,
  hint: hintText,
  onClick,
  disabledReason,
  tone = "ghost",
}: {
  icon: ReactNode;
  /** The accessible name, saying what it acts on. */
  label: string;
  /** The tooltip; the label by default. */
  hint?: string;
  onClick?: () => void;
  disabledReason?: string;
  /** Weight on the bar's ladder (`warmButton.ts`). */
  tone?: "lead" | "ghost" | "danger";
}) {
  const disabled = !!disabledReason;
  return (
    <Hint text={disabledReason ?? hintText ?? label} describe={disabled}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          aria-label={label}
          aria-disabled={disabled || undefined}
          onClick={disabled ? undefined : onClick}
          className={`hidden sm:flex shrink-0 items-center justify-center w-8 h-8 ${
            tone === "lead" ? BAR_LEAD : tone === "danger" ? BAR_DANGER : BAR_GHOST
          } rounded-md transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <span className={tone === "danger" ? "" : tone === "lead" ? "text-ink" : "text-ink-tertiary"}>{icon}</span>
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
  lines,
  scopes,
  actions,
  end,
  onClose,
}: {
  count?: number;
  /** The sheet's first line; "N selected" by default. */
  heading?: string;
  /** Text under the heading (where the selection sits). */
  lines?: string[];
  /** What the selection covers (this page, records hidden by filters), listed above the
   *  actions and apart from them. */
  scopes?: SheetItem[];
  actions: SheetItem[];
  /** Listed last, apart (Clear selection). */
  end?: SheetItem[];
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const title = heading ?? `${(count ?? 0).toLocaleString()} selected`;
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
        <div className="px-3 py-2 tabular-nums">
          <p className={lines ? "text-xs font-semibold text-ink" : "text-meta text-ink-tertiary"}><bdi>{title}</bdi></p>
          {lines?.map((l) => (
            <p key={l} className="text-meta text-ink-tertiary">
              <bdi>{l}</bdi>
            </p>
          ))}
        </div>
        {scopes && scopes.length > 0 && (
          <>
            <SheetList items={scopes} onClose={onClose} />
            <div role="separator" className="mx-3 my-1 h-px bg-border-soft" />
          </>
        )}
        <SheetList items={actions} onClose={onClose} />
        {end && end.length > 0 && (
          <>
            <div role="separator" className="mx-3 my-1 h-px bg-border-soft" />
            <SheetList items={end} onClose={onClose} />
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

interface SheetItem {
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  disabledReason?: string;
  danger?: boolean;
}

function SheetList({ items, onClose }: { items: SheetItem[]; onClose: () => void }) {
  return (
    <ul className="flex flex-col">
      {items.map((a) => (
        <li key={a.label}>
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
        </li>
      ))}
    </ul>
  );
}

