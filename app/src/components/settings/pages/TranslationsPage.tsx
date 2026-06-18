import { useState } from "react";
import { Upload } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { TranslationEditor } from "./TranslationEditor";
import { seedTranslationContexts, type SettingsTranslationContext } from "../../../data/settings";

const typeStyle: Record<SettingsTranslationContext["type"], string> = {
  System: "bg-carbon-tint text-carbon",
  Template: "bg-warm text-ink-secondary",
  Thesaurus: "bg-warm text-ink-secondary",
  Menu: "bg-warm text-ink-secondary",
};

export function TranslationsPage() {
  const [editing, setEditing] = useState<SettingsTranslationContext | null>(null);

  if (editing) return <TranslationEditor context={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsTranslationContext>[] = [
    {
      id: "name",
      header: "Context",
      cell: (c) => <span className="font-medium text-ink truncate">{c.name}</span>,
    },
    {
      id: "type",
      header: "Type",
      width: "9rem",
      cell: (c) => (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ${typeStyle[c.type]}`}>
          {c.type}
        </span>
      ),
    },
    {
      id: "keys",
      header: "Keys",
      width: "6rem",
      cell: (c) => <span className="text-ink-secondary tabular-nums">{c.keyCount}</span>,
    },
    {
      id: "actions",
      header: "",
      width: "7rem",
      align: "right",
      cell: (c) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setEditing(c);
          }}
        >
          Translate
        </Button>
      ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Translations" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Translate the interface and your collection's content across active languages.
        </p>
        <Table columns={columns} data={seedTranslationContexts} getRowId={(c) => c.id} onRowClick={(c) => setEditing(c)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="secondary" size="sm" className="me-auto" icon={<Upload size={14} />}>
          Import translations (CSV)
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
