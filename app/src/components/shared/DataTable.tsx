import type { HTMLAttributes, ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Grid track width (e.g. "1fr", "8rem", "70px"). Default "1fr". */
  width?: string;
  align?: "left" | "center" | "right";
  /** When set (with the table's `onSort`), the header is clickable and sorts by
   *  this key — toggling direction. Omit for non-sortable columns. */
  sortKey?: string;
}

export type SortDir = "asc" | "desc";

/** How much air a row gets.
 *
 *  Height and padding ONLY. Compact does NOT shrink the type — the row stays
 *  `text-sm` and the header stays at the 11px meta size, because the reason to
 *  want more rows on screen is never "I would like to read them less well".
 *  That also keeps the whole table on the app's type floor at both settings. */
export type TableDensity = "comfortable" | "compact";

const DENSITY: Record<TableDensity, { header: string; row: string }> = {
  comfortable: { header: "h-10", row: "min-h-11 py-2" },
  compact: { header: "h-8", row: "min-h-8 py-1" },
};

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  /** The row's click — passed the event so a host can read modifier keys
   *  (the Library's Cmd/Ctrl and Shift selection gestures). */
  onRowClick?: (row: T, e?: React.MouseEvent) => void;
  /** Highlight predicate (bg-parchment). Use for focus/selection. */
  isRowSelected?: (row: T) => boolean;
  emptyState?: ReactNode;
  /** Optional bottom strip (e.g. a count). Renders the warm footer bar. */
  footer?: ReactNode;
  /** When set, the grid gets this min-width (rem) and scrolls horizontally
   *  below it instead of squishing. Omit for tables whose columns always fit. */
  minWidthRem?: number;
  /** Extra attributes spread onto each row container — used for drag-to-reorder
   *  (the row is the drop target; the grip in a cell is the drag handle). */
  rowProps?: (row: T, index: number) => HTMLAttributes<HTMLTableRowElement>;
  /** Controlled sort state + handler. The consumer sorts its own data; the table
   *  just renders clickable headers and the active arrow. */
  sort?: { key: string; dir: SortDir };
  onSort?: (key: string) => void;
  /** Accessible name for a clickable row's primary action (the invisible
   *  stretched button). Defaults to "Open row". */
  rowAriaLabel?: (row: T) => string;
  /** Row height and padding. Defaults to `comfortable` — today's table. */
  density?: TableDensity;
  /** A control that belongs to the row but to no column — rendered in the
   *  primary action's cell, so it costs no grid track. The Library puts its
   *  visually hidden selection checkbox here. Clickable rows only. */
  rowAccessory?: (row: T) => ReactNode;
}

const alignClass = {
  left: "",
  center: "justify-center text-center",
  right: "justify-end text-right",
} as const;

const CARD_SHADOW = "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)";

/** The app's canonical data table — the entity-view Files table style, made
 *  generic via a declarative column API: a paper card with a soft shadow, a
 *  warm uppercase header strip, h-11 rows (hover:bg-warm, selected
 *  bg-parchment), and an optional warm footer. Reused across the Files view and
 *  every Settings list so they share one visual language. */
