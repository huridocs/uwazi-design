import { useState } from "react";
import { useAtomValue } from "jotai";
import { Plus, Spline } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { newSettingsId } from "../../../atoms/settingsCollection";
import { RelationTypeDelete, RelationTypeReferenceCount } from "../../shared/SettingsDeletes";
import { RelationTypeEditor } from "./RelationTypeEditor";
import { seedRelationTypes, type SettingsRelationType } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsRelationTypes } from "../../../data/cejil/settingsAdapt";

export function RelationTypesPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  const [types, setTypes] = useState<SettingsRelationType[]>(
    dataSource === "cejil" ? cejilSettingsRelationTypes : seedRelationTypes,
  );
  const [confirm, setConfirm] = useState<SettingsRelationType | null>(null);
  const [editing, setEditing] = useState<SettingsRelationType | "new" | null>(null);

  const saveType = (name: string): string => {
    if (editing === "new") {
      const id = newSettingsId("rt");
      setTypes((prev) => [...prev, { id, name, usageCount: 0 }]);
      return id;
    }
    const id = (editing as SettingsRelationType).id;
    setTypes((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
    return id;
  };

  if (editing) return <RelationTypeEditor relationType={editing} onClose={() => setEditing(null)} onSave={saveType} />;

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
          <RelationTypeReferenceCount type={r} />
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
    <SettingsContent component="RelationTypesPage">
      <SettingsContent.Header title="Relationship types" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          The labels available when connecting entities.
        </p>
        <SettingsTable columns={columns} data={types} getRowId={(r) => r.id} onRowClick={(r) => setEditing(r)} rowAriaLabel={(r) => `Edit ${r.name}`} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add type
        </SettingsButton>
      </SettingsContent.Footer>

      <RelationTypeDelete
        type={confirm}
        types={types}
        onCancel={() => setConfirm(null)}
        onDelete={(r) => setTypes((prev) => prev.filter((x) => x.id !== r.id))}
      />
    </SettingsContent>
  );
}
