import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { StatusPill } from "../StatusPill";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ExtractorEditor } from "./ExtractorEditor";
import { seedExtractors, type SettingsExtractor } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

export function MetadataExtractionPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [extractors, setExtractors] = useState<SettingsExtractor[]>(seedExtractors);
  const [confirm, setConfirm] = useState<SettingsExtractor | null>(null);
  const [editing, setEditing] = useState<SettingsExtractor | "new" | null>(null);

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
    { id: "actions", header: "", width: "6rem", align: "right", cell: (x) => <RowActions label={x.property} onEdit={() => setEditing(x)} onDelete={() => setConfirm(x)} /> },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Metadata Extraction" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Train extractors to suggest property values from document text automatically.
        </p>
        <Table columns={columns} data={extractors} getRowId={(x) => x.id} onRowClick={(x) => setEditing(x)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Create extractor
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete extractor"
        message={`Delete the extractor for “${confirm?.property}”? Its training data will be discarded.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setExtractors((prev) => prev.filter((x) => x.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `Extractor deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
