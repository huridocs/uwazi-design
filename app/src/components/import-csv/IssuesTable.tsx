import type { ImportIssue } from "../../data/imports";
import { formatShortDate } from "../../utils/dates";

interface IssuesTableProps {
  issues: ImportIssue[];
}

const cols = "1fr 2fr 5rem 5.625rem";

export function IssuesTable({ issues }: IssuesTableProps) {
  if (issues.length === 0) return null;

  return (
    <div
      data-component="IssuesTable"
      className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* A real table, re-displayed like DataTable's: the table is the flex
          column, the body is the scroll lane, each row keeps its own grid
          tracks. WebKit drops table semantics from re-displayed table elements,
          so the implicit roles are restated. */}
      <table role="table" className="flex flex-col flex-1 min-h-0 w-full">
        <caption className="sr-only">Import issues</caption>
        {/* Header */}
        <thead role="rowgroup" data-part="header" className="block shrink-0">
          <tr
            role="row"
            className="grid items-center gap-3 px-4 h-10 text-meta font-semibold text-ink-tertiary uppercase tracking-wider"
            style={{
              gridTemplateColumns: cols,
              backgroundColor: "var(--bg-warm)",
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <th role="columnheader" scope="col" className="block font-semibold text-start">Field</th>
            <th role="columnheader" scope="col" className="block font-semibold text-start">Issue</th>
            <th role="columnheader" scope="col" className="block font-semibold text-start">Type</th>
            <th role="columnheader" scope="col" className="block font-semibold text-start">Date</th>
          </tr>
        </thead>

        {/* Rows — fills available space, scrolls */}
        <tbody role="rowgroup" data-part="rows" className="block flex-1 overflow-y-auto min-h-0">
          {issues.map((issue) => (
            <tr
              key={issue.id}
              role="row"
              data-part="row"
              data-variant={issue.type}
              className="grid items-center gap-3 px-4 h-11 text-sm"
              style={{
                gridTemplateColumns: cols,
                borderBottom: "1px solid var(--border-primary)",
              }}
            >
              <td role="cell" className="block text-xs font-medium text-ink font-mono truncate">{issue.field}</td>
              <td role="cell" className="block text-xs text-ink-secondary truncate">{issue.issue}</td>
              <td role="cell" className="block">
                <span
                  className={`inline-flex w-fit px-2 py-0.5 text-meta font-semibold rounded-md ${
                    issue.type === "warning"
                      ? "bg-warning-light text-warning"
                      : "bg-seal-tint text-seal-label"
                  }`}
                >
                  {issue.type === "warning" ? "Warning" : "Error"}
                </span>
              </td>
              <td role="cell" className="block text-xs text-ink-tertiary">{formatShortDate(issue.date)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div
        data-part="footer"
        className="flex items-center px-4 h-10 shrink-0 text-xs text-ink-muted"
        style={{
          backgroundColor: "var(--bg-warm)",
          borderTop: "1px solid var(--border-primary)",
        }}
      >
        <span>{issues.length} issues</span>
      </div>
    </div>
  );
}
