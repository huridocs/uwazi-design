import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Table, type Column } from "../Table";
import { StatusPill } from "../StatusPill";
import { ParagraphJobEditor } from "./ParagraphJobEditor";
import { seedParagraphJobs, type SettingsParagraphJob } from "../../../data/settings";

export function ParagraphExtractionPage() {
  const [editing, setEditing] = useState<SettingsParagraphJob | "new" | null>(null);

  if (editing) return <ParagraphJobEditor job={editing} onClose={() => setEditing(null)} />;

  const columns: Column<SettingsParagraphJob>[] = [
    { id: "template", header: "Template", cell: (j) => <span className="font-medium text-ink truncate">{j.template}</span> },
    { id: "status", header: "Status", width: "8rem", cell: (j) => <StatusPill status={j.status} /> },
    {
      id: "paragraphs",
      header: "Paragraphs",
      width: "9rem",
      cell: (j) => <span className="text-ink-secondary tabular-nums">{j.paragraphs.toLocaleString()}</span>,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Paragraph Extraction" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Split documents into paragraph-level records for fine-grained search and analysis.
        </p>
        <Table columns={columns} data={seedParagraphJobs} getRowId={(j) => j.id} onRowClick={(j) => setEditing(j)} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          New extraction
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
