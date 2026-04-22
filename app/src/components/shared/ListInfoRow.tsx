import { ReactNode } from "react";
import { ActiveFilterChips } from "../references/ActiveFilterChips";

interface ListInfoRowProps {
  count: ReactNode;
  activeFilterCount: number;
  showFilterChips?: boolean;
  rightSlot?: ReactNode;
}

export function ListInfoRow({
  count,
  activeFilterCount,
  showFilterChips = true,
  rightSlot,
}: ListInfoRowProps) {
  return (
    <div className="px-3 pt-1 pb-2 flex items-center justify-between gap-2 flex-wrap text-[11px] text-ink-tertiary shrink-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="shrink-0">{count}</span>
        {showFilterChips && activeFilterCount > 0 && (
          <>
            <span className="shrink-0 font-medium text-ink-secondary">Filters:</span>
            <ActiveFilterChips />
          </>
        )}
      </div>
      {rightSlot}
    </div>
  );
}
