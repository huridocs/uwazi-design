import type { HTMLAttributes, ReactNode } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T, index: number) => ReactNode;
  /** Grid track width (e.g. "1fr", "8rem", "70px", "minmax(16rem, 1fr)").
   *  Default "1fr". A length, or the first argument of a `minmax()`, counts
   *  toward the table's minimum width when it overflows into its host. */
  width?: string;
  align?: "left" | "center" | "right";
  /** When set (with the table's `onSort`), the header is clickable and sorts by
   *  this key — toggling direction. Omit for non-sortable columns. */
  sortKey?: string;
  /** Where the column goes when a host lays rows out as a list instead of a
   *  grid (`SettingsTable` on phones): the row's title, a labelled item on its
   *  meta line, its trailing actions, or nowhere. `DataTable` ignores it. */
  mobile?: "primary" | "meta" | "actions" | "hidden";
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
  /** Where the table scrolls sideways when its columns need more than the
   *  pane: `self` (default), inside its own card; `host`, the card grows to
   *  the columns' total and the nearest scrolling ancestor (a `bleed` lane,
   *  whose scrollbar sits at the pane edge) scrolls it. In `host` the header
   *  sticks to the host's top and the first column to its inline start. */
  overflow?: "self" | "host";
  /** `host` only: where the header sticks, from the host's content edge. A
   *  sticky box stops at the scroller's padding, so a host with top padding
   *  passes its negative to pin the header to the scroller's top edge. */
  stickyTop?: string;
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
  /** How `isRowSelected` shows: a parchment fill (default), or a carbon ring
   *  — for a table whose fill already means something else (the Library,
   *  where parchment is the multi-selection and this is the preview). */
  selectedStyle?: "fill" | "outline";
}

/** A right-aligned column before another takes `pe-3` on top of the gap, so
 *  its figures never read as part of the next cell. */
const alignClass = {
  left: "",
  center: "justify-center text-center",
  right: "justify-end text-right",
} as const;

/** The first column in `host` overflow: it sticks to the host's inline start
 *  and paints the row's ground (inherited, so hover and selection show
 *  through). It reaches back over the row's padding and the pane gutter to the
 *  pane edge, and forward over the gap, so cells scrolling under it never show
 *  beside it; at rest the card clips that reach. The host is a `bleed` lane:
 *  its inline padding is the gutter, and the sticky inset measures from inside
 *  that padding, so the inset is the gutter's negative. */
const STICKY_FIRST = "sticky z-[1] bg-inherit";
const STICKY_REACH = "calc(1rem + var(--gutter, 0px))";
const STICKY_FIRST_STYLE: React.CSSProperties = {
  insetInlineStart: "calc(-1 * var(--gutter, 0px))",
  marginInlineStart: `calc(-1 * ${STICKY_REACH})`,
  paddingInlineStart: STICKY_REACH,
  marginInlineEnd: "-0.75rem",
  paddingInlineEnd: "0.75rem",
};

/** A track's minimum, for the `host` card's min-width: a length as it is, the
 *  first argument of a `minmax()`, else nothing. */
