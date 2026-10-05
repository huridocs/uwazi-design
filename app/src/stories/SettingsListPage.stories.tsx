import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { BookOpen } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../components/settings/SettingsListPage";
import { SettingsEmptyState } from "../components/settings/SettingsEmptyState";
import { SettingsTable, type Column } from "../components/settings/SettingsTable";
import { RowActions } from "../components/settings/RowActions";
import { Select } from "../components/shared/Select";

/** The shell every Settings list page is built on: header, intro line, an
 *  always-mounted toolbar (search, filters), the table with its empty and
 *  no-match states, and a footer whose lead is the create action. Row actions
 *  show on hover and on keyboard focus; the row itself opens the editor. */

type Row = { id: string; name: string; items: number; kind: string };
const ROWS: Row[] = [
  { id: "1", name: "Violation types", items: 8, kind: "Grouped" },
  { id: "2", name: "Countries", items: 35, kind: "Flat" },
  { id: "3", name: "Case status", items: 5, kind: "Flat" },
  { id: "4", name: "Rights", items: 21, kind: "Grouped" },
];

function Demo({ rows, filters = false }: { rows: Row[]; filters?: boolean }) {
  const [kind, setKind] = useState("");
  const search = useSettingsSearch(kind ? rows.filter((r) => r.kind === kind) : rows, (r) => r.name);
  const columns: Column<Row>[] = [
    {
      id: "name",
      header: "Thesaurus",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <BookOpen size={14} aria-hidden className="text-ink-muted shrink-0" />
          <span className="font-medium text-ink truncate">{r.name}</span>
        </span>
      ),
    },
    { id: "items", header: "Items", width: "8rem", cell: (r) => <span className="text-ink-secondary tabular-nums">{r.items}</span> },
    { id: "actions", header: "", width: "4rem", align: "right", cell: (r) => <RowActions label={r.name} onDelete={() => {}} /> },
  ];
  return (
    <div className="h-[34rem] rounded-md overflow-hidden border border-border">
      <SettingsListPage
        component="DemoListPage"
        title="Thesauri"
        intro="Controlled vocabularies you can attach to template properties."
        search={{ value: search.query, onChange: search.setQuery, label: "Search thesauri" }}
        filters={
          filters && (
            <div className="w-36">
              <Select
                value={kind}
                onChange={setKind}
                ariaLabel="Filter by kind"
                options={[
                  { value: "", label: "All kinds" },
                  { value: "Flat", label: "Flat" },
                  { value: "Grouped", label: "Grouped" },
                ]}
              />
            </div>
          )
        }
        lead={{ label: "Add thesaurus", onClick: () => {} }}
      >
        <SettingsTable
          columns={columns}
          data={search.rows}
          getRowId={(r) => r.id}
          onRowClick={() => {}}
          rowAriaLabel={(r) => `Edit ${r.name}`}
          emptyState={
            <SettingsEmptyState
              icon={<BookOpen size={16} />}
              title="No thesauri yet"
              hint="A thesaurus gives a property a fixed list of values to choose from."
              action={{ label: "Add thesaurus", onClick: () => {} }}
              query={search.query}
              onClearQuery={search.clear}
            />
          }
        />
      </SettingsListPage>
    </div>
  );
}

const meta = {
  title: "Settings/SettingsListPage",
  component: SettingsListPage,
  parameters: { layout: "padded" },
} satisfies Meta<typeof SettingsListPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = { component: "Demo", title: "Thesauri", children: null };

export const Default: Story = { args, render: () => <Demo rows={ROWS} /> };
export const WithFilters: Story = { args, render: () => <Demo rows={ROWS} filters /> };
export const Empty: Story = { args, render: () => <Demo rows={[]} /> };
