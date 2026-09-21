import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { FileDown, LayoutTemplate, Lock, MoreHorizontal, PenLine, Share2, Trash2, X } from "lucide-react";
import { breakpointAtom } from "../../atoms/viewport";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import {
  clearSelectionAtom,
  deselectIdsAtom,
  libraryBulkEditOpenAtom,
  libraryEditRequestAtom,
  librarySelectedEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDrawerOpenAtom,
  selectIdsAtom,
} from "../../atoms/library";
import { deleteWithUndoAtom } from "../../atoms/entityOverlay";
import { notificationsAtom } from "../../atoms/notifications";
import { languageAtom } from "../../atoms/language";
import type { Corpus } from "../../data/entityOverlay";
import { getEntity, type Entity } from "../../data/entities";
import { runCsvExport } from "../../utils/libraryTasks";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { WARM_BUTTON } from "../shared/warmButton";
import { Hint } from "../shared/Hint";

/** The Library footer's SELECTED state — swapped in place of the four
 *  baseline actions, in the same bar at the same height.
 *
 *  Order: the readout (a live region, fixed width, so 9 → 10 → 100 moves no
 *  button), "N not in view", the offer to select the rest of the results,
 *  then the actions and Clear. Edit, Change template, Share and Permissions
 *  are the bulk-actions spec's later steps: here they are disabled, still
 *  focusable, saying so. Export CSV and Delete work. Below a 56rem bar every
 *  action keeps only its icon and its name.
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
  const store = useStore();
  const selection = useAtomValue(librarySelectionAtom);
  const language = useAtomValue(languageAtom);
  const clear = useSetAtom(clearSelectionAtom);
  const selectIds = useSetAtom(selectIdsAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const openDrawer = useSetAtom(librarySelectionDrawerOpenAtom);
  const setPreview = useSetAtom(librarySelectedEntityIdAtom);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  // On a phone the bar's action buttons don't fit (they are `hidden sm:flex`),
  // and the selection drawer isn't rendered — so the bar there is the count,
  // an Actions button opening a sheet of the same actions, and Clear.
  const isMobile = useAtomValue(breakpointAtom) === "mobile";

  const n = selection.size;
  const inView = new Set(filteredIds);
  let notInView = 0;
  for (const id of selection) if (!inView.has(id)) notInView++;
  const allLoaded = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const moreToSelect = allLoaded && filteredIds.length > loadedIds.length && filteredIds.some((id) => !selection.has(id));

  const showList = () => {
    if (isMobile) return setSheetOpen(true);
    setPreview(null);
    openDrawer(true);
  };
  // In the order the results are drawn, then the ones not in view — not the
  // order they happened to be clicked in.
  const selectedEntities = (): Entity[] => {
    const ordered = filteredIds.filter((id) => selection.has(id));
    const shown = new Set(ordered);
    for (const id of selection) if (!shown.has(id)) ordered.push(id);
    return ordered.map((id) => getEntity(id)).filter((e): e is Entity => !!e);
  };

  /* Edit: one entity is its ordinary edit, in its preview; two or more is the
     bulk form, in the selection drawer. The phone has no drawer for a form
     that long, so there it stays a single-entity action. */
  const edit = () => {
    if (n === 1) {
      const [id] = selection;
      store.set(libraryEditRequestAtom, id);
      setPreview(id);
      return;
    }
    setPreview(null);
    store.set(libraryBulkEditOpenAtom, true);
    openDrawer(true);
  };

  const exportSelection = () =>
    void runCsvExport(
      store,
      selectedEntities(),
      language,
      `uwazi-${corpus}-selection-${new Date().toISOString().slice(0, 10)}.csv`,
    );

  const doDelete = () => {
    setConfirmDelete(false);
    const ids = [...selection];
    const ref = store.set(deleteWithUndoAtom, { corpus, ids });
    deselect(ids);
    // A deleted entity left open in the preview would go on offering Edit.
    const previewed = store.get(librarySelectedEntityIdAtom);
    if (previewed && ids.includes(previewed)) setPreview(null);
    store.set(notificationsAtom, (prev) => [
      {
        id: `n-${ref}`,
        kind: "success",
        title: `${ids.length.toLocaleString()} ${ids.length === 1 ? "entity" : "entities"} deleted.`,
        detail: "Undo restores them until your next delete or bulk change.",
        time: Date.now(),
        read: false,
        action: { label: "Undo", kind: "undo", ref },
      },
      ...prev,
    ]);
  };

  return (
    <>
      {/* The count, in a FIXED slot (up to "4,398 selected" in tabular
          figures), so 9 → 10 → 100 moves no button. What varies more — "N not
          in view", "Select all N" — rides after Clear, where appearing and
          disappearing moves nothing but the empty space before the filters. */}
      <span role="status" aria-live="polite" className="shrink-0 w-[7rem] flex items-center text-xs tabular-nums">
        <button
          type="button"
          onClick={showList}
          className="font-semibold text-ink hover:underline cursor-pointer rounded-sm truncate
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
        >
          {n.toLocaleString()} selected
        </button>
      </span>
      <BarButton icon={<PenLine size={13} />} label="Edit" onClick={edit} />
      <BarButton
        icon={<LayoutTemplate size={13} />}
        label="Change template"
        disabledReason="Change template comes in a later step"
      />
      <BarButton icon={<FileDown size={13} />} label="Export CSV" onClick={exportSelection} />
      <BarButton icon={<Share2 size={13} />} label="Share" disabledReason="Sharing a selection comes in a later step" />
      <BarButton icon={<Lock size={13} />} label="Permissions" disabledReason="Permissions come in a later step" />
      <BarButton icon={<Trash2 size={13} />} label="Delete" onClick={() => setConfirmDelete(true)} />
      <BarButton icon={<X size={13} />} label="Clear" onClick={() => clear()} />
      <span aria-live="polite" className="hidden sm:flex min-w-0 items-center gap-1.5 text-xs tabular-nums">
        {notInView > 0 && (
            <>
              <span aria-hidden className="text-ink-muted">·</span>
              <button
                type="button"
                onClick={showList}
                className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
              >
                {notInView.toLocaleString()} not in view
              </button>
            </>
          )}
          {moreToSelect && (
            <>
              <span aria-hidden className="text-ink-muted">·</span>
              <button
                type="button"
                onClick={() => selectIds(filteredIds)}
                className="text-carbon hover:underline cursor-pointer rounded-sm whitespace-nowrap
                  focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
              >
                Select all {filteredIds.length.toLocaleString()}
              </button>
            </>
          )}
      </span>
      {/* Phone: the same actions, reachable. */}
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={sheetOpen}
        className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md cursor-pointer`}
      >
        <MoreHorizontal size={13} className="text-ink-tertiary" aria-hidden /> Actions
      </button>
      <button
        type="button"
        onClick={() => clear()}
        className={`sm:hidden shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md cursor-pointer`}
      >
        <X size={13} className="text-ink-tertiary" aria-hidden /> Clear
      </button>
      {sheetOpen && (
        <ActionsSheet
          count={n}
          onClose={() => setSheetOpen(false)}
          actions={[
            { label: "Export CSV", icon: <FileDown size={14} />, onClick: exportSelection },
            { label: "Delete", icon: <Trash2 size={14} />, onClick: () => setConfirmDelete(true) },
            n === 1
              ? { label: "Edit", icon: <PenLine size={14} />, onClick: edit }
              : { label: "Edit", icon: <PenLine size={14} />, disabledReason: "Bulk edit needs a wider screen" },
            { label: "Change template", icon: <LayoutTemplate size={14} />, disabledReason: "Change template comes in a later step" },
            { label: "Share", icon: <Share2 size={14} />, disabledReason: "Sharing a selection comes in a later step" },
            { label: "Permissions", icon: <Lock size={14} />, disabledReason: "Permissions come in a later step" },
          ]}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}?`}
        message={
          notInView > 0
            ? `${notInView.toLocaleString()} of them are not in the current results. Undo restores them until your next delete or bulk change.`
            : "Undo restores them until your next delete or bulk change."
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
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
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabledReason?: string;
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
          className={`hidden sm:flex shrink-0 items-center gap-1.5 px-2.5 @[56rem]:px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <span className="text-ink-tertiary">{icon}</span>
          <span className="hidden @[56rem]:inline">{label}</span>
        </button>
      )}
    </Hint>
  );
}

/** The selection's actions as a bottom sheet — the phone's version of the
 *  bar's buttons. Portalled, focus-trapped, Escape and the scrim close it; an
 *  action closes it too. Disabled actions stay listed, saying why. */
function ActionsSheet({
  count,
  actions,
  onClose,
}: {
  count: number;
  actions: { label: string; icon: ReactNode; onClick?: () => void; disabledReason?: string }[];
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
        aria-label={`Actions for ${count} selected`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        className="w-full rounded-t-lg bg-paper border-t border-border shadow-lg p-2 pb-4"
      >
        <p className="px-3 py-2 text-meta text-ink-tertiary tabular-nums">
          {count.toLocaleString()} selected
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
                <span className="flex-1">{a.label}</span>
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
