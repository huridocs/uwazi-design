import type { ImportIssue } from "../../data/imports";

interface IssuesTableProps {
  issues: ImportIssue[];
}

const cols = "1fr 2fr 5rem 5.625rem";

export function IssuesTable({ issues }: IssuesTableProps) {
  if (issues.length === 0) return null;

  return (
    <div
      className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden bg-paper"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 shrink-0 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: cols,
          backgroundColor: "var(--bg-warm)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <span>Field</span>
        <span>Issue</span>
        <span>Type</span>
        <span>Date</span>
      </div>

      {/* Rows — fills available space, scrolls */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className="grid items-center gap-3 px-4 h-11 text-sm"
            style={{
              gridTemplateColumns: cols,
              borderBottom: "1px solid var(--border-primary)",
            }}
          >
            <span className="text-xs font-medium text-ink font-mono truncate">{issue.field}</span>
            <span className="text-xs text-ink-secondary truncate">{issue.issue}</span>
            <span
              className={`inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold rounded-md ${
                issue.type === "warning"
                  ? "bg-warning-light text-warning"
                  : "bg-seal-tint text-seal"
              }`}
            >
              {issue.type === "warning" ? "Warning" : "Error"}
            </span>
            <span className="text-xs text-ink-tertiary">
              {new Date(issue.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
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
