import { useMemo, useState } from "react";
import { useSetAtom } from "jotai";
import { Copy, Camera, ExternalLink, RefreshCw } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { Field, TextInput } from "../Field";
import { Select } from "../../shared/Select";
import { RadioGroup } from "../../shared/RadioGroup";
import { Table, type Column } from "../Table";
import { type SettingsPreserveToken } from "../../../data/settings";
import { toastsAtom } from "../../../atoms/references";

const AUTH_OPTIONS = [
  { value: "none", label: "None" },
  { value: "token", label: "API token" },
  { value: "basic", label: "Basic" },
];

// ── capture cockpit seed ───────────────────────────────────────────────────
type CaptureState = "captured" | "pending" | "failed";
interface Capture {
  id: string;
  at: string; // "2026-06-15 06:00"
  url: string;
  state: CaptureState;
  size: string; // "1.2 MB"
}

const PATHS = [
  "/press/2026/ruling-velasquez.html",
  "/bulletins/june/digest.html",
  "/cases/bamaca-velasquez/summary",
  "/news/2026-06-14/statement.html",
  "/press/2026/el-mozote-update",
  "/cases/loayza-tamayo/filings.html",
  "/news/archive/2026-06-12.html",
  "/press/2026/castillo-paez.html",
  "/bulletins/may/digest.html",
  "/cases/19-comerciantes/timeline",
  "/news/2026-06-10/release.html",
  "/press/2026/la-cantuta-ruling.html",
];

/** Deterministic per-capture list for one source. ~8–12 rows, descending in
 *  time from the source's last run, with a stable spread of states + sizes. */
function seedCaptures(source: SettingsPreserveToken | undefined): Capture[] {
  const host = source ? `${source.name.toLowerCase().replace(/[^a-z]+/g, "")}.example.org` : "source.example.org";
  const base = source ? Date.parse(`${source.lastRun.replace(" ", "T")}:00`) : Date.now();
  const count = source ? 8 + (source.capturedCount % 5) : 10; // 8–12
  return Array.from({ length: count }, (_, i) => {
    const ts = new Date(base - i * 1000 * 60 * 60 * 6); // every 6h going back
    const at = ts.toISOString().slice(0, 16).replace("T", " ");
    const state: CaptureState = i === 1 ? "pending" : i % 5 === 3 ? "failed" : "captured";
    const mb = state === "failed" ? 0 : (((i * 37) % 41) + 4) / 10 + 0.6; // 0.6–4.6 MB
    return {
      id: `c${i}`,
      at,
      url: `https://${host}${PATHS[i % PATHS.length]}`,
      state,
      size: state === "failed" ? "—" : `${mb.toFixed(1)} MB`,
    };
  });
}

const STATE_META: Record<CaptureState, { label: string; cls: string }> = {
  captured: { label: "Captured", cls: "bg-success-light text-success" },
  pending: { label: "Pending", cls: "bg-carbon-tint text-carbon" },
  failed: { label: "Failed", cls: "bg-seal-tint text-seal" },
};

