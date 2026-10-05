import { useMemo, useState } from "react";
import { Modal } from "../shared/Modal";
import { MODAL_INPUT, ModalList, ModalListRow } from "../shared/ModalParts";
import { Plus, Trash2 } from "lucide-react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import {
  manageRelationTypesOpenAtom,
  referencesAtom,
  relationTypesAtom,
} from "../../atoms/references";
import { NO_LABEL_RELATION_TYPE } from "../../data/references";
import { deleteRelationTypeAtom, relationTypeNameIssue, saveRelationTypeAtom } from "../../atoms/relationTypes";
import { useRelationTypeUndo } from "../../hooks/useRelationTypeUndo";
import { relationTypeUsageInAtom } from "../../atoms/settingsUsage";
import { useSettingsNotify } from "../../hooks/useSettingsNotify";
import { t } from "../../utils/i18n";

/** The Relationships panel's view of the Sample's relationship-type registry.
 *  Add and Delete go through the same actions and rules as Settings ›
 *  Relationship types (`atoms/relationTypes.ts`): a name is required and
 *  unique ignoring case; a type a template field uses is refused; a type only
 *  references use is deleted after moving them to `no_label` (this modal's
 *  path, decision G6), with an Undo in the Beacon and a log entry. `no_label`
 *  itself stays, as the fallback. */
export function ManageRelationTypesModal() {
  const [open, setOpen] = useAtom(manageRelationTypesOpenAtom);
  const types = useAtomValue(relationTypesAtom);
  const references = useAtomValue(referencesAtom);
  const store = useStore();
  const saveType = useSetAtom(saveRelationTypeAtom);
  const removeType = useSetAtom(deleteRelationTypeAtom);
  const prepareUndo = useRelationTypeUndo();
  const { record, fail } = useSettingsNotify();
  const [draftLabel, setDraftLabel] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refCountByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of references) {
      counts.set(r.relationType, (counts.get(r.relationType) ?? 0) + 1);
    }
    return counts;
  }, [references]);

  const handleClose = () => {
    setOpen(false);
    setDraftLabel("");
    setPendingDelete(null);
  };

  const handleAdd = () => {
    const label = draftLabel.trim();
    const issue = relationTypeNameIssue(
      types.filter((x) => x.id !== NO_LABEL_RELATION_TYPE),
      null,
      label,
    );
    if (issue) {
      fail(issue === "Already exists" ? `Relationship type “${label}” already exists` : issue);
      return;
    }
    const id = saveType({ id: null, name: label, corpus: "mock" });
    if (!id) return;
    setDraftLabel("");
    record({
      method: "CREATE",
      domain: "relationType",
      noun: "relationship type",
      id,
      name: label,
      message: `Relationship type “${label}” added`,
    });
  };

  const handleDelete = (id: string) => {
    setPendingDelete(null);
    const usage = store.get(relationTypeUsageInAtom(`mock|${id}`));
    if (usage.block) {
      fail(usage.block);
      return;
    }
    const d = removeType({ id, to: usage.references ? NO_LABEL_RELATION_TYPE : null, corpus: "mock" });
    if (!d) return;
    record({
      method: "DELETE",
      domain: "relationType",
      noun: "relationship type",
      id,
      name: d.def.label,
      message: `“${d.def.label}” deleted`,
      detail: d.moved
        ? `${d.moved.refIds.length.toLocaleString()} references moved to “No label”. Undo puts the type and its references back.`
        : "Undo puts the type back.",
      action: prepareUndo(d),
    });
  };

  if (!open) return null;

  return (
    <Modal
      component="ManageRelationTypesModal"
      size="md"
      maxHeight="md:max-h-[80vh]"
      portal={false}
      dismissOnScrim={false}
      onClose={handleClose}
      title={t("System", "Manage relationship types")}
      subtitle={t("System", "Add or remove the relation labels available across this entity.")}
      closeLabel={t("System", "Close")}
      flush
      footer={
        <div data-part="add" className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={t("System", "New relationship type label…")}
            aria-label={t("System", "New relationship type label")}
            className={`flex-1 ${MODAL_INPUT}`}
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draftLabel.trim()}
            className="flex items-center gap-1 h-9 px-3 text-xs font-medium rounded-md bg-ink text-parchment
              hover:bg-ink/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> {t("System", "Add")}
          </button>
        </div>
      }
    >
      <ModalList data-part="types">
        {types.map((tdef) => {
          const usage = refCountByType.get(tdef.id) ?? 0;
          const isNoLabel = tdef.id === NO_LABEL_RELATION_TYPE;
          const confirming = pendingDelete === tdef.id;
          return (
            <ModalListRow
              key={tdef.id}
              part="type"
              title={<span data-part="label">{tdef.label}</span>}
              meta={
                <>
                  <span data-part="usage" className="tabular-nums">
                    {usage} {usage === 1 ? "ref" : "refs"}
                  </span>
                  {isNoLabel ? (
                    <span
                      className="text-meta uppercase tracking-wider text-ink-tertiary px-1.5 py-0.5 bg-vellum rounded shrink-0"
                      title={t(
                        "System",
                        "Fallback type: relationships whose type is deleted move here",
                      )}
                    >
                      {t("System", "Fallback")}
                    </span>
                  ) : confirming ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        data-part="confirm-delete"
                        onClick={() => handleDelete(tdef.id)}
                        className="px-2 py-1 text-meta font-medium text-white bg-seal-fill rounded-md hover:bg-seal-fill/90 transition-colors cursor-pointer"
                      >
                        {usage > 0
                          ? t("System", "Delete & reassign")
                          : t("System", "Delete")}
                      </button>
                      <button
                        type="button"
                        data-part="cancel-delete"
                        onClick={() => setPendingDelete(null)}
                        className="px-2 py-1 text-meta font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                      >
                        {t("System", "Cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      data-part="delete"
                      onClick={() => setPendingDelete(tdef.id)}
                      aria-label={`Delete ${tdef.label}`}
                      className="p-1 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal-label transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </>
              }
            />
          );
        })}
      </ModalList>
    </Modal>
  );
}
