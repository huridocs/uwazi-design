import type { ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { FileDown, LayoutTemplate, Lock, PenLine, Share2, Trash2 } from "lucide-react";
import {
  deselectIdsAtom,
  libraryEditRequestAtom,
  librarySelectedEntityIdAtom,
  librarySelectionAtom,
  librarySelectionDialogAtom,
  openBulkEditAtom,
} from "../../atoms/library";
import { deleteWithUndoAtom } from "../../atoms/entityOverlay";
import { notificationsAtom } from "../../atoms/notifications";
import { languageAtom } from "../../atoms/language";
import { libraryTypesAtom } from "../../atoms/dataSource";
import type { Corpus } from "../../data/entityOverlay";
import { getEntity, type Entity } from "../../data/entities";
import { runCsvExport } from "../../utils/libraryTasks";
import { ConfirmDialog } from "../shared/ConfirmDialog";
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

export function useSelectionActions({
  order,
  corpus,
  isMobile = false,
}: {
  /** The order the export writes rows in — the results', or the drawer's. */
  order: readonly string[];
  corpus: Corpus;
  isMobile?: boolean;
}): SelectionAction[] {
  const store = useStore();
  const selection = useAtomValue(librarySelectionAtom);
  const language = useAtomValue(languageAtom);
  const types = useAtomValue(libraryTypesAtom);
  const setPreview = useSetAtom(librarySelectedEntityIdAtom);
  const open = useSetAtom(librarySelectionDialogAtom);
  const n = selection.size;

  const edit = () => {
    if (n === 1) {
      const [id] = selection;
      store.set(libraryEditRequestAtom, id);
      setPreview(id);
      return;
    }
    store.set(openBulkEditAtom);
  };
  // In the given order, then the rest — not the order they were clicked in.
  const exportSelection = () => {
    const ordered = order.filter((id) => selection.has(id));
    const shown = new Set(ordered);
    for (const id of selection) if (!shown.has(id)) ordered.push(id);
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

  return [
    {
      id: "edit",
      label: "Edit",
      icon: <PenLine size={13} />,
      onClick: edit,
      disabledReason: isMobile && n > 1 ? "Bulk edit needs a wider screen" : undefined,
    },
    {
      id: "change-template",
      label: "Change template",
      icon: <LayoutTemplate size={13} />,
      onClick: () => open("change-template"),
      disabledReason: noOtherTemplate ? "No other template to change to" : undefined,
    },
    { id: "export", label: "Export CSV", icon: <FileDown size={13} />, onClick: exportSelection },
    { id: "share", label: "Share", icon: <Share2 size={13} />, onClick: () => open("share") },
    { id: "permissions", label: "Permissions", icon: <Lock size={13} />, onClick: () => open("permissions") },
    { id: "delete", label: "Delete", icon: <Trash2 size={13} />, onClick: () => open("delete"), danger: true },
  ];
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
  const setPreview = useSetAtom(librarySelectedEntityIdAtom);
  const n = selection.size;
  const close = () => setDialog(null);

  const doDelete = () => {
    close();
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
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete ${n.toLocaleString()} ${n === 1 ? "entity" : "entities"}?`}
        message={
          notInView > 0
            ? `${notInView.toLocaleString()} of them are not in the current results. Undo restores them until your next delete or bulk change.`
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
      <ShareEntityModal
        open={dialog === "share" || dialog === "permissions"}
        onClose={close}
        ids={[...selection]}
        initialFocus={dialog === "permissions" ? "people" : "access"}
      />
    </>
  );
}
