import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../../atoms/viewport";
import { useState } from "react";
import { Plus } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { SettingsButton } from "../SettingsButton";
import { SettingsTable, type Column } from "../SettingsTable";
import { StatusPill } from "../StatusPill";
import { ParagraphJobEditor } from "./ParagraphJobEditor";
import { seedParagraphJobs, type SettingsParagraphJob } from "../../../data/settings";

export function ParagraphExtractionPage() {
  const [editing, setEditing] = useState<SettingsParagraphJob | "new" | null>(null);
  const mobile = useAtomValue(breakpointAtom) === "mobile";

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

  // Phones: the three columns needed a 29.5rem table (472px) and scrolled
  // sideways with no sign of it (M26), cut at "PARAGR…". One column instead,
  // with the template, its status and the count on one line.
  const mobileColumns: Column<SettingsParagraphJob>[] = [
    {
      id: "job",
      header: "Template",
      cell: (j) => (
        <span className="flex items-center gap-2 w-full min-w-0">
          <span className="flex-1 min-w-0 font-medium text-ink truncate">{j.template}</span>
          <StatusPill status={j.status} />
          <span className="shrink-0 text-ink-secondary tabular-nums">{j.paragraphs.toLocaleString()}</span>
        </span>
      ),
    },
  ];

  return (
    <SettingsContent component="ParagraphExtractionPage">
      <SettingsContent.Header title="Paragraph extraction" />
      <SettingsContent.Body>
        <p className="text-xs text-ink-tertiary mb-4">
          Split documents into paragraph-level records for fine-grained search and analysis.
        </p>
        <SettingsTable columns={mobile ? mobileColumns : columns} data={seedParagraphJobs} getRowId={(j) => j.id} onRowClick={(j) => setEditing(j)} rowAriaLabel={(j) => `Edit ${j.template} extraction`} />
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <SettingsButton variant="primary" size="sm" className="me-auto" icon={<Plus size={14} />} onClick={() => setEditing("new")}>
          New extraction
        </SettingsButton>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
