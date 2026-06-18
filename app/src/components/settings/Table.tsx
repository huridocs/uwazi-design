import { DataTable, type Column } from "../shared/DataTable";

export type { Column };

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectedId?: string | null;
  emptyState?: React.ReactNode;
}

/** Settings list table — the shared `DataTable` (entity-view Files style) with
 *  a rem-based min-width so wide settings tables scroll horizontally on narrow
 *  panes instead of squishing. Kept as a thin wrapper so the many settings
 *  pages keep importing `{ Table, Column }` from here unchanged. */
export function Table<T>({ columns, data, getRowId, onRowClick, selectedId, emptyState }: TableProps<T>) {
  // Flexible columns counted at a ~9rem floor, + gaps + padding.
  const minWidthRem =
    columns.reduce((sum, c) => {
      const rem = c.width && c.width.endsWith("rem") ? parseFloat(c.width) : NaN;
      return sum + (Number.isNaN(rem) ? 9 : rem);
    }, 0) +
    (columns.length - 1) * 0.75 +
    2;

  return (
    <DataTable
      columns={columns}
      data={data}
      getRowId={getRowId}
      onRowClick={onRowClick}
      isRowSelected={selectedId != null ? (row) => getRowId(row) === selectedId : undefined}
      emptyState={emptyState}
      minWidthRem={minWidthRem}
    />
  );
}
