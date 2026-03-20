interface ToolsActionBarProps {
  selectedCount?: number;
  totalCount?: number;
  onNewImport?: () => void;
  onDeleteSelected?: () => void;
}

export function ToolsActionBar({
  selectedCount = 0,
  totalCount = 0,
  onNewImport,
  onDeleteSelected,
}: ToolsActionBarProps) {
  const hasSelection = selectedCount > 0;

  return (
    <div
      className={`flex items-center justify-between h-[58px] px-5 shrink-0 transition-colors ${
        hasSelection ? "bg-selected" : "bg-paper"
      }`}
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <button
        onClick={onNewImport}
        className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-parchment bg-ink rounded-md
          hover:bg-ink/90 transition-colors"
      >
        <span>+</span> New Import
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
