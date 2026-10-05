import { useState } from "react";
import { useAtomValue } from "jotai";
import { Plus, BookOpen } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { RowActions } from "../RowActions";
import { ThesaurusDelete } from "../../shared/SettingsDeletes";
import { ThesaurusEditor } from "./ThesaurusEditor";
import type { SettingsThesaurus } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { thesauriAtom } from "../../../atoms/thesauri";

export function ThesauriPage() {
  const dataSource = useAtomValue(dataSourceAtom);
  // The shared store (`atoms/thesauri`), not local state: a value or thesaurus
  // created from the edit form is listed here, and this page's own changes
  // reach the form.
  const thesauri = useAtomValue(thesauriAtom(dataSource));
  const [confirm, setConfirm] = useState<SettingsThesaurus | null>(null);
  const [editing, setEditing] = useState<SettingsThesaurus | "new" | null>(null);

  if (editing) return <ThesaurusEditor thesaurus={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsThesaurus>[] = [
    {
      id: "name",
      header: "Thesaurus",
      cell: (t) => (
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-ink-muted shrink-0" />
          <span className="font-medium text-ink truncate">{t.name}</span>
        </div>
      ),
    },
    {
      id: "items",
      header: "Items",
      width: "8rem",
      cell: (t) => <span className="text-ink-secondary tabular-nums">{t.itemCount}</span>,
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
    <SettingsContent component="ThesauriPage">
      <SettingsContent.Header title="Thesauri" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Controlled vocabularies you can attach to template properties.
        </p>
        <SettingsTable columns={columns} data={thesauri} getRowId={(t) => t.id} onRowClick={(t) => setEditing(t)} rowAriaLabel={(t) => `Edit ${t.name}`} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add thesaurus
        </SettingsButton>
      </SettingsContent.Footer>

      <ThesaurusDelete thesaurus={confirm} onCancel={() => setConfirm(null)} />
    </SettingsContent>
  );
}
