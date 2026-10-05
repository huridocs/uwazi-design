import { useAtomValue } from "jotai";
import { breakpointAtom } from "../../../atoms/viewport";
import { useState } from "react";
import { AlignLeft } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsTable, type Column } from "../SettingsTable";
import { StatusPill } from "../StatusPill";
import { ParagraphJobEditor } from "./ParagraphJobEditor";
import { seedParagraphJobs, type SettingsParagraphJob } from "../../../data/settings";

export function ParagraphExtractionPage() {
  const [editing, setEditing] = useState<SettingsParagraphJob | "new" | null>(null);
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const search = useSettingsSearch(seedParagraphJobs, (j) => j.template);

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
    <SettingsListPage
      component="ParagraphExtractionPage"
      title="Paragraph extraction"
      intro="Split documents into paragraph-level records for fine-grained search and analysis."
      search={{ value: search.query, onChange: search.setQuery, label: "Search extractions" }}
      lead={{ label: "Add extraction", onClick: () => setEditing("new") }}
    >
      <SettingsTable
        columns={mobile ? mobileColumns : columns}
        data={search.rows}
        getRowId={(j) => j.id}
        onRowClick={(j) => setEditing(j)}
        rowAriaLabel={(j) => `Edit ${j.template} extraction`}
        emptyState={
          <SettingsEmptyState
            icon={<AlignLeft size={16} />}
            title="No extractions yet"
            hint="An extraction splits one template's documents into paragraph records."
            action={{ label: "Add extraction", onClick: () => setEditing("new") }}
            query={search.query}
            onClearQuery={search.clear}
          />
        }
      />
    </SettingsListPage>
  );
}