const FILTERS = [
  { value: "all", label: "All" },
  { value: "captured", label: "Captured" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

/** Preserve capture-source detail — the archiving cockpit. Config (name +
 *  schedule + URL + auth) on top, then live stats with a "Capture now" action
 *  and a per-capture evidence table (date/time, URL, status, size) with a state
 *  filter + row actions. Opened from the Preserve list (list → detail). */
export function PreserveTokenEditor({
  token,
  onClose,
}: {
  token: SettingsPreserveToken | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const toast = (message: string) =>
    setToasts((p) => [...p, { id: Date.now().toString(), message, type: "success" as const }]);

  const isNew = token === "new";
  const base = isNew ? undefined : token;

  const [name, setName] = useState(base?.name ?? "");
  const [schedule, setSchedule] = useState("daily");
  const [url, setUrl] = useState("");
  const [auth, setAuth] = useState("none");
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState<Capture[]>(() => (isNew ? [] : seedCaptures(base)));

  const dirty =
    name !== (base?.name ?? "") || schedule !== "daily" || url !== "" || auth !== "none";

  // Live stats over the current capture set.
  const captured = rows.filter((r) => r.state === "captured").length;
  const failed = rows.filter((r) => r.state === "failed").length;

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => r.state === filter);
  }, [rows, filter]);

  const captureNow = () => {
    const now = new Date().toISOString().slice(0, 16).replace("T", " ");
    const host = base ? `${base.name.toLowerCase().replace(/[^a-z]+/g, "")}.example.org` : "source.example.org";
    setRows((prev) => [
      { id: `c-${Date.now()}`, at: now, url: url || `https://${host}/`, state: "pending", size: "—" },
      ...prev,
    ]);
    setFilter("all");
    toast("Capture queued");
  };

  const save = () => {
    toast(isNew ? "Capture source added" : `${name || "Source"} saved`);
    onClose();
  };

  const columns: Column<Capture>[] = [
    {
      id: "at",
      header: "Captured",
      width: "10rem",
      cell: (r) => (
        <span dir="ltr" className="text-xs text-ink-secondary tabular-nums">
          {r.at}
        </span>
      ),
    },
    {
      id: "url",
      header: "URL",
      cell: (r) => (
        <span dir="ltr" className="block truncate text-xs font-mono text-ink-tertiary">
          {r.url}
        </span>
      ),
    },
    {
      id: "state",
      header: "Status",
      width: "7rem",
      cell: (r) => (
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md w-fit ${STATE_META[r.state].cls}`}>
          {STATE_META[r.state].label}
        </span>
      ),
    },
    {
      id: "size",
      header: "Size",
      width: "5rem",
      align: "right",
      cell: (r) => <span className="text-xs text-ink-tertiary tabular-nums">{r.size}</span>,
    },
    {
      id: "actions",
      header: "",
      width: "5rem",
      align: "right",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => toast("Opening capture")}
            disabled={r.state !== "captured"}
            aria-label={`View capture from ${r.at}`}
            className="p-1 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
          >
            <ExternalLink size={14} />
          </button>
          <button
            onClick={() => toast("Re-capture queued")}
            aria-label={`Re-capture ${r.url}`}
            className="p-1 rounded text-ink-tertiary hover:bg-warm hover:text-ink transition-colors cursor-pointer"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Preserve"]} title={isNew ? "New capture source" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          {/* Config */}
          <section className="flex flex-col gap-6 max-w-lg">
            <Field label="Source name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Court press releases" />
            </Field>

            <Field label="Source URL" hint="The page or feed Preserve captures.">
              <TextInput value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
            </Field>

            <Field label="Auth">
              <Select value={auth} options={AUTH_OPTIONS} onChange={setAuth} ariaLabel="Auth" />
            </Field>

            <div>
              <h3 className="text-sm font-semibold text-ink mb-1">Capture schedule</h3>
              <p className="text-xs text-ink-tertiary mb-3">How often Preserve re-captures this source.</p>
              <RadioGroup
                name="preserve-schedule"
                ariaLabel="Capture schedule"
                inline
                value={schedule}
                onChange={setSchedule}
                options={[
                  { id: "hourly", label: "Hourly" },
                  { id: "daily", label: "Daily" },
                  { id: "weekly", label: "Weekly" },
                ]}
              />
            </div>
          </section>

          {/* Stats + capture + evidence table (existing source) */}
          {!isNew && (
            <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
              <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
                  <Stat label="Captures" value={captured} />
                  <Stat label="Schedule" value={schedule[0].toUpperCase() + schedule.slice(1)} />
                  <Stat label="Failed" value={failed} />
                  <Stat label="Last run" value={base!.lastRun} ltr />
                </div>
                <Button variant="primary" size="sm" icon={<Camera size={14} />} onClick={captureNow}>
                  Capture now
                </Button>
              </div>

              {/* Token */}
              <Field label="Token">
                <div className="flex items-center gap-2 max-w-lg">
                  <code className="flex-1 min-w-0 truncate text-xs font-mono text-ink-secondary bg-vellum px-3 py-2 rounded-md" dir="ltr">
                    {base!.token}
                  </code>
                  <Button variant="secondary" size="sm" icon={<Copy size={13} />} onClick={() => toast("Token copied")}>
                    Copy
                  </Button>
                </div>
              </Field>

              {/* Evidence table */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-6 mb-3">
                <h3 className="text-sm font-semibold text-ink">
                  Captures <span className="text-ink-tertiary font-normal">({visible.length})</span>
                </h3>
                <Select value={filter} options={FILTERS} onChange={setFilter} ariaLabel="Filter captures" />
              </div>
              <Table columns={columns} data={visible} getRowId={(r) => r.id} emptyState="No captures in this view." />
            </section>
          )}
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant="success" size="sm" disabled={!dirty || !name} onClick={save}>
          {isNew ? "Add source" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}

function Stat({ label, value, ltr }: { label: string; value: string | number; ltr?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-ink-tertiary uppercase tracking-wider">{label}</span>
      <span className="text-lg font-semibold text-ink tabular-nums" dir={ltr ? "ltr" : undefined}>
        {value}
      </span>
    </div>
  );
}
