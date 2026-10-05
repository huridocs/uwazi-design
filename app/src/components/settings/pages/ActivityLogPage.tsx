import { Fragment, useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Activity, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ChevronsUpDown, CloudOff, Download, X } from "lucide-react";
import { SettingsListPage } from "../SettingsListPage";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { SettingsButton } from "../SettingsButton";
import { Select } from "../../shared/Select";
import { ToggleChip } from "../../shared/ToggleChip";
import { breakpointAtom } from "../../../atoms/viewport";
import type { LogMethod } from "../../../data/settings";
import {
  activityLogAtom,
  activityLogErrorAtom,
  activityLogRetryAtom,
  type ActivityEntry,
} from "../../../atoms/activityLog";
import { downloadCsv } from "../../../utils/exportCsv";

/** One label per action, used by the pill, the filter and the sort. */
const METHOD_LABEL: Record<LogMethod, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  MIGRATE: "Migrate",
};
const METHODS: LogMethod[] = ["CREATE", "UPDATE", "DELETE", "MIGRATE"];

/** Pill text is the accent mixed toward ink (the seal-label trick), so each
 *  pair clears 4.5:1 on its tint in both themes; the raw accents do not. */
const label = (accent: string) => `color-mix(in srgb, var(${accent}) 45%, var(--text-primary))`;
const PILL: Record<LogMethod, { bg: string; style?: CSSProperties }> = {
  CREATE: { bg: "bg-success-light", style: { color: label("--success") } },
  UPDATE: { bg: "bg-carbon-tint", style: { color: label("--accent-blue") } },
  DELETE: { bg: "bg-seal-tint text-seal-label" },
  MIGRATE: { bg: "bg-warning-light", style: { color: label("--warning") } },
};

