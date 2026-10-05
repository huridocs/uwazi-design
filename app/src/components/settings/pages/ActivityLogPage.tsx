import { useMemo, useState } from "react";
import { Activity, ChevronRight } from "lucide-react";
import { SettingsListPage, useSettingsSearch } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { Select } from "../../shared/Select";
import { useAtomValue } from "jotai";
import { type SettingsLogEntry, type LogMethod } from "../../../data/settings";
import { activityLogAtom, isSeedEntry, type ActivityEntry } from "../../../atoms/activityLog";

const methodStyle: Record<LogMethod, string> = {
  CREATE: "bg-success-light text-success",
  UPDATE: "bg-carbon-tint text-carbon",
  DELETE: "bg-seal-tint text-seal-label",
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
  // Seed plus every Settings change made in this session (`useSettingsNotify`).
  const log = useAtomValue(activityLogAtom);
  const [method, setMethod] = useState("all");
  const [user, setUser] = useState("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const userOptions = useMemo(() => {
    const users = Array.from(new Set(log.map((e) => e.user))).sort();
    return [{ value: "all", label: "All users" }, ...users.map((u) => ({ value: u, label: u }))];
  }, [log]);

  const search = useSettingsSearch(
    log.filter((e) => (method === "all" || e.method === method) && (user === "all" || e.user === user)),
    (e) => `${e.user} ${e.method} ${e.summary}`,
  );
  const filtered = search.rows;
  const filtering = method !== "all" || user !== "all";

  return (
    <SettingsListPage
      component="ActivityLogPage"
      title="Activity log"
      intro="Every change made to the collection, newest first. Open&nbsp;an entry to see the request behind it."
      search={{ value: search.query, onChange: search.setQuery, label: "Search activity", placeholder: "Search summary, user…" }}
      filters={
        <>
          <Select value={method} options={METHOD_OPTIONS} onChange={setMethod} ariaLabel="Filter by action" />
          <Select value={user} options={userOptions} onChange={setUser} ariaLabel="Filter by user" />
        </>
      }
      footer={
        <span className="me-auto text-xs text-ink-tertiary tabular-nums">
          {filtered.length} event{filtered.length === 1 ? "" : "s"}
        </span>
      }
    >
      {/* Expandable list */}
      {filtered.length === 0 ? (
        <div className="rounded-md py-10 border border-border-soft">
          <SettingsEmptyState
            icon={<Activity size={16} />}
            title={filtering ? "No activity matches these filters" : "No activity yet"}
            query={search.query}
            onClearQuery={search.clear}
          />
        </div>
      ) : (
        <ul className="flex flex-col rounded-md overflow-hidden border border-border-soft">
          {filtered.map((e) => {
            const open = expanded === e.id;
            return (
              <li key={e.id} className="border-t border-border-soft first:border-t-0">
                <button
                  onClick={() => setExpanded((cur) => (cur === e.id ? null : e.id))}
                  aria-expanded={open}
                  className="flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-warm transition-colors cursor-pointer"
                >
                  <ChevronRight
                    size={14}
                    className={`shrink-0 text-ink-tertiary transition-transform ${open ? "rotate-90" : ""}`}
                  />
                  <span className={`text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit shrink-0 ${methodStyle[e.method]}`}>
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
                        <span className={`text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit inline-block ${methodStyle[e.method]}`}>
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
                    {/* A seed row's request line is synthesised and says so: a
                        made-up request must not read as evidence. An entry
                        recorded in this session has no request to show. */}
                    {!isSeedEntry(e) ? null : (
                      <>
                        <div className="text-meta font-medium uppercase tracking-wider text-ink-tertiary mb-1">
                          Request (example)
                        </div>
                        <pre className="bg-vellum rounded-md px-3 py-2 text-xs font-mono text-ink-secondary whitespace-pre-wrap break-words">
                          {synthesizeRequest(e)}
                        </pre>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </SettingsListPage>
  );
}
