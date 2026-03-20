import type { ImportIssue } from "../../data/imports";

interface IssuesTableProps {
  issues: ImportIssue[];
}

export function IssuesTable({ issues }: IssuesTableProps) {
  if (issues.length === 0) return null;

  return (
    <div
      className="rounded-md overflow-hidden bg-paper"
      style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div
        className="grid items-center gap-3 px-4 h-10 text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider"
        style={{
          gridTemplateColumns: "1fr 2fr 80px 90px",
          backgroundColor: "var(--bg-warm)",
          borderBottom: "1px solid var(--border-primary)",
        }}
      >
        <span>Field</span>
        <span>Issue</span>
        <span>Type</span>
        <span>Date</span>
      </div>

      {/* Rows */}
      {issues.map((issue) => (
        <div
          key={issue.id}
          className="grid items-center gap-3 px-4 h-11 text-sm"
          style={{
            gridTemplateColumns: "1fr 2fr 80px 90px",
            borderBottom: "1px solid var(--border-primary)",
          }}
        >
          <span className="text-xs font-medium text-ink font-mono truncate">{issue.field}</span>
          <span className="text-xs text-ink-secondary truncate">{issue.issue}</span>
          <span
            className={`inline-flex w-fit px-2 py-0.5 text-[11px] font-semibold rounded-full ${
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
  );
}
