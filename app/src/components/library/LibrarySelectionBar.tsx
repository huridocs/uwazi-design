import { useState, type ReactNode } from "react";
import { useAtomValue, useSetAtom, useStore } from "jotai";
import { FileDown, LayoutTemplate, Lock, PenLine, Share2, Trash2, X } from "lucide-react";
import {
  clearSelectionAtom,
  deselectIdsAtom,
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

  const n = selection.size;
  const inView = new Set(filteredIds);
  let notInView = 0;
  for (const id of selection) if (!inView.has(id)) notInView++;
  const allLoaded = loadedIds.length > 0 && loadedIds.every((id) => selection.has(id));
  const moreToSelect = allLoaded && filteredIds.length > loadedIds.length && filteredIds.some((id) => !selection.has(id));

  const showList = () => {
    setPreview(null);
    openDrawer(true);
  };
  const selectedEntities = (): Entity[] =>
    [...selection].map((id) => getEntity(id)).filter((e): e is Entity => !!e);

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
    store.set(notificationsAtom, (prev) => [
      {
        id: `n-${ref}`,
        kind: "success",
        title: `${ids.length.toLocaleString()} ${ids.length === 1 ? "entity" : "entities"} deleted.`,
        detail: "Undo restores them until you delete something else.",
        time: Date.now(),
        read: false,
        action: { label: "Undo", kind: "undo", ref },
      },
      ...prev,
    ]);
  };

  return (
    <>
      <span
        role="status"
        aria-live="polite"
        className="shrink-0 min-w-[7rem] flex items-center gap-1.5 text-xs tabular-nums"
      >
        <button
          type="button"
          onClick={showList}
          className="font-semibold text-ink hover:underline cursor-pointer rounded-sm
            focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-carbon/40"
        >
          {n.toLocaleString()} selected
        </button>
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
      <BarButton icon={<PenLine size={13} />} label="Edit" disabledReason="Bulk edit comes in a later step" />
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
      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}?`}
        message={
          notInView > 0
            ? `${notInView.toLocaleString()} of them are not in the current results. Undo restores them until you delete something else.`
            : "Undo restores them until you delete something else."
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
