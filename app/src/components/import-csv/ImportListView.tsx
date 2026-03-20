import { Breadcrumb } from "../layout/Breadcrumb";
import { ImportTable } from "./ImportTable";
import { ImportEmptyState } from "./ImportEmptyState";
import type { ImportEntry } from "../../data/imports";

interface ImportListViewProps {
  imports: ImportEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
  onNewImport: () => void;
}

export function ImportListView({
  imports,
  selectedIds,
  onSelect,
  onSelectAll,
  onView,
  onNewImport,
}: ImportListViewProps) {
  const totalEntities = imports.reduce((sum, i) => sum + i.entities, 0);
  const totalFailed = imports.reduce((sum, i) => sum + i.failed, 0);
  const completed = imports.filter((i) => i.status === "completed" || i.status === "completed_warnings" || i.status === "completed_errors").length;

  if (imports.length === 0) {
    return (
      <div className="flex flex-col flex-1">
        <div className="px-4 pt-4">
          <Breadcrumb segments={[{ label: "Import CSV" }]} />
        </div>
        <ImportEmptyState onNewImport={onNewImport} />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 p-4 gap-4">
      {/* Top: breadcrumb + stats — fixed */}
      <div className="space-y-3 shrink-0">
        <Breadcrumb segments={[{ label: "Import CSV" }]} />
        <div className="flex items-center gap-6 text-xs text-ink-tertiary">
          <span>
            <strong className="text-ink font-semibold">{imports.length}</strong> imports
          </span>
          <span>
            <strong className="text-ink font-semibold">{totalEntities.toLocaleString()}</strong> entities
          </span>
          <span>
            <strong className="text-ink font-semibold">{completed}</strong> completed
          </span>
          {totalFailed > 0 && (
            <span>
              <strong className="text-seal font-semibold">{totalFailed}</strong> failed
            </span>
          )}
        </div>
      </div>

      {/* Table — fills remaining space */}
      <ImportTable
        imports={imports}
        selectedIds={selectedIds}
        onSelect={onSelect}
        onSelectAll={onSelectAll}
        onView={onView}
      />
    </div>
  );
}