function trackMin(width = "1fr"): string {
  const w = width.trim();
  const mm = /^minmax\(\s*([^,]+),/.exec(w);
  const v = mm ? mm[1].trim() : w;
  return /^[\d.]+(rem|px|em)$/.test(v) ? v : "0px";
}

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
  selectedStyle = "fill",
  overflow = "self",
  stickyTop = "0px",
}: DataTableProps<T>) {
  const gridTemplateColumns = columns.map((c) => c.width ?? "1fr").join(" ");
  const box = DENSITY[density];
  const host = overflow === "host";
  const scrolls = minWidthRem !== undefined && !host;
  // In `host`, the card is never narrower than its tracks' minimums, the gaps
  // (gap-3) and the row's own padding (px-4).
  const hostMinWidth = host
    ? `max(${minWidthRem ?? 0}rem, calc(${columns.map((c) => trackMin(c.width)).join(" + ")} + ${
        (columns.length - 1) * 0.75 + 2
      }rem))`
    : undefined;

  return (
    <div
      data-component="DataTable"
      data-table
      data-density={density}
      data-overflow={overflow}
      // `clip`, not `hidden`, in `host`: a `hidden` box is a scroll container,
      // and the sticky header and first column would stick to it, not the host.
      className={`rounded-md bg-paper ${scrolls ? "overflow-x-auto" : host ? "overflow-clip" : "overflow-hidden"}`}
      style={{ boxShadow: CARD_SHADOW, minWidth: hostMinWidth }}
    >
      <div style={scrolls ? { minWidth: `${minWidthRem}rem` } : undefined}>
        {/* A real table — header and rows only (footer/empty state live outside
            it). Every table element is re-displayed (`block`, and `grid` per row)
            so each row keeps its own column tracks. WebKit has dropped table
            semantics from re-displayed table elements, so the implicit roles are
            also stated; they are redundant everywhere else. */}
        <table role="table" className="block w-full">
          <thead role="rowgroup" data-part="header" className={`block ${host ? "sticky z-[2]" : ""}`} style={host ? { top: stickyTop } : undefined}>
            <tr
              role="row"
              className={`grid items-center gap-3 px-4 ${box.header} text-meta font-semibold text-ink-tertiary uppercase tracking-wider`}
              style={{
                gridTemplateColumns,
                backgroundColor: "var(--bg-warm)",
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              {columns.map((col, ci) => {
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
                    className={`flex items-center min-w-0 font-semibold text-start ${alignClass[col.align ?? "left"]} ${col.align === "right" && ci < columns.length - 1 ? "pe-3" : ""} ${
                      host && ci === 0 ? STICKY_FIRST : ""
                    }`}
                    style={host && ci === 0 ? STICKY_FIRST_STYLE : undefined}
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
                    ) : col.header === "" || col.header == null ? (
                      // An action column shows no heading, but a header cell
                      // still needs a name for screen readers.
                      <span className="sr-only">Actions</span>
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
                    // The selection rings are drawn by `::after`, over the cells:
                    // a sticky first column paints its own ground and would
                    // cover a ring drawn on the row.
                    className={`group relative grid items-center gap-3 px-4 ${box.row} text-sm transition-colors
                      after:absolute after:inset-0 after:z-[1] after:pointer-events-none ${
                      clickable ? "cursor-pointer" : ""
                    } ${
                      selected
                        ? selectedStyle === "outline"
                          ? "bg-paper after:ring-2 after:ring-inset after:ring-[var(--selected-ring)] hover:bg-warm forced-colors:outline forced-colors:outline-1 forced-colors:-outline-offset-1 forced-colors:outline-[CanvasText]"
                          : "bg-parchment"
                        : "bg-paper hover:bg-warm"
                    }
                      has-[[data-part=select]_input:checked]:bg-parchment has-[[data-part=select]_input:checked]:after:ring-2 has-[[data-part=select]_input:checked]:after:ring-inset
                      has-[[data-part=select]_input:checked]:after:ring-[var(--selected-ring)] has-[[data-part=select]_input:checked]:shadow-none
                      has-[[data-part=select]_input:focus-visible]:after:ring-2 has-[[data-part=select]_input:focus-visible]:after:ring-inset
                      has-[[data-part=select]_input:focus-visible]:after:ring-[var(--selected-ring)]
                      forced-colors:has-[[data-part=select]_input:checked]:outline-2 forced-colors:has-[[data-part=select]_input:checked]:-outline-offset-2
                      forced-colors:has-[[data-part=select]_input:checked]:outline-[SelectedItem]
                      forced-colors:has-[[data-part=select]_input:focus-visible]:outline-dashed forced-colors:has-[[data-part=select]_input:focus-visible]:outline-2
                      forced-colors:has-[[data-part=select]_input:focus-visible]:-outline-offset-4 forced-colors:has-[[data-part=select]_input:focus-visible]:outline-[Highlight] ${extraClass ?? ""}`}
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
                    {columns.map((col, ci) => (
                      <td
                        key={col.id}
                        role="cell"
                        data-part="cell"
                        data-column={col.id}
                        className={`relative flex items-center min-w-0 text-ink ${alignClass[col.align ?? "left"]} ${col.align === "right" && ci < columns.length - 1 ? "pe-3" : ""} ${
                          host && ci === 0 ? STICKY_FIRST : ""
                        }`}
                        style={host && ci === 0 ? STICKY_FIRST_STYLE : undefined}
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
          <div data-part="empty" className="px-4 py-10 text-center text-xs text-ink-tertiary">
            {emptyState ?? "Nothing here yet."}
          </div>
        )}

        {/* Footer */}
        {footer !== undefined && (
          <div
            data-part="footer"
            className="flex items-center justify-between px-4 h-10 text-xs text-ink-tertiary"
            style={{ backgroundColor: "var(--bg-warm)", borderTop: "1px solid var(--border-primary)" }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
