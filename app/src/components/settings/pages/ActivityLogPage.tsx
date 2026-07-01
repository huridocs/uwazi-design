import { useMemo, useState } from "react";
import { Search, X, ChevronRight } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Field, TextInput } from "../Field";
import { Select } from "../../shared/Select";
import { seedActivityLog, type SettingsLogEntry, type LogMethod } from "../../../data/settings";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal",
  MIGRATE: "bg-warning-light text-warning",
};

const METHOD_OPTIONS = [
  { value: "all", label: "All actions" },
  { value: "CREATE", label: "CREATE" },
  { value: "UPDATE", label: "UPDATE" },
  { value: "DELETE", label: "DELETE" },
  { value: "MIGRATE", label: "MIGRATE" },
];

// Map each method to a plausible REST verb + endpoint for the synthesized
// request line shown in the detail block.
const METHOD_REQUEST: Record<LogMethod, { verb: string; path: string }> = {
  CREATE: { verb: "POST", path: "/api/entities" },
  UPDATE: { verb: "PATCH", path: "/api/entities" },
  DELETE: { verb: "DELETE", path: "/api/entities" },
  MIGRATE: { verb: "POST", path: "/api/sync/reindex" },
};

/** Deterministic 12-hex pseudo-id derived from the entry id so the synthesized
 *  request line is stable across renders. */
function fakeSharedId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, "0").slice(0, 8) + "a1b2";
}

/** Build a plausible request line for an entry, since the seed carries no real
 *  details/url/query field. Deterministic from id/method/summary. */
function synthesizeRequest(e: SettingsLogEntry): string {
  const { verb, path } = METHOD_REQUEST[e.method];
  const sharedId = fakeSharedId(e.id);
  const title = (e.summary.match(/“([^”]+)”/)?.[1] ?? e.summary).replace(/"/g, '\\"');
  if (e.method === "MIGRATE") {
    return `${verb} ${path}  { migration: "${title}", user: "${e.user}" }`;
  }
  return `${verb} ${path}  { sharedId: "${sharedId}", title: "${title}", user: "${e.user}" }`;
}

export function ActivityLogPage() {
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [user, setUser] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const userOptions = useMemo(() => {
    const users = Array.from(new Set(seedActivityLog.map((e) => e.user))).sort();
    return [{ value: "all", label: "All users" }, ...users.map((u) => ({ value: u, label: u }))];
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = seedActivityLog.filter((e) => {
    if (method !== "all" && e.method !== method) return false;
    if (user !== "all" && e.user !== user) return false;
    if (q && !`${e.user} ${e.method} ${e.summary}`.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <SettingsContent>
      <SettingsContent.Header title="Activity log" />
      <SettingsContent.Body>
        {/* Filter toolbar */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="grow min-w-[14rem] max-w-sm">
            <Field label="Search">
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
                <TextInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search summary, user…"
                  className="pl-8 pr-8"
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
            </Field>
          </div>
          <Field label="Action">
            <Select value={method} options={METHOD_OPTIONS} onChange={setMethod} ariaLabel="Filter by action" />
          </Field>
          <Field label="User">
            <Select value={user} options={userOptions} onChange={setUser} ariaLabel="Filter by user" />
          </Field>
        </div>

        <p className="text-xs text-ink-tertiary mb-3">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </p>

        {/* Expandable list */}
        {filtered.length === 0 ? (
          <p className="text-sm text-ink-tertiary py-8 text-center">No activity matches your filters.</p>
        ) : (
          <ul className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
            {filtered.map((e, i) => {
              const open = expanded === e.id;
              return (
                <li key={e.id} style={i > 0 ? { borderTop: "1px solid var(--border-soft)" } : undefined}>
                  <button
                    onClick={() => setExpanded((cur) => (cur === e.id ? null : e.id))}
                    aria-expanded={open}
                    className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-warm transition-colors cursor-pointer"
                  >
                    <ChevronRight
                      size={14}
                      className={`shrink-0 text-ink-tertiary transition-transform ${open ? "rotate-90" : ""}`}
                    />
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit shrink-0 ${methodStyle[e.method]}`}>
                      {e.method}
                    </span>
                    <span className="text-ink text-sm truncate grow">{e.summary}</span>
                    <span className="text-ink-secondary text-xs truncate hidden sm:block w-32 shrink-0">{e.user}</span>
                    <span dir="ltr" className="text-xs text-ink-tertiary tabular-nums hidden md:block w-36 shrink-0 text-right">
                      {e.time}
                    </span>
                  </button>
                  {open && (
                    <div className="px-3 pb-3 pt-0 pl-10">
                      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm mb-3">
                        <dt className="text-ink-tertiary">Action</dt>
                        <dd>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit inline-block ${methodStyle[e.method]}`}>
                            {e.method}
                          </span>
                        </dd>
                        <dt className="text-ink-tertiary">Summary</dt>
                        <dd className="text-ink">{e.summary}</dd>
                        <dt className="text-ink-tertiary">User</dt>
                        <dd className="text-ink-secondary">{e.user}</dd>
                        <dt className="text-ink-tertiary">Time</dt>
                        <dd dir="ltr" className="text-ink-secondary tabular-nums">{e.time}</dd>
                      </dl>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-ink-tertiary mb-1">
                        Request
                      </div>
                      <pre className="bg-vellum rounded-md px-3 py-2 text-xs font-mono text-ink-secondary whitespace-pre-wrap break-words">
                        {synthesizeRequest(e)}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </SettingsContent.Body>
    </SettingsContent>
  );
}
