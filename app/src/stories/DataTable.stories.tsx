import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { DataTable, type Column, type SortDir } from "../components/shared/DataTable";
import { StatusBadge } from "../components/shared/StatusBadge";
import type { ImportStatus } from "../data/imports";

/** The canonical data table (Files view + every Settings list). Real ARIA
 *  table semantics (row/columnheader/cell + aria-sort); clickable rows use the
 *  stretched primary-action button pattern — the row itself is never a button,
 *  so nested cell controls stay independently operable. */

interface DemoRow {
  id: string;
  file: string;
  template: string;
  status: ImportStatus;
  entities: number;
}

const DATA: DemoRow[] = [
  { id: "1", file: "violations.csv", template: "Violation", status: "completed", entities: 412 },
  { id: "2", file: "testimonies.csv", template: "Testimonio", status: "processing", entities: 128 },
  { id: "3", file: "rulings.csv", template: "Sentencia", status: "completed_warnings", entities: 634 },
  { id: "4", file: "organizations.csv", template: "Organization", status: "failed", entities: 0 },
];

const columns: Column<DemoRow>[] = [
  {
    id: "status",
    header: "Status",
    width: "7rem",
    cell: (r) => <StatusBadge status={r.status} />,
  },
  {
    id: "file",
    header: "File",
    sortKey: "file",
    cell: (r) => <span className="text-xs font-medium text-ink truncate">{r.file}</span>,
  },
  {
    id: "template",
    header: "Template",
    cell: (r) => <span className="text-xs text-ink-tertiary truncate">{r.template}</span>,
  },
  {
    id: "entities",
    header: "Entities",
    sortKey: "entities",
    align: "right",
    width: "6rem",
    cell: (r) => <span className="text-xs tabular-nums text-ink-tertiary">{r.entities.toLocaleString()}</span>,
  },
];

function TableDemo() {
  const [selectedId, setSelectedId] = useState("1");
  const [sort, setSort] = useState<{ key: string; dir: SortDir }>({ key: "file", dir: "asc" });
  const sorted = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...DATA].sort((a, b) =>
      sort.key === "entities"
        ? (a.entities - b.entities) * dir
        : a.file.localeCompare(b.file) * dir,
    );
  }, [sort]);

  return (
    <div className="max-w-2xl">
      <DataTable
        columns={columns}
        data={sorted}
        getRowId={(r) => r.id}
        onRowClick={(r) => setSelectedId(r.id)}
        rowAriaLabel={(r) => `Select ${r.file}`}
        isRowSelected={(r) => selectedId === r.id}
        sort={sort}
        onSort={(key) =>
          setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }))
        }
        footer={<span>{DATA.length} imports</span>}
      />
    </div>
  );
}

const meta = {
  title: "Shared/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SortableSelectable: Story = {
  args: { columns: [], data: [], getRowId: () => "" },
  render: () => <TableDemo />,
};

export const Empty: Story = {
  args: {
    columns: columns as Column<unknown>[],
    data: [],
    getRowId: () => "",
    emptyState: "No imports yet.",
  },
  render: (args) => (
    <div className="max-w-2xl">
      <DataTable {...args} />
    </div>
  ),
};
