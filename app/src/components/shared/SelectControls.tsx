interface SelectControlsProps {
  allSelected: boolean;
  hasSelection: boolean;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

/** Compact "Select all / Deselect all" pair used by bottom action bars
 *  (FilesActionBar, RelationshipsActionBar). Each button greys out when its
 *  action would be a no-op so the bar reads as a clear state. */
export function SelectControls({
  allSelected,
  hasSelection,
  totalCount,
  onSelectAll,
  onDeselectAll,
}: SelectControlsProps) {
  const selectDisabled = totalCount === 0 || allSelected;
  const deselectDisabled = !hasSelection;
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={onSelectAll}
        disabled={selectDisabled}
        className={`text-[11px] font-medium transition-colors px-1 ${
          selectDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Select all
      </button>
      <button
        onClick={onDeselectAll}
        disabled={deselectDisabled}
        className={`text-[11px] font-medium transition-colors px-1 ${
          deselectDisabled
            ? "text-ink-muted cursor-default"
            : "text-ink hover:text-ink-secondary cursor-pointer"
        }`}
      >
        Deselect all
      </button>
    </div>
  );
}
