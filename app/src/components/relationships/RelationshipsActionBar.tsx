import { useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Settings2 } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import { entityPickerOpenAtom, textSelectionAtom } from "../../atoms/selection";
import {
  manageRelationTypesOpenAtom,
  referencesAtom,
  toastsAtom,
} from "../../atoms/references";
import { editModeAtom, selectedRefIdsAtom } from "../../atoms/filters";
import { ConfirmDialog } from "../shared/ConfirmDialog";
import { SelectControls } from "../shared/SelectControls";

interface RelationshipsActionBarProps {
  /** Compact (drawer) flavour. Drops Create relationship + Manage types +
   *  Select all/Deselect all — those belong on the dedicated Relationships
   *  tab where there's room. The drawer keeps Edit ⇄ Cancel/Save and the
   *  selection-aware Delete. */
  compact?: boolean;
  /** Mobile sheet trigger, pinned to the right of the bar. */
  menuSlot?: ReactNode;
}

/** Sticky action bar at the bottom of the Relationships panel. Mirrors the
 *  Files surface: create on the left, selection-aware delete on the right.
 *  Creates work without a text selection (entity-level relationship). */
export function RelationshipsActionBar({ compact = false, menuSlot }: RelationshipsActionBarProps = {}) {
  const [selected, setSelected] = useAtom(selectedRefIdsAtom);
  const [editMode, setEditMode] = useAtom(editModeAtom);
  const [references, setReferences] = useAtom(referencesAtom);
  const setEntityPickerOpen = useSetAtom(entityPickerOpenAtom);
  const setTextSelection = useSetAtom(textSelectionAtom);
  const setManageOpen = useSetAtom(manageRelationTypesOpenAtom);
  const setToasts = useSetAtom(toastsAtom);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const totalCount = references.length;
  const selectedCount = selected.size;
  const hasSelection = selectedCount > 0;
  const allSelected = totalCount > 0 && selectedCount === totalCount;

  const allRefIds = useMemo(() => references.map((r) => r.id), [references]);

  const handleCreate = () => {
    // Clear any lingering text-selection state so the modal opens in
    // entity-level mode rather than auto-anchoring to a stale snippet.
    setTextSelection(null);
    setEntityPickerOpen(true);
  };

  const handleSelectAll = () =>
    setSelected(new Set(allRefIds));
  const handleDeselectAll = () => setSelected(new Set());

  const performDelete = () => {
    const toDelete = new Set(selected);
    setReferences((prev) => prev.filter((r) => !toDelete.has(r.id)));
    setSelected(new Set());
    setConfirmDelete(false);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: `Deleted ${toDelete.size} reference${toDelete.size === 1 ? "" : "s"}`,
        type: "success" as const,
      },
    ]);
  };

  const enterEdit = () => setEditMode(true);

  // Cancel and Save both leave edit mode. They diverge in intent: Cancel
  // discards any unsubmitted state (selection), Save preserves it through
  // the exit (selection then collapses with the hidden checkboxes anyway).
  // In this prototype Delete is already a destructive commit, so the pair
  // is mostly an affordance for future inline edits.
  const cancelEdit = () => {
    setSelected(new Set());
    setEditMode(false);
  };
  const saveEdit = () => {
    setEditMode(false);
  };

  return (
    <>
      <div
        className={`flex items-center justify-between h-12 px-4 shrink-0 transition-colors ${
          editMode && hasSelection ? "bg-selected" : "bg-paper"
        }`}
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <div className="flex items-center gap-2">
          {editMode ? (
            compact ? null : (
              <>
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
                >
                  <Plus size={12} className="text-ink-tertiary" /> Create relationship
                </button>
                <button
                  onClick={() => setManageOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-warm hover:text-ink rounded-md transition-colors cursor-pointer"
                >
                  <Settings2 size={12} className="text-ink-tertiary" /> Manage types
                </button>
                <SelectControls
                  allSelected={allSelected}
                  hasSelection={hasSelection}
                  totalCount={totalCount}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />
              </>
            )
          ) : (
            <button
              onClick={enterEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-warm hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              <Pencil size={12} className="text-ink-tertiary" /> Edit
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {editMode && (
            <>
              {hasSelection && (
                <>
                  <span className="text-xs text-ink-secondary">
                    Selected {selectedCount} of {totalCount}
                  </span>
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </>
              )}
              <button
                onClick={cancelEdit}
                className="px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-warm hover:text-ink rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1.5 text-xs font-medium text-parchment bg-ink hover:bg-ink/90 rounded-md transition-colors cursor-pointer"
              >
                Save
              </button>
            </>
          )}
          {menuSlot}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={
          selectedCount === 1 ? "Delete Reference" : "Delete References"
        }
        message={
          selectedCount === 1
            ? "Delete this reference? This cannot be undone."
            : `Delete ${selectedCount} references? This cannot be undone.`
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={performDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

