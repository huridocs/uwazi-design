import { Upload } from "lucide-react";

interface ImportEmptyStateProps {
  onNewImport: () => void;
}

export function ImportEmptyState({ onNewImport }: ImportEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-warm flex items-center justify-center mb-4" style={{ border: "1px solid var(--border-primary)" }}>
        <Upload size={28} className="text-ink-tertiary/50" />
      </div>
      <h3 className="text-sm font-semibold text-ink mb-1">No imports yet</h3>
      <p className="text-xs text-ink-tertiary mb-5 max-w-[16.25rem]">
        Import CSV files to bulk-create entities from spreadsheets
      </p>
      <button
        onClick={onNewImport}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-ink rounded-md
          border border-border hover:bg-warm transition-colors"
      >
        <span>+</span> New Import
      </button>
    </div>
  );
}
