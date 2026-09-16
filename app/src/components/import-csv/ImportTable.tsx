import { useAtom } from "jotai";
import { StatusBadge } from "../shared/StatusBadge";
import { ProgressBar } from "../shared/ProgressBar";
import { Checkbox } from "../shared/Checkbox";
import { breakpointAtom } from "../../atoms/viewport";
import { useNotify } from "../../hooks/useNotify";
import { formatSlashDate } from "../../utils/dates";
import type { ImportEntry } from "../../data/imports";

interface ImportTableProps {
  imports: ImportEntry[];
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onView: (id: string) => void;
}

const cols = "1.75rem 5.25rem 1fr 7.5rem 8.5rem 4.75rem 3.75rem 6.25rem 4.25rem";

function progressColor(status: ImportEntry["status"]): "green" | "blue" | "red" | "gray" {
  if (status === "failed") return "red";
  if (status === "processing" || status === "uploading") return "blue";
  if (status === "pending") return "gray";
  return "green";
}

function progressLabel(entry: ImportEntry): string {
  const total = entry.totalRows ?? entry.entities + entry.failed;
  if (entry.status === "pending") {
    return `0/${total.toLocaleString()}`;
  }
  if (entry.status === "uploading" || entry.status === "processing") {
    const current = entry.totalRows
      ? entry.entities + entry.failed
      : Math.round((entry.progress / 100) * total);
    return `${current.toLocaleString()}/${total.toLocaleString()}`;
  }
  if (entry.status === "failed") {
    const current = entry.entities + entry.failed;
    return `${current.toLocaleString()}/${total.toLocaleString()}`;
  }
  const current = entry.entities;
  return `${current.toLocaleString()}/${total.toLocaleString()}`;
}

// UTC-pinned so `YYYY-MM-DD` seeds don't render the previous day in the Americas.
const formatDate = formatSlashDate;

