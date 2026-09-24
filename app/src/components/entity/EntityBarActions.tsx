import { useState } from "react";
import { useSetAtom, useStore } from "jotai";
import { CopyPlus, Lock, Share2, Trash2 } from "lucide-react";
import { deleteWithUndoAtom } from "../../atoms/entityOverlay";
import { deselectIdsAtom, whenBulkCleanAtom } from "../../atoms/library";
import { notificationsAtom } from "../../atoms/notifications";
import { entityCorpusOf, getEntity } from "../../data/entities";
import { ShareEntityModal } from "../share/ShareEntityModal";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { BarDivider } from "../shared/BarDivider";
import { Hint } from "../shared/Hint";
import { BAR_DANGER, BAR_GHOST } from "../shared/warmButton";

/** Share, Permissions and Delete for ONE entity — the bar of every surface that
 *  shows a single entity (the Metadata view's read bar, the Library drawer's
 *  preview footer). They open the same dialogs as the Library's selection
 *  actions, scoped to this entity: the Share modal (Permissions opens it on
 *  the people lookup), and a confirm before a Delete that the notification
 *  can undo.
 *
 *  Ghosts, then a divider, then Delete in seal text (the bar ladder in
 *  `warmButton.ts`); the host places Edit, its lead, before them. `compact`
 *  (a drawer) shows the three as icons, each keeping its name — the preview
 *  footer also carries Edit, Close and the open-entity commit. */
export function EntityBarActions({
  entityId,
  onDeleted,
  onDuplicate,
  compact = false,
}: {
  entityId: string;
  /** Duplicate: offered where a duplicate can open as a draft (the Library
   *  drawer). Absent elsewhere. */
  onDuplicate?: () => void;
  /** After the entity has left the library: close the preview, leave the view. */
  onDeleted?: () => void;
  compact?: boolean;
}) {
  const store = useStore();
  const deselect = useSetAtom(deselectIdsAtom);
  const [dialog, setDialog] = useState<"share" | "permissions" | "delete" | null>(null);
  const title = getEntity(entityId)?.title ?? "Entity";

  const doDelete = () => {
    setDialog(null);
    // Behind the bulk form's guard, as the selection's Delete is.
    store.set(whenBulkCleanAtom, () => {
      const ref = store.set(deleteWithUndoAtom, { corpus: entityCorpusOf(entityId), ids: [entityId] });
      deselect([entityId]);
      store.set(notificationsAtom, (prev) => [
        {
          id: `n-${ref}`,
          kind: "success",
          title: `“${title}” deleted.`,
          detail: "Undo restores it until your next delete or bulk change.",
          time: Date.now(),
          read: false,
          action: { label: "Undo", kind: "undo", ref },
        },
        ...prev,
      ]);
      onDeleted?.();
    });
  };

  const button = (label: string, icon: React.ReactNode, onClick: () => void, tone: string, part: string) => (
    <Hint text={label} describe={false}>
      {(hint) => (
        <button
          {...hint}
          type="button"
          onClick={onClick}
          aria-label={label}
          data-part={part}
          className={`shrink-0 inline-flex items-center gap-1.5 ${compact ? "px-2" : "px-3"} py-1.5 text-xs font-medium ${tone} rounded-md transition-colors cursor-pointer`}
        >
          <span className={tone === BAR_DANGER ? "" : "text-ink-tertiary"} aria-hidden>
            {icon}
          </span>
          {!compact && label}
        </button>
      )}
    </Hint>
  );

  return (
    <>
      {onDuplicate && button("Duplicate", <CopyPlus size={13} />, onDuplicate, BAR_GHOST, "duplicate")}
      {button("Share", <Share2 size={13} />, () => setDialog("share"), BAR_GHOST, "share")}
      {button("Permissions", <Lock size={13} />, () => setDialog("permissions"), BAR_GHOST, "permissions")}
      <BarDivider />
      {button("Delete", <Trash2 size={13} />, () => setDialog("delete"), BAR_DANGER, "delete")}
      <ShareEntityModal
        open={dialog === "share" || dialog === "permissions"}
        onClose={() => setDialog(null)}
        ids={[entityId]}
        initialFocus={dialog === "permissions" ? "people" : "access"}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete “${title}”?`}
        message="Undo restores it until your next delete or bulk change."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={doDelete}
        onCancel={() => setDialog(null)}
      />
    </>
  );
}
