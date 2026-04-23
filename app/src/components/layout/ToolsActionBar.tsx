import { ArrowLeft, Trash2 } from "lucide-react";

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
        className="flex items-center justify-between h-12 px-4 shrink-0 bg-paper"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors"
        >
          <ArrowLeft size={14} /> Back to list
        </button>
        <button
          onClick={onDeleteCurrent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-paper bg-seal rounded-md hover:bg-seal/90 transition-colors"
        >
          <Trash2 size={14} /> Delete Import
        </button>
      </div>
    );
  }

  const hasSelection = selectedCount > 0;

  return (
    <div
      className={`flex items-center justify-between h-12 px-4 shrink-0 transition-colors ${
        hasSelection ? "bg-selected" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <button
        onClick={onNewImport}
        className="px-4 py-1.5 text-xs font-medium text-paper bg-ink rounded-md hover:bg-ink/90 transition-colors"
      >
        New Import
      </button>

      {hasSelection && (
        <div className="flex items-center gap-4">
          <span className="text-xs text-ink-secondary">
            Selected {selectedCount} of {totalCount}
          </span>
          <button
            onClick={onDeleteSelected}
            className="px-3 py-1.5 text-xs font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
