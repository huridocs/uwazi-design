import { useState } from "react";
import { useAtomValue } from "jotai";
import { LayoutTemplate } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { newSettingsId } from "../../../atoms/settingsCollection";
import { TemplateDelete, TemplateEntityCount } from "../../shared/SettingsDeletes";
import { TemplateEditor } from "./TemplateEditor";
import { seedTemplates, type SettingsTemplate } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsTemplates } from "../../../data/cejil/settingsAdapt";

export function TemplatesPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  const [templates, setTemplates] = useState<SettingsTemplate[]>(
    dataSource === "cejil" ? cejilSettingsTemplates : seedTemplates,
  );
  const [confirm, setConfirm] = useState<SettingsTemplate | null>(null);
  const [editing, setEditing] = useState<SettingsTemplate | "new" | null>(null);
  const search = useSettingsSearch(templates, (t) => t.name);

  const handleSave = (patch: { name: string; color: string }): string | undefined => {
    if (editing === "new") {
      const id = newSettingsId("tpl");
      setTemplates((prev) => [
        ...prev,
        { id, name: patch.name, color: patch.color, propertyCount: 0, entityCount: 0, isDefault: false },
      ]);
      return id;
    }
    if (editing) {
      const id = editing.id;
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, name: patch.name, color: patch.color } : t)),
      );
      return id;
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
            <span className="text-meta font-semibold text-carbon bg-carbon-tint px-1.5 py-px rounded w-fit">
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
      cell: (t) => <span className="text-ink-secondary tabular-nums"><TemplateEntityCount template={t} /></span>,
    },
    {
      id: "actions",
      header: "",
      width: "4rem",
      align: "right",
      cell: (t) => <RowActions label={t.name} onDelete={() => setConfirm(t)} />,
    },
  ];

  return (
    <SettingsListPage
      component="TemplatesPage"
      title="Templates"
      intro="Templates define the metadata properties an entity of each type can carry."
      search={{ value: search.query, onChange: search.setQuery, label: "Search templates" }}
      lead={{ label: "Add template", onClick: () => setEditing("new") }}
      overlays={
        <TemplateDelete
          template={confirm}
          onCancel={() => setConfirm(null)}
          onDelete={(t) => setTemplates((prev) => prev.filter((x) => x.id !== t.id))}
        />
      }
    >
      <SettingsTable
        corpusScoped
        columns={columns}
        data={search.rows}
        getRowId={(t) => t.id}
        onRowClick={(t) => setEditing(t)}
        rowAriaLabel={(t) => `Edit ${t.name}`}
        emptyState={
          <SettingsEmptyState
            icon={<LayoutTemplate size={16} />}
            title="No templates yet"
            hint="A template lists the properties an entity of one type carries."
            action={{ label: "Add template", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
