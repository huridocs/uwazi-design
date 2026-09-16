import { ArrowLeft, Trash2 } from "lucide-react";
import { WARM_BUTTON } from "../shared/warmButton";

type ActionBarMode = "list" | "detail";

interface ToolsActionBarProps {
  mode?: ActionBarMode;
  selectedCount?: number;
  totalCount?: number;
  onNewImport?: () => void;
  onDeleteSelected?: () => void;
  onBack?: () => void;
  onDeleteCurrent?: () => void;
}

export function ToolsActionBar({
  mode = "list",
  selectedCount = 0,
  totalCount = 0,
  onNewImport,
  onDeleteSelected,
  onBack,
  onDeleteCurrent,
}: ToolsActionBarProps) {
  if (mode === "detail") {
    return (
      <div
        data-component="ToolsActionBar"
        data-mode="detail"
        className="flex items-center justify-between h-12 bleed shrink-0 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          type="button"
          onClick={onBack}
          data-part="back"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
        >
          <ArrowLeft size={14} className="text-ink-tertiary" /> Back to list
        </button>
        <button
          type="button"
          onClick={onDeleteCurrent}
          data-part="delete"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-seal-fill rounded-md hover:bg-seal-fill/90 transition-colors cursor-pointer"
        >
          <Trash2 size={14} /> Delete Import
        </button>
      </div>
    );
  }

  const hasSelection = selectedCount > 0;

  return (
    <div
      data-component="ToolsActionBar"
      data-mode="list"
      className={`flex items-center justify-between h-12 bleed shrink-0 transition-colors ${
        hasSelection ? "bg-selected" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <button
        type="button"
        onClick={onNewImport}
        data-part="new"
        className="px-4 py-1.5 text-xs font-medium text-paper bg-ink rounded-md hover:bg-ink/90 transition-colors cursor-pointer"
      >
        New Import
      </button>

      {hasSelection && (
        <div data-part="selection" className="flex items-center gap-4">
          <span data-part="selection-count" className="text-xs text-ink-secondary">
            Selected {selectedCount} of {totalCount}
          </span>
          <button
            type="button"
            onClick={onDeleteSelected}
            data-part="delete-selected"
            className="px-3 py-1.5 text-xs font-medium text-white bg-seal-fill rounded-md hover:bg-seal-fill/90 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
