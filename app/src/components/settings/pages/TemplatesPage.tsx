import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { TemplateEditor } from "./TemplateEditor";
import { seedTemplates, type SettingsTemplate } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsTemplates } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

export function TemplatesPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [templates, setTemplates] = useState<SettingsTemplate[]>(
    dataSource === "cejil" ? cejilSettingsTemplates : seedTemplates,
  );
  const [confirm, setConfirm] = useState<SettingsTemplate | null>(null);
  const [editing, setEditing] = useState<SettingsTemplate | "new" | null>(null);

  const handleSave = (patch: { name: string; color: string }) => {
    if (editing === "new") {
      setTemplates((prev) => [
        ...prev,
        {
          id: `tpl-${prev.length}-${patch.name.length}`,
          name: patch.name,
          color: patch.color,
          propertyCount: 0,
          entityCount: 0,
          isDefault: false,
        },
      ]);
    } else if (editing) {
      const id = editing.id;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: patch.name, color: patch.color } : t)),
      );
    }
  };

  if (editing)
    return (
      <TemplateEditor template={editing} onClose={() => setEditing(null)} onSave={handleSave} />
    );

  const columns: Column<SettingsTemplate>[] = [
    {
      id: "name",
      header: "Template",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-[2px] border border-ink/20 shrink-0" style={{ backgroundColor: t.color }} />
          <span className="font-medium text-ink truncate">{t.name}</span>
          {t.isDefault && (
            <span className="text-[10px] font-semibold text-carbon bg-carbon-tint px-1.5 py-px rounded w-fit">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      id: "properties",
      header: "Properties",
      width: "8rem",
      cell: (t) => <span className="text-ink-secondary">{t.propertyCount}</span>,
    },
    {
      id: "entities",
      header: "Entities",
      width: "7rem",
      cell: (t) => <span className="text-ink-secondary tabular-nums">{t.entityCount}</span>,
    },
    {
      id: "actions",
      header: "",
      width: "6rem",
      align: "right",
      cell: (t) => <RowActions label={t.name} onEdit={() => setEditing(t)} onDelete={() => setConfirm(t)} />,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Templates" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Templates define the metadata properties an entity of each type can carry.
        </p>
        <Table columns={columns} data={templates} getRowId={(t) => t.id} onRowClick={(t) => setEditing(t)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add template
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete template"
        message={`Delete the ${confirm?.name} template? Entities using it won't be removed but will lose this template's properties.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setTemplates((prev) => prev.filter((t) => t.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.name} deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
