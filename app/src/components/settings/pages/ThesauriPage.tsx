import { useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { openThesaurusRequestAtom } from "../../../atoms/devSwitches";
import { BookOpen } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
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
  // A request to open an editor by id (the Dev panel, SD-6), taken once.
  const [request, setRequest] = useAtom(openThesaurusRequestAtom);
  useEffect(() => {
    if (!request) return;
    setEditing(thesauri.find((t) => t.id === request) ?? { id: request, name: "", itemCount: 0 });
    setRequest(null);
  }, [request, thesauri, setRequest]);
  const search = useSettingsSearch(thesauri, (t) => t.name);

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
      cell: (t) => <span className="text-xs text-ink-tertiary tabular-nums">{t.itemCount}</span>,
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
      component="ThesauriPage"
      title="Thesauri"
      intro="Controlled vocabularies you can attach to template properties."
      search={{ value: search.query, onChange: search.setQuery, label: "Search thesauri" }}
      lead={{ label: "Add thesaurus", onClick: () => setEditing("new") }}
      overlays={<ThesaurusDelete thesaurus={confirm} onCancel={() => setConfirm(null)} />}
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
            icon={<BookOpen size={16} />}
            title="No thesauri yet"
            hint="A thesaurus gives a property a fixed list of values to choose from."
            action={{ label: "Add thesaurus", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
