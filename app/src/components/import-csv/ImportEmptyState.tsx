import { FileSpreadsheet } from "lucide-react";

interface ImportEmptyStateProps {
  onNewImport: () => void;
}

export function ImportEmptyState({ onNewImport: _onNewImport }: ImportEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-full bg-warm flex items-center justify-center mb-5"
        style={{ border: "1px solid var(--border-primary)" }}
      >
        <FileSpreadsheet size={26} className="text-ink-tertiary/70" />
      </div>
      <h3 className="text-sm font-semibold text-ink mb-1.5">No CSVs yet</h3>
      <p className="text-xs text-ink-tertiary leading-relaxed max-w-[22rem]">
        Import CSV or ZIP files to create entities in bulk.
        <br />
        Click &quot;New Import&quot; to get started.
      </p>
    </div>
  );
}
