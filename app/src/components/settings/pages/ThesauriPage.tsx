import { useState } from "react";
import { useSetAtom, useAtomValue } from "jotai";
import { Plus, BookOpen } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { RowActions } from "../RowActions";
import { ConfirmDialog } from "../../shared/ConfirmDialog";
import { ThesaurusEditor } from "./ThesaurusEditor";
import { seedThesauri, type SettingsThesaurus } from "../../../data/settings";
import { dataSourceAtom } from "../../../atoms/dataSource";
import { cejilSettingsThesauri } from "../../../data/cejil/settingsAdapt";
import { toastsAtom } from "../../../atoms/references";

export function ThesauriPage() {
  const setToasts = useSetAtom(toastsAtom);
  const dataSource = useAtomValue(dataSourceAtom);
  const [thesauri, setThesauri] = useState<SettingsThesaurus[]>(
    dataSource === "cejil" ? cejilSettingsThesauri : seedThesauri,
  );
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
    <SettingsContent>
      <SettingsContent.Header title="Thesauri" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Controlled vocabularies you can attach to template properties.
        </p>
        <Table columns={columns} data={thesauri} getRowId={(t) => t.id} onRowClick={(t) => setEditing(t)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          Add thesaurus
        </Button>
      </SettingsContent.Footer>

      <ConfirmDialog
        open={confirm !== null}
        title="Delete thesaurus"
        message={`Delete the ${confirm?.name} thesaurus? Properties using it will fall back to free text.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirm) {
            setThesauri((prev) => prev.filter((t) => t.id !== confirm.id));
            setToasts((p) => [...p, { id: Date.now().toString(), message: `${confirm.name} deleted`, type: "success" as const }]);
          }
          setConfirm(null);
        }}
        onCancel={() => setConfirm(null)}
      />
    </SettingsContent>
  );
}
