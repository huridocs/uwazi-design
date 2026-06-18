import { useState } from "react";
import { Search, X } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Table, type Column } from "../Table";
import { seedActivityLog, type SettingsLogEntry, type LogMethod } from "../../../data/settings";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal",
  MIGRATE: "bg-warning-light text-warning",
};

export function ActivityLogPage() {
  const [query, setQuery] = useState("");

  const filtered = seedActivityLog.filter((e) =>
    `${e.user} ${e.method} ${e.summary}`.toLowerCase().includes(query.toLowerCase()),
  );

  const columns: Column<SettingsLogEntry>[] = [
    {
      id: "method",
      header: "Action",
      width: "7rem",
      cell: (e) => (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${methodStyle[e.method]}`}>
          {e.method}
        </span>
      ),
    },
    {
      id: "summary",
      header: "Summary",
      cell: (e) => <span className="text-ink truncate">{e.summary}</span>,
    },
    {
      id: "user",
      header: "User",
      width: "8rem",
      cell: (e) => <span className="text-ink-secondary truncate">{e.user}</span>,
    },
    {
      id: "time",
      header: "Time",
      width: "11rem",
      cell: (e) => <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums">{e.time}</span>,
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header title="Activity log" />
      <SettingsContent.Body>
        <div className="relative mb-4 max-w-sm">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activity…"
            className="w-full pl-8 pr-8 py-2 text-sm text-ink bg-warm border border-border rounded-md placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-parchment text-ink-muted hover:text-ink cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <Table
          columns={columns}
          data={filtered}
          getRowId={(e) => e.id}
          emptyState="No activity matches your search."
        />
      </SettingsContent.Body>
    </SettingsContent>
  );
}
