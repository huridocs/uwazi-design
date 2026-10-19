import type { ReactNode } from "react";
import { atom, useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { FileDown, LayoutTemplate, Lock, PenLine, Share2, Trash2 } from "lucide-react";
import {
  deselectIdsAtom,
  libraryEditRequestAtom,
  libraryOpenEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDialogAtom,
  openBulkEditAtom,
  whenBulkCleanAtom,
} from "../../atoms/library";
import { deleteWithUndoAtom } from "../../atoms/entityChanges";
import { notificationsAtom } from "../../atoms/notifications";
import { languageAtom } from "../../atoms/language";
import { libraryTypesAtom } from "../../atoms/dataSource";
import type { Corpus } from "../../data/entityChanges";
import { entityCorpusOf, getEntity, type Entity } from "../../data/entities";
import { runCsvExport } from "../../utils/libraryTasks";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { Modal, MODAL_BUTTON, MODAL_COMMIT } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";
import { ShareEntityModal } from "../share/ShareEntityModal";
import { ChangeTemplateDialog } from "./ChangeTemplateDialog";

/** The selection's actions — ONE list, in the bar's order, for the three
 *  places that show them: the footer bar, the phone's sheet and the selection
 *  drawer's Actions menu. Each opens the same dialog (`SelectionDialogs`). */
export interface SelectionAction {
  id: "edit" | "change-template" | "export" | "share" | "permissions" | "delete";
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabledReason?: string;
  danger?: boolean;
}

/** An action asked to run on a selection that holds records the filters
 *  hide: the reader chooses all of them or only the ones in view
 *  (`SelectionDialogs`). `run` reads the selection when it runs, so "only in
 *  view" can deselect the hidden ones first. */
const hiddenScopeAtom = atom<{ label: string; hiddenIds: readonly string[]; run: () => void } | null>(null);

export function useSelectionActions({
  order,
  corpus,
  isMobile = false,
  visibleIds,
}: {
  /** The order the export writes rows in — the results', or the drawer's. */
  order: readonly string[];
  corpus: Corpus;
  isMobile?: boolean;
  /** The results the reader can reach under the current filters. Given, an
   *  action on a selection holding records outside them asks first whether
   *  to include those. The selection drawer passes none: it lists every
   *  selected record, so none is out of sight there. */
  visibleIds?: readonly string[];
}): SelectionAction[] {
  const store = useStore();
  const selection = useAtomValue(librarySelectionAtom);
  const language = useAtomValue(languageAtom);
  const types = useAtomValue(libraryTypesAtom);
  const setPreview = useSetAtom(libraryOpenEntityIdAtom);
  const guard = useDirtyGuard();
  const open = useSetAtom(librarySelectionDialogAtom);
  const askScope = useSetAtom(hiddenScopeAtom);
  const n = selection.size;
  let hiddenIds: string[] = [];
  if (visibleIds) {
    const visible = new Set(visibleIds);
    hiddenIds = [...selection].filter((id) => !visible.has(id));
  }
  /** Run `fn`, or first ask about the hidden records. Delete has its own
   *  confirm, which names them. */
  const scoped = (label: string, fn: () => void) => () =>
    hiddenIds.length > 0 ? askScope({ label, hiddenIds, run: fn }) : fn();

  const edit = () => {
    const now = store.get(librarySelectionAtom);
    if (now.size === 1) {
      const [id] = now;
      guard(() => {
        store.set(libraryEditRequestAtom, id);
        setPreview(id);
      });
      return;
    }
    store.set(openBulkEditAtom);
  };
  // In the given order, then the rest — not the order they were clicked in.
  const exportSelection = () => {
    const now = store.get(librarySelectionAtom);
    const ordered = order.filter((id) => now.has(id));
    const shown = new Set(ordered);
    for (const id of now) if (!shown.has(id)) ordered.push(id);
    void runCsvExport(
      store,
      ordered.map((id) => getEntity(id)).filter((e): e is Entity => !!e),
      language,
      `uwazi-${corpus}-selection-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };
  // Disabled only when there is nowhere to go: one template, and every
  // selected entity already on it.
  const noOtherTemplate =
    types.length < 2 && [...selection].every((id) => getEntity(id)?.typeId === types[0]?.id);

  const actions: SelectionAction[] = [
    {
      id: "edit",
      label: "Edit",
      icon: <PenLine size={13} />,
      onClick: scoped("Edit", edit),
      disabledReason: isMobile && n > 1 ? "Bulk edit needs a wider screen" : undefined,
    },
    {
      id: "change-template",
      label: "Change template",
      icon: <LayoutTemplate size={13} />,
      onClick: scoped("Change template", () => open("change-template")),
      disabledReason: noOtherTemplate ? "No other template to change to" : undefined,
    },
    { id: "export", label: "Export CSV", icon: <FileDown size={13} />, onClick: scoped("Export", exportSelection) },
    { id: "share", label: "Share", icon: <Share2 size={13} />, onClick: scoped("Share", () => open("share")) },
    { id: "permissions", label: "Permissions", icon: <Lock size={13} />, onClick: scoped("Set permissions for", () => open("permissions")) },
    { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => open("delete"), danger: true },
  ];
  // Select mode starts with nothing picked: every action waits for a record.
  return n === 0 ? actions.map((a) => ({ ...a, disabledReason: "Select records first" })) : actions;
}

/** The selection's dialogs, mounted once (by the footer bar, which is there
 *  whenever a selection is). The set each one acts on is frozen when it
 *  opens. */
export function SelectionDialogs({ corpus, notInView }: { corpus: Corpus; notInView: number }) {
  const store = useStore();
  const [dialog, setDialog] = useAtom(librarySelectionDialogAtom);
  const selection = useAtomValue(librarySelectionAtom);
  const types = useAtomValue(libraryTypesAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  const setPreview = useSetAtom(libraryOpenEntityIdAtom);
  const n = selection.size;
  const close = () => setDialog(null);

  const doDelete = () => {
    close();
    // Behind the bulk form's guard BEFORE anything is deleted: with a dirty
    // form, "Cancel" must leave the entities where they are, not
    // deleted-but-still-selected in the form's frozen set.
    store.set(whenBulkCleanAtom, deleteSelection);
  };
  const deleteSelection = () => {
    const ids = [...store.get(librarySelectionAtom)];
    if (!ids.length) return;
    // The entities' own corpus, not the collection on screen.
    const own = entityCorpusOf(ids[0]);
    const ref = store.set(deleteWithUndoAtom, { corpus: own, ids });
    deselect(ids);
    // A deleted entity left open in the preview would go on offering Edit.
    const previewed = store.get(libraryOpenEntityIdAtom);
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
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}?`}
        message={
          notInView > 0
            ? `${notInView.toLocaleString()} of them are hidden by the current filters. Undo restores them until your next delete or bulk change.`
            : "Undo restores them until your next delete or bulk change."
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={doDelete}
        onCancel={close}
      />
      {dialog === "change-template" && (
        <ChangeTemplateDialog ids={[...selection]} corpus={corpus} types={types} onClose={close} />
      )}
      <HiddenScopeDialog />
      <ShareEntityModal
        open={dialog === "share" || dialog === "permissions"}
        onClose={close}
        ids={[...selection]}
        initialFocus={dialog === "permissions" ? "people" : "access"}
      />
    </>
  );
}

/** "8 of the 60 selected are hidden by the filters": the action runs on all
 *  of them only when the reader says so, or on the ones in view after the
 *  hidden ones are dropped from the selection. */
function HiddenScopeDialog() {
  const store = useStore();
  const [ask, setAsk] = useAtom(hiddenScopeAtom);
  const deselect = useSetAtom(deselectIdsAtom);
  if (!ask) return null;
  const n = store.get(librarySelectionAtom).size;
  const hidden = ask.hiddenIds.length;
  const inView = n - hidden;
  // The question's first word stays with the next one (no word alone at a line's end).
  const lead = ask.label.includes(" ") ? `${ask.label.replace(" ", "\u00a0")} ` : `${ask.label}\u00a0`;
  const close = () => setAsk(null);
  const go = (onlyInView: boolean) => {
    close();
    if (onlyInView) deselect(ask.hiddenIds);
    ask.run();
  };
  return (
    <Modal
      component="HiddenScopeDialog"
      size="sm"
      dismissOnScrim={false}
      onClose={close}
      title="Include records hidden by the filters?"
      describedBy="hidden-scope-message"
      footer={
        <>
          <button type="button" onClick={close} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          {inView > 0 && (
            <button type="button" onClick={() => go(true)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer tabular-nums`}>
              Only the {inView.toLocaleString()} in view
            </button>
          )}
          <button type="button" onClick={() => go(false)} className={`${MODAL_COMMIT} tabular-nums`}>
            All {n.toLocaleString()}
          </button>
        </>
      }
    >
      <p id="hidden-scope-message" className="text-sm text-ink tabular-nums">
        {`${hidden.toLocaleString()} of the ${n.toLocaleString()} selected records are hidden by the current filters. `}
        {inView > 0
          ? `${lead}all ${n.toLocaleString()}, or only the ${inView.toLocaleString()} in view?`
          : `${lead}all ${n.toLocaleString()} anyway?`}
      </p>
    </Modal>
  );
}
