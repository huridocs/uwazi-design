import type { ReactNode } from "react";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Grid track width (e.g. "1fr", "8rem", "70px"). Default "1fr". */
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  /** Highlight predicate (bg-parchment). Use for focus/selection. */
  isRowSelected?: (row: T) => boolean;
  emptyState?: ReactNode;
  /** Optional bottom strip (e.g. a count). Renders the warm footer bar. */
  footer?: ReactNode;
  /** When set, the grid gets this min-width (rem) and scrolls horizontally
   *  below it instead of squishing. Omit for tables whose columns always fit. */
  minWidthRem?: number;
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
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const scrolls = minWidthRem !== undefined;

  return (
    <div
      className={`rounded-md bg-paper ${scrolls ? "overflow-x-auto" : "overflow-hidden"}`}
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div style={scrolls ? { minWidth: `${minWidthRem}rem` } : undefined}>
        {/* Header */}
        <div
          className="grid items-center gap-3 px-4 h-10 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
          style={{
            gridTemplateColumns,
            backgroundColor: "var(--bg-warm)",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          {columns.map((col) => (
            <div key={col.id} className={`flex items-center min-w-0 ${alignClass[col.align ?? "left"]}`}>
              {col.header}
            </div>
          ))}
        </div>

        {/* Rows */}
        {data.length === 0 ? (
          <div className="px-4 py-10 text-center text-xs text-ink-muted">
            {emptyState ?? "Nothing here yet."}
          </div>
        ) : (
          data.map((row, i) => {
            const id = getRowId(row);
            const selected = isRowSelected?.(row) ?? false;
            const clickable = !!onRowClick;
            return (
              <div
                key={id}
                role={clickable ? "button" : "row"}
                tabIndex={clickable ? 0 : undefined}
                aria-pressed={clickable ? selected : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onRowClick!(row);
                        }
                      }
                    : undefined
                }
                className={`group grid items-center gap-3 px-4 min-h-11 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20 ${
                  clickable ? "cursor-pointer" : ""
                } ${selected ? "bg-parchment" : "hover:bg-warm"}`}
                style={{ gridTemplateColumns, borderBottom: "1px solid var(--border-primary)" }}
              >
                {columns.map((col) => (
                  <div
                    key={col.id}
                    className={`flex items-center min-w-0 text-ink ${alignClass[col.align ?? "left"]}`}
                  >
                    {col.cell(row, i)}
                  </div>
                ))}
              </div>
            );
          })
        )}

        {/* Footer */}
        {footer !== undefined && (
          <div
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
