import { useState } from "react";
import { ScanText } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { StatusPill } from "../StatusPill";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { ExtractorEditor } from "./ExtractorEditor";
import { seedExtractors, type SettingsExtractor } from "../../../data/settings";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";

export function MetadataExtractionPage() {
  const { record } = useSettingsNotify();
  const [extractors, setExtractors] = useState<SettingsExtractor[]>(seedExtractors);
  const [confirm, setConfirm] = useState<SettingsExtractor | null>(null);
  const [editing, setEditing] = useState<SettingsExtractor | "new" | null>(null);
  const search = useSettingsSearch(extractors, (x) => `${x.property} ${x.template}`);

  if (editing) return <ExtractorEditor extractor={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsExtractor>[] = [
    {
      id: "property",
      header: "Property",
      cell: (x) => (
        <div className="min-w-0">
          <p className="font-medium text-ink truncate">{x.property}</p>
          <p className="text-xs text-ink-tertiary truncate">{x.template}</p>
        </div>
      ),
    },
    { id: "status", header: "Status", width: "8rem", cell: (x) => <StatusPill status={x.status} /> },
    { id: "documents", header: "Documents", width: "8rem", cell: (x) => <span className="text-ink-secondary tabular-nums">{x.documents}</span> },
    {
      id: "accuracy",
      header: "Accuracy",
      width: "7rem",
      cell: (x) =>
        x.accuracy === null ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <span className="text-ink-secondary tabular-nums">{x.accuracy}%</span>
        ),
    },
    { id: "actions", header: "", width: "4rem", align: "right", cell: (x) => <RowActions label={`${x.property} extractor`} onDelete={() => setConfirm(x)} /> },
  ];

  return (
    <SettingsListPage
      component="MetadataExtractionPage"
      title="Metadata extraction"
      intro="Train extractors to suggest property values from document text automatically."
      search={{ value: search.query, onChange: search.setQuery, label: "Search extractors" }}
      lead={{ label: "Add extractor", onClick: () => setEditing("new") }}
      overlays={
        <ConfirmDelete
          open={confirm !== null}
          impact={confirm ? { lines: [`It covers ${confirm.documents.toLocaleString()} documents.`], block: null } : null}
          title="Delete extractor"
          message={`Delete the extractor for “${confirm?.property}”? Its suggestions are deleted with it; values already accepted stay on the entities.`}
          confirmLabel="Delete"
          onConfirm={() => {
            if (confirm) {
              setExtractors((prev) => prev.filter((x) => x.id !== confirm.id));
              record({ log: false,  method: "DELETE", domain: "extractor", noun: "extractor", id: confirm.id, name: confirm.property, message: "Extractor deleted" });
            }
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      }
    >
      <SettingsTable
        columns={columns}
        data={search.rows}
        getRowId={(x) => x.id}
        onRowClick={(x) => setEditing(x)}
        rowAriaLabel={(x) => `Edit ${x.property} extractor`}
        emptyState={
          <SettingsEmptyState
            icon={<ScanText size={16} />}
            title="No extractors yet"
            hint="An extractor learns to suggest one property's value from document text."
            action={{ label: "Add extractor", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
