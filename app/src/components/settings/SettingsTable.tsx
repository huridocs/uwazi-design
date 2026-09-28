import type { HTMLAttributes } from "react";
import { DataTable, type Column } from "../shared/DataTable";

export type { Column };

interface SettingsTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Accessible name of a clickable row's primary-action button ("Edit Case").
   *  Pass it with `onRowClick`; without it every row is announced "Open row". */
  rowAriaLabel?: (row: T) => string;
  selectedId?: string | null;
  emptyState?: React.ReactNode;
  rowProps?: (row: T, index: number) => HTMLAttributes<HTMLTableRowElement>;
}

/** Settings list table — the shared `DataTable` (entity-view Files style) with
 *  a rem-based min-width so wide settings tables scroll horizontally on narrow
 *  panes instead of squishing. Kept as a thin wrapper so the many settings
 *  pages import `{ SettingsTable, Column }` from here. */
export function SettingsTable<T>({ columns, data, getRowId, onRowClick, rowAriaLabel, selectedId, emptyState, rowProps }: SettingsTableProps<T>) {
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
      rowAriaLabel={rowAriaLabel}
      isRowSelected={selectedId != null ? (row) => getRowId(row) === selectedId : undefined}
      emptyState={emptyState}
      minWidthRem={minWidthRem}
      rowProps={rowProps}
    />
  );
}