export function ImportTable({ imports, selectedIds, onSelect, onSelectAll, onView }: ImportTableProps) {
  const allSelected = imports.length > 0 && imports.every((i) => selectedIds.has(i.id));
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";
  const notify = useNotify();

  if (isMobile) {
    return (
      <>
        <ul
          data-component="ImportTable"
          data-variant="list"
          aria-label="Imports"
          className="flex-1 overflow-y-auto min-h-0"
        >
          {imports.map((entry) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <li
                key={entry.id}
                data-part="row"
                data-status={entry.status}
                data-state={isSelected ? "selected" : undefined}
                onClick={() => onSelect(entry.id)}
                className={`relative flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-warm ${isSelected ? "bg-parchment" : ""}`}
                style={{ borderBottom: "1px solid var(--border-primary)" }}
              >
                {/* Stretched primary action — the row hosts nested controls
                    (checkbox, View), so the container itself is not a button. */}
                <button
                  type="button"
                  data-part="primary-action"
                  aria-pressed={isSelected}
                  aria-label={`Select ${entry.filename}`}
                  onClick={(e) => { e.stopPropagation(); onSelect(entry.id); }}
                  className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                />
                <label data-part="select" className="relative flex items-center pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
                </label>
                <div data-part="body" className="relative flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span data-part="filename" className="text-sm font-medium text-ink truncate">{entry.filename}</span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div data-part="template" className="text-meta text-ink-tertiary truncate mb-1.5">{entry.template}</div>
                  <div data-part="progress" className="flex items-center gap-2 mb-1.5">
                    <div className="flex-1">
                      <ProgressBar
                        value={entry.progress}
                        color={progressColor(entry.status)}
                        ariaLabel={`Import progress, ${entry.filename}`}
                      />
                    </div>
                    <span dir="ltr" className="text-meta text-ink-tertiary tabular-nums">{progressLabel(entry)}</span>
                  </div>
                  <div data-part="meta" className="flex items-center gap-3 text-meta text-ink-tertiary">
                    <span><span className="tabular-nums">{entry.entities.toLocaleString()}</span> entities</span>
                    {entry.failed > 0 && (
                      <span className="text-seal-label font-medium">
                        <span className="tabular-nums">{entry.failed}</span> failed
                      </span>
                    )}
                    <span dir="ltr" className="ml-auto tabular-nums">{formatDate(entry.date)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-part="view"
                  aria-label={`View ${entry.filename}`}
                  onClick={(e) => { e.stopPropagation(); onView(entry.id); }}
                  className="relative px-2.5 py-1 text-meta font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors shrink-0"
                >
                  View
                </button>
              </li>
            );
          })}
        </ul>
        <PaginationFooter total={imports.length} />
      </>
    );
  }

  return (
    <>
      {/* A real table, re-displayed the way DataTable's is: the table is the
          flex column, the body is the scroll lane, each row keeps its own grid
          tracks. WebKit drops table semantics from re-displayed table elements,
          so the implicit roles are restated. */}
      <table
        role="table"
        data-component="ImportTable"
        data-variant="table"
        className="flex flex-col flex-1 min-h-0 w-full"
      >
        <caption className="sr-only">Imports</caption>
        {/* Header */}
        <thead role="rowgroup" data-part="header" className="block shrink-0">
          <tr
            role="row"
            className="grid items-center gap-3 px-4 h-10 text-meta font-semibold text-ink-tertiary uppercase tracking-wider bg-warm"
            style={{
              gridTemplateColumns: cols,
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <th role="columnheader" scope="col" data-part="select-all" className="block font-semibold">
              <label className="flex items-center justify-center">
                <Checkbox checked={allSelected} onChange={onSelectAll} ariaLabel="Select all imports" />
              </label>
            </th>
            <SortHeader label="Status" onSort={notify} />
            <SortHeader label="File" onSort={notify} />
            <SortHeader label="Template" onSort={notify} />
            <SortHeader label="Progress" onSort={notify} />
            <SortHeader label="Entities" onSort={notify} />
            <SortHeader label="Failed" onSort={notify} />
            <SortHeader label="Date" onSort={notify} />
            <th role="columnheader" scope="col" className="block font-semibold text-center">Action</th>
          </tr>
        </thead>

        {/* Rows */}
        <tbody role="rowgroup" data-part="rows" className="block flex-1 overflow-y-auto min-h-0">
          {imports.map((entry) => {
            const isSelected = selectedIds.has(entry.id);
            return (
              <tr
                key={entry.id}
                role="row"
                data-part="row"
                data-status={entry.status}
                data-state={isSelected ? "selected" : undefined}
                className={`relative grid items-center gap-3 px-4 h-11 text-sm transition-colors cursor-pointer
                  hover:bg-warm ${isSelected ? "bg-parchment" : ""}`}
                style={{
                  gridTemplateColumns: cols,
                  borderBottom: "1px solid var(--border-primary)",
                }}
                onClick={() => onSelect(entry.id)}
              >
                {/* Stretched primary action — the focusable path lives here, not
                    on the row (a focusable row wrapping the checkbox/View button
                    is invalid nesting for AT). It sits in an absolutely
                    positioned cell, so the row holds only cells and the button
                    takes no grid track. */}
                <td role="cell" className="absolute inset-0">
                  <button
                    type="button"
                    data-part="primary-action"
                    aria-pressed={isSelected}
                    aria-label={`Select ${entry.filename}`}
                    onClick={(e) => { e.stopPropagation(); onSelect(entry.id); }}
                    className="absolute inset-0 w-full cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
                  />
                </td>
                <td role="cell" data-part="select" className="relative block">
                  <label className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={isSelected} onChange={() => onSelect(entry.id)} ariaLabel={`Select ${entry.filename}`} />
                  </label>
                </td>

                <td role="cell" data-part="status" className="flex">
                  <StatusBadge status={entry.status} />
                </td>

                <td role="cell" data-part="filename" className="block text-xs font-medium text-ink truncate">{entry.filename}</td>
                <td role="cell" data-part="template" className="block text-xs text-ink-tertiary truncate">{entry.template}</td>

                <td role="cell" data-part="progress" className="flex items-center gap-2 pr-2 min-w-0">
                  <div className="flex-1 min-w-0">
                    <ProgressBar
                      value={entry.progress}
                      color={progressColor(entry.status)}
                      ariaLabel={`Import progress, ${entry.filename}`}
                    />
                  </div>
                  <span dir="ltr" className="text-meta text-ink-tertiary tabular-nums shrink-0">{progressLabel(entry)}</span>
                </td>

                <td role="cell" data-part="entities" className="block text-xs text-ink-tertiary tabular-nums">
                  {entry.status === "pending" ? "—" : entry.entities.toLocaleString()}
                </td>
                <td
                  role="cell"
                  data-part="failed"
                  className={`block text-xs tabular-nums ${entry.failed > 0 ? "text-seal-label font-medium" : "text-ink-tertiary"}`}
                >
                  {entry.status === "pending" ? "—" : entry.failed}
                </td>
                <td role="cell" data-part="date" dir="ltr" className="block text-xs text-ink-tertiary tabular-nums">{formatDate(entry.date)}</td>

                <td role="cell" data-part="actions" className="relative flex items-center justify-center">
                  <button
                    type="button"
                    data-part="view"
                    aria-label={`View ${entry.filename}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (entry.status !== "pending") onView(entry.id);
                    }}
                    disabled={entry.status === "pending"}
                    className="px-2.5 py-1 text-meta font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors disabled:text-ink-muted disabled:hover:bg-transparent disabled:cursor-not-allowed"
                  >
                    View
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <PaginationFooter total={imports.length} />
    </>
  );
}

function SortHeader({ label, onSort }: { label: string; onSort: (msg: string) => void }) {
  return (
    // The button stretched across its grid track before it had a cell around
    // it; `w-full` keeps that hit area.
    <th role="columnheader" scope="col" data-part="column-header" className="block font-semibold">
      <button
        type="button"
        data-part="sort"
        onClick={() => onSort(`Sorted by ${label.toLowerCase()}`)}
        className="w-full text-left uppercase tracking-wider hover:text-ink transition-colors cursor-pointer"
      >
        {label}
      </button>
    </th>
  );
}

function PaginationFooter({ total }: { total: number }) {
  return (
    <div
      data-part="footer"
      className="flex items-center justify-between px-4 h-10 shrink-0 text-xs text-ink-tertiary bg-paper"
      style={{ borderTop: "1px solid var(--border-primary)" }}
    >
      <span data-part="count">
        Showing <span className="tabular-nums">1-{total}</span> of{" "}
        <span className="tabular-nums">{total}</span>
      </span>
      <nav data-part="pagination" aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          className="h-6 w-6 flex items-center justify-center rounded border border-border text-ink-muted cursor-not-allowed"
          aria-label="Previous page"
          disabled
        >
          ‹
        </button>
        <span aria-current="page" className="h-6 min-w-6 px-2 flex items-center justify-center rounded border border-border text-ink font-medium tabular-nums">
          1
        </span>
        <button
          type="button"
          className="h-6 w-6 flex items-center justify-center rounded border border-border text-ink-muted cursor-not-allowed"
          aria-label="Next page"
          disabled
        >
          ›
        </button>
      </nav>
    </div>
  );
}
