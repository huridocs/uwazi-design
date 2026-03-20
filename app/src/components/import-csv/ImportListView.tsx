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

  return (
    <div className="p-6 space-y-4">
      <Breadcrumb segments={[{ label: "Import CSV" }]} />

      {imports.length === 0 ? (
        <ImportEmptyState onNewImport={onNewImport} />
      ) : (
        <>
          {/* Stats bar */}
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

          <ImportTable
            imports={imports}
            selectedIds={selectedIds}
            onSelect={onSelect}
            onSelectAll={onSelectAll}
            onView={onView}
          />
        </>
      )}
    </div>
  );
}