function MethodPill({ method }: { method: LogMethod }) {
  const p = PILL[method];
  return (
    <span data-part="action-pill" className={`inline-block text-meta font-semibold px-1.5 py-0.5 rounded-md w-fit shrink-0 ${p.bg}`} style={p.style}>
      {METHOD_LABEL[method]}
    </span>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");
/** Uwazi's `DATE_MED - TIME_24_SIMPLE`: "Jun 15, 2026 - 18:42". */
export const formatLogTime = (ms: number) => {
  const d = new Date(ms);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
/** A date input's value for a day: "2026-06-14". */
const isoDay = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const dayStart = (day: string) => new Date(`${day}T00:00`).getTime();

const PAGE_SIZE = 100;
type SortKey = "time" | "user" | "method";

export function ActivityLogPage() {
  // Seed plus every Settings change made in this session (`useSettingsNotify`).
  const log = useAtomValue(activityLogAtom);
  const error = useAtomValue(activityLogErrorAtom);
  const retry = useSetAtom(activityLogRetryAtom);
  const phone = useAtomValue(breakpointAtom) === "mobile";

  const [methods, setMethods] = useState<Set<LogMethod>>(new Set());
  const [user, setUser] = useState("all");
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "time", dir: "desc" });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fromId = useId();
  const toId = useId();

  const filtering = methods.size > 0 || user !== "all" || !!query.trim() || !!from || !!to;
  const clearFilters = () => {
    setMethods(new Set());
    setUser("all");
    setQuery("");
    setFrom("");
    setTo("");
  };
  // Any filter change goes back to the first page.
  useEffect(() => setPage(1), [methods, user, query, from, to]);

  const userOptions = useMemo(() => {
    const users = Array.from(new Set(log.map((e) => e.user))).sort();
    return [{ value: "all", label: "All users" }, ...users.map((u) => ({ value: u, label: u }))];
  }, [log]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    // The end date is inclusive: up to the start of the next day.
    const lo = from ? dayStart(from) : -Infinity;
    const hi = to ? dayStart(to) + 86_400_000 : Infinity;
    const kept = log.filter(
      (e) =>
        (methods.size === 0 || methods.has(e.method)) &&
        (user === "all" || e.user === user) &&
        e.at >= lo &&
        e.at < hi &&
        (!q ||
          `${e.id} ${e.targetId ?? ""} ${e.method} ${METHOD_LABEL[e.method]} ${e.user} ${e.summary}`.toLowerCase().includes(q)),
    );
    const cmp = (a: ActivityEntry, b: ActivityEntry) =>
      sort.key === "time"
        ? a.at - b.at
        : sort.key === "user"
          ? a.user.localeCompare(b.user) || b.at - a.at
          : METHOD_LABEL[a.method].localeCompare(METHOD_LABEL[b.method]) || b.at - a.at;
    const sorted = [...kept].sort(cmp);
    return sort.dir === "asc" ? sorted : sorted.reverse();
  }, [log, methods, user, query, from, to, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);
  const first = (current - 1) * PAGE_SIZE + 1;
  const readout = rows.length === 0 ? "0 of 0" : `Showing ${first}-${first + shown.length - 1} of ${rows.length}`;

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "time" ? "desc" : "asc" }));

  const exportCsv = () => {
    const cell = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
    const lines = [
      ["Time", "User", "Action", "Description"].join(","),
      ...rows.map((e) => [formatLogTime(e.at), e.user, METHOD_LABEL[e.method], e.summary].map(cell).join(",")),
    ];
    downloadCsv(lines.join("\n"), `activity-log-${isoDay(Date.now())}.csv`);
  };

  const pickFrom = (v: string) => {
    setFrom(v);
    if (v && !to) setTo(v);
  };
  const pickTo = (v: string) => {
    setTo(v);
    if (v && !from) setFrom(v);
  };
  const today = () => {
    const d = isoDay(Date.now());
    setFrom(d);
    setTo(d);
  };

  const dateInput = (id: string, value: string, set: (v: string) => void, name: string) => (
    <span className="inline-flex items-center gap-1 h-8 ps-2 pe-1 bg-warm rounded-md focus-within:ring-2 focus-within:ring-carbon/20">
      <input
        id={id}
        type="date"
        value={value}
        onChange={(e) => set(e.target.value)}
        className="bg-transparent text-xs text-ink focus:outline-none w-[7.5rem]"
      />
      {value && (
        <button
          type="button"
          aria-label={`Clear ${name} date`}
          onClick={() => set("")}
          className="p-1 rounded-md text-ink-tertiary hover:text-ink cursor-pointer"
        >
          <X size={12} aria-hidden />
        </button>
      )}
    </span>
  );

  const filters = (
    <div data-part="log-filters" className="flex flex-col gap-2 w-full">
      <div role="group" aria-label="Action" className="flex flex-wrap items-center gap-1">
        <span className="text-xs text-ink-tertiary me-1">Action</span>
        {METHODS.map((m) => (
          <ToggleChip
            key={m}
            label={METHOD_LABEL[m]}
            active={methods.has(m)}
            onToggle={() =>
              setMethods((s) => {
                const next = new Set(s);
                if (next.has(m)) next.delete(m);
                else next.add(m);
                return next;
              })
            }
          />
        ))}
        <span className="ms-2">
          <Select value={user} options={userOptions} onChange={setUser} ariaLabel="User" triggerPrefix="User" />
        </span>
      </div>
      <fieldset className="flex flex-wrap items-center gap-2 min-w-0">
        <legend className="sr-only">Date range</legend>
        <span aria-hidden className="text-xs text-ink-tertiary">
          Date range
        </span>
        <label htmlFor={fromId} className="text-xs text-ink-secondary">
          From
        </label>
        {dateInput(fromId, from, pickFrom, "From")}
        <label htmlFor={toId} className="text-xs text-ink-secondary">
          To
        </label>
        {dateInput(toId, to, pickTo, "To")}
        <SettingsButton variant="ghost" size="sm" onClick={today}>
          Today
        </SettingsButton>
        <SettingsButton variant="ghost" size="sm" className="ms-auto" onClick={clearFilters} disabled={!filtering}>
          Clear filters
        </SettingsButton>
      </fieldset>
    </div>
  );

  const header = (key: SortKey, text: string) => {
    const active = sort.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
        className="text-start font-semibold"
      >
        <button
          type="button"
          onClick={() => toggleSort(key)}
          className="group/sort inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer hover:text-ink"
        >
          {text}
          {active ? (
            sort.dir === "asc" ? <ChevronUp size={12} aria-hidden /> : <ChevronDown size={12} aria-hidden />
          ) : (
            <ChevronsUpDown size={12} aria-hidden className="opacity-0 group-hover/sort:opacity-50" />
          )}
        </button>
      </th>
    );
  };

  const detail = (e: ActivityEntry) => (
    <div data-part="detail" className="flex flex-col gap-3 py-3">
      <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-ink-tertiary">Action</dt>
        <dd>
          <MethodPill method={e.method} />
        </dd>
        <dt className="text-ink-tertiary">Description</dt>
        <dd className="text-ink">{e.summary}</dd>
        <dt className="text-ink-tertiary">User</dt>
        <dd className="text-ink-secondary">{e.user}</dd>
        <dt className="text-ink-tertiary">Time</dt>
        <dd dir="ltr" className="text-ink-secondary tabular-nums">
          {formatLogTime(e.at)}
        </dd>
      </dl>
      {e.changes?.length ? (
        <table className="w-full text-xs">
          <caption className="text-start text-meta font-medium uppercase tracking-wider text-ink-tertiary pb-1">Changes</caption>
          <thead>
            <tr className="text-ink-tertiary">
              <th scope="col" className="text-start font-medium py-1 pe-3">Field</th>
              <th scope="col" className="text-start font-medium py-1 pe-3">Before</th>
              <th scope="col" className="text-start font-medium py-1">After</th>
            </tr>
          </thead>
          <tbody>
            {e.changes.map((c) => (
              <tr key={c.field} className="border-t border-border-soft align-top">
                <th scope="row" className="text-start font-medium text-ink py-1.5 pe-3">{c.field}</th>
                <td className="text-ink-secondary py-1.5 pe-3 break-words">{c.before || "—"}</td>
                <td className="text-ink py-1.5 break-words">{c.after || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-xs text-ink-tertiary">No details recorded.</p>
      )}
    </div>
  );

  const expander = (e: ActivityEntry) => {
    const open = expanded === e.id;
    return (
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${open ? "Hide" : "View"} details: ${e.summary}, ${formatLogTime(e.at)}`}
        onClick={() => setExpanded(open ? null : e.id)}
        className="p-1.5 rounded-md text-ink-tertiary hover:bg-warm hover:text-ink cursor-pointer"
      >
        <ChevronRight size={14} aria-hidden className={`transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
    );
  };

  const empty = (
    <div className="rounded-md py-10 border border-border-soft">
      {filtering ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <SettingsEmptyState
            icon={<Activity size={16} />}
            title={query.trim() ? `No activity matches “${query.trim()}”` : "No activity matches these filters"}
          />
          <SettingsButton variant="secondary" size="sm" onClick={clearFilters}>
            Clear filters
          </SettingsButton>
        </div>
      ) : (
        <SettingsEmptyState icon={<Activity size={16} />} title="No activity yet" hint="Changes made in Settings are listed here." />
      )}
    </div>
  );

  let body;
  if (error)
    body = (
      <div role="alert" className="rounded-md py-10 border border-border-soft flex flex-col items-center gap-2 text-center">
        <CloudOff size={16} className="text-ink-tertiary" aria-hidden />
        <p className="text-sm font-medium text-ink">The activity log could not be loaded</p>
        <p className="text-xs text-ink-tertiary">{error}</p>
        <SettingsButton variant="secondary" size="sm" onClick={() => retry((n) => n + 1)}>
          Retry
        </SettingsButton>
      </div>
    );
  else if (shown.length === 0) body = empty;
  else if (phone)
    body = (
      <ul data-part="log-rows" className="flex flex-col rounded-md border border-border-soft bg-paper">
        {shown.map((e) => (
          <li key={e.id} className="border-t border-border-soft first:border-t-0 px-3">
            <div className="flex items-start gap-2 py-2.5">
              <div className="min-w-0 flex-1 flex flex-col gap-1">
                <div className="flex items-start gap-2 min-w-0">
                  <MethodPill method={e.method} />
                  <span className="text-sm text-ink min-w-0 break-words">{e.summary}</span>
                </div>
                <span className="text-xs text-ink-tertiary">
                  {e.user} · <span dir="ltr" className="tabular-nums">{formatLogTime(e.at)}</span>
                </span>
              </div>
              {expander(e)}
            </div>
            {expanded === e.id && detail(e)}
          </li>
        ))}
      </ul>
    );
  else
    body = (
      <div className="rounded-md border border-border-soft bg-paper overflow-x-auto">
        <table data-part="log-table" className="w-full min-w-[44rem] text-sm">
          <caption className="sr-only">Activity log</caption>
          <thead className="bg-warm text-meta text-ink-tertiary">
            <tr className="h-10 [&>th]:px-3">
              {header("method", "Action")}
              {header("user", "User")}
              <th scope="col" className="text-start font-semibold uppercase tracking-wider">Description</th>
              {header("time", "Timestamp")}
              <th scope="col" className="w-12">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((e) => (
              <Fragment key={e.id}>
                <tr className="border-t border-border-soft hover:bg-warm [&>td]:px-3 [&>td]:py-2">
                  <td className="w-24">
                    <MethodPill method={e.method} />
                  </td>
                  <td className="w-32 text-ink-secondary text-xs truncate">{e.user}</td>
                  <td className="text-ink">{e.summary}</td>
                  <td dir="ltr" className="w-44 text-xs text-ink-tertiary tabular-nums whitespace-nowrap">
                    {formatLogTime(e.at)}
                  </td>
                  <td className="text-end">{expander(e)}</td>
                </tr>
                {expanded === e.id && (
                  <tr className="bg-paper">
                    <td colSpan={5} className="px-3 ps-10">
                      {detail(e)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    );

  return (
    <SettingsListPage
      component="ActivityLogPage"
      title="Activity log"
      intro="Every change made in Settings, newest first. Entries cannot be edited or removed."
      search={{ value: query, onChange: setQuery, label: "Search", placeholder: "by ids, methods, keywords, etc." }}
      filters={filters}
      footer={
        <div className="flex items-center gap-2 w-full min-h-8">
          <span role="status" className="me-auto text-xs text-ink-tertiary tabular-nums">
            {error ? "" : readout}
          </span>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous page"
                disabled={current === 1}
                onClick={() => setPage(current - 1)}
                className="p-1.5 rounded-md text-ink-secondary hover:bg-warm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft size={14} aria-hidden />
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`Page ${n}`}
                  aria-current={n === current ? "page" : undefined}
                  onClick={() => setPage(n)}
                  className={`min-w-7 h-7 px-1.5 rounded-md text-xs tabular-nums cursor-pointer ${
                    n === current ? "bg-parchment text-ink font-semibold" : "text-ink-secondary hover:bg-warm"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                aria-label="Next page"
                disabled={current === pages}
                onClick={() => setPage(current + 1)}
                className="p-1.5 rounded-md text-ink-secondary hover:bg-warm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            </nav>
          )}
          <SettingsButton
            variant="ghost"
            size="sm"
            icon={<Download size={14} aria-hidden />}
            onClick={exportCsv}
            disabled={!!error || rows.length === 0}
          >
            Export CSV
          </SettingsButton>
        </div>
      }
    >
      {body}
    </SettingsListPage>
  );
}