export function DataTable<T>({
  columns,
  data,
  getRowId,
  onRowClick,
  isRowSelected,
  emptyState,
  footer,
  minWidthRem,
  rowProps,
  sort,
  onSort,
  rowAriaLabel,
  density = "comfortable",
  rowAccessory,
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const box = DENSITY[density];
  const scrolls = minWidthRem !== undefined;

  return (
    <div
      data-component="DataTable"
      data-density={density}
      className={`rounded-md bg-paper ${scrolls ? "overflow-x-auto" : "overflow-hidden"}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div style={scrolls ? { minWidth: `${minWidthRem}rem` } : undefined}>
        {/* A real table — header and rows only (footer/empty state live outside
            it). Every table element is re-displayed (`block`, and `grid` per row)
            so each row keeps its own column tracks. WebKit has dropped table
            semantics from re-displayed table elements, so the implicit roles are
            also stated; they are redundant everywhere else. */}
        <table role="table" className="block w-full">
          <thead role="rowgroup" data-part="header" className="block">
            <tr
              role="row"
              className={`grid items-center gap-3 px-4 ${box.header} text-meta font-semibold text-ink-tertiary uppercase tracking-wider`}
              style={{
                gridTemplateColumns,
                backgroundColor: "var(--bg-warm)",
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              {columns.map((col) => {
                const sortable = !!col.sortKey && !!onSort;
                const active = sortable && sort?.key === col.sortKey;
                return (
                  <th
                    key={col.id}
                    role="columnheader"
                    scope="col"
                    data-part="column-header"
                    data-column={col.id}
                    aria-sort={
                      sortable
                        ? active
                          ? sort!.dir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    className={`flex items-center min-w-0 font-semibold text-start ${alignClass[col.align ?? "left"]}`}
                  >
                    {sortable ? (
                      <button
                        onClick={() => onSort!(col.sortKey!)}
                        data-part="sort"
                        className={`group/sort inline-flex items-center gap-1 min-w-0 uppercase tracking-wider cursor-pointer transition-colors ${
                          active ? "text-ink-secondary" : "hover:text-ink-secondary"
                        }`}
                      >
                        <span className="truncate">{col.header}</span>
                        {active ? (
                          sort!.dir === "asc" ? (
                            <ChevronUp size={12} className="shrink-0" />
                          ) : (
                            <ChevronDown size={12} className="shrink-0" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="shrink-0 opacity-0 group-hover/sort:opacity-50 transition-opacity" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {data.length > 0 && (
            <tbody role="rowgroup" data-part="body" className="block">
              {data.map((row, i) => {
                const id = getRowId(row);
                const selected = isRowSelected?.(row) ?? false;
                const clickable = !!onRowClick;
                const { className: extraClass, style: extraStyle, ...extra } =
                  rowProps?.(row, i) ?? {};
                return (
                  <tr
                    key={id}
                    {...extra}
                    role="row"
                    data-part="row"
                    onClick={onRowClick ? (e) => onRowClick(row, e) : undefined}
                    // A Shift+click on a clickable row is the host's (a range);
                    // don't also extend the page's text selection to it.
                    onMouseDown={onRowClick ? (e) => e.shiftKey && e.preventDefault() : undefined}
                    className={`group relative grid items-center gap-3 px-4 ${box.row} text-sm transition-colors ${
                      clickable ? "cursor-pointer" : ""
                    } ${selected ? "bg-parchment" : "hover:bg-warm"}
                      has-[[data-part=select]_input:checked]:bg-parchment
                      has-[[data-part=select]_input:focus-visible]:ring-2 has-[[data-part=select]_input:focus-visible]:ring-inset
                      has-[[data-part=select]_input:focus-visible]:ring-carbon/30 ${extraClass ?? ""}`}
                    style={{ gridTemplateColumns, borderBottom: "1px solid var(--border-primary)", ...extraStyle }}
                  >
                    {/* The row itself is not focusable (a focusable row wrapping
                        the cells' own buttons is invalid nesting for AT) — this
                        stretched invisible button is the row's primary action.
                        It lives inside an absolutely-positioned cell so the row's
                        children stay valid (rows may only contain cells) without
                        consuming a grid track. Data cells are positioned above it
                        so their controls stay clickable; clicks on cell content
                        bubble to the row's plain onClick. */}
                    {clickable && (
                      <td role="cell" className="absolute inset-0">
                        <button
                          type="button"
                          aria-pressed={selected}
                          aria-label={rowAriaLabel?.(row) ?? "Open row"}
                          onClick={(e) => {
                            e.stopPropagation();
                            onRowClick!(row, e);
                          }}
                          data-part="primary-action"
                          className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                        />
                        {rowAccessory?.(row)}
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.id}
                        role="cell"
                        data-part="cell"
                        data-column={col.id}
                        className={`relative flex items-center min-w-0 text-ink ${alignClass[col.align ?? "left"]}`}
                      >
                        {col.cell(row, i)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>

        {/* Empty state — outside the table so it has no invalid children. */}
        {data.length === 0 && (
          <div data-part="empty" className="px-4 py-10 text-center text-xs text-ink-muted">
            {emptyState ?? "Nothing here yet."}
          </div>
        )}

        {/* Footer */}
        {footer !== undefined && (
          <div
            data-part="footer"
            className="flex items-center justify-between px-4 h-10 text-xs text-ink-muted"
            style={{ backgroundColor: "var(--bg-warm)", borderTop: "1px solid var(--border-primary)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
