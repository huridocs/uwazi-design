import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, Spline } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { RelationTypeEditor } from "./RelationTypeEditor";
import { seedRelationTypes, type SettingsRelationType } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

export function RelationTypesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const [types, setTypes] = useState<SettingsRelationType[]>(seedRelationTypes);
  const [confirm, setConfirm] = useState<SettingsRelationType | null>(null);
  const [editing, setEditing] = useState<SettingsRelationType | "new" | null>(null);

  if (editing) return <RelationTypeEditor relationType={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsRelationType>[] = [
    {
      id: "name",
      header: "Relationship type",
      cell: (r) => (
        <div className="flex items-center gap-2">
          <Spline size={14} className="text-ink-muted shrink-0" />
          <span className="font-medium text-ink truncate">{r.name}</span>
        </div>
      ),
    },
    {
      id: "usage",
      header: "Used by",
      width: "9rem",
      cell: (r) => (
        <span className="text-ink-secondary tabular-nums">
          {r.usageCount} <span className="text-ink-tertiary">connections</span>
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (r) => <RowActions label={r.name} onEdit={() => setEditing(r)} onDelete={() => setConfirm(r)} />,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Relationship types" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          The labels available when connecting entities. Deleting a type re-labels its connections as
          unlabeled.
        </p>
        <Table columns={columns} data={types} getRowId={(r) => r.id} onRowClick={(r) => setEditing(r)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add type
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete relationship type"
        message={`Delete “${confirm?.name}”? Its ${confirm?.usageCount} connections will be re-labeled as unlabeled.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setTypes((prev) => prev.filter((r) => r.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.name} deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
